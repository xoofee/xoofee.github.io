---
title: "GitLab in Docker showed 502 after restart: root cause and fix"
date: 2026-04-20
permalink: /posts/2026/04/gitlab_docker_502_after_restart/
categories: tech
tags: [gitlab, docker, postgresql, nginx, troubleshooting]
---

I ran into a GitLab outage in a Docker-based deployment where the web UI returned `502 Bad Gateway`, even though the container itself was still running and even showed as healthy in `docker ps`.

The key lesson was simple: when GitLab runs in Docker, the Docker container status only tells you the container process is alive. It does not guarantee that all GitLab internal services inside that container are healthy.

* TOC
{:toc}

# Environment and trigger

GitLab had been running normally as a Docker container. The outage appeared right after I changed Docker daemon configuration and restarted Docker.

After Docker came back:

- the GitLab container restarted
- `docker ps` still showed it as `Up`
- the container health check reported `healthy`
- but the web UI only returned `502 Bad Gateway`

So this was not a bare-metal or package-install GitLab problem. The deployment model here was GitLab running in a Docker container and managed from the host with commands like `docker ps`, `docker logs`, and `docker exec`.

# Symptoms

From the Docker side, things looked mostly normal at first:

- `docker ps -a` showed the GitLab container as `Up`
- the container was reported as `healthy`
- the HTTP endpoint was reachable, but it returned `502`

Looking at the container logs showed that requests were reaching GitLab's front end, but the backend app was failing. The important error was:

```text
badgateway: failed to receive response: dial unix .../gitlab.socket: connect: connection refused
```

That narrowed the problem quickly:

- `nginx` and `gitlab-workhorse` inside the container were accepting requests
- the Rails backend was not available through its Unix socket
- the reverse proxy returned `502` because the backend could not answer

# Why Docker status was misleading

This is easy to miss in Docker deployments. Even though GitLab runs in one container, it is not one simple process. Inside that single container, GitLab still depends on multiple internal services, including:

- `nginx`
- `gitlab-workhorse`
- `puma`
- `sidekiq`
- `redis`
- `postgresql`
- `gitaly`

That means the Docker container can stay alive while one critical GitLab service is broken. In this case, the container looked healthy, but GitLab itself was not fully healthy.

# Finding the real failure

The next step was to inspect GitLab's internal service state from inside the container:

```bash
docker exec -it <gitlab-container> gitlab-ctl status
```

That showed most services running, but PostgreSQL was down. At the same time, `puma` and `sidekiq` had very short uptimes, which strongly suggested they were repeatedly restarting or recovering.

That was the turning point. Once PostgreSQL is down, the GitLab web application cannot function normally.

Then I checked the PostgreSQL log:

```bash
docker exec -it <gitlab-container> gitlab-ctl tail postgresql
```

The log showed the actual cause:

```text
FATAL: lock file ".../.s.PGSQL.5432.lock" already exists
HINT: Is another postmaster using socket file ".../.s.PGSQL.5432"?
```

# What that error meant

PostgreSQL refused to start because it found an existing socket lock file and assumed another PostgreSQL instance might still be using it.

In practice, that usually means one of two things:

1. A real PostgreSQL process is still running.
2. PostgreSQL stopped uncleanly and left behind a stale lock file.

Because this was a Docker-based GitLab deployment and the issue started immediately after a Docker restart, the second explanation became the leading suspect.

# Verifying it was stale

Before deleting anything, I checked whether the PID mentioned in the PostgreSQL message still existed and whether any real PostgreSQL process was running inside the container.

Using `docker exec` with process inspection confirmed:

- the PID referenced in the PostgreSQL log no longer existed
- there was no active PostgreSQL server process
- only the GitLab service supervisor was still present

That confirmed the lock was stale rather than owned by a real running database process.

# The actual root cause

This was not primarily a web proxy problem, and it was not a case where Docker itself could no longer run GitLab.

The actual failure chain was:

1. Docker daemon was restarted.
2. The GitLab container restarted.
3. PostgreSQL inside the container did not recover cleanly.
4. A stale PostgreSQL socket lock file remained.
5. PostgreSQL refused to start because it believed another instance still owned the socket.
6. GitLab Rails could not connect to the database.
7. The GitLab web UI returned `502 Bad Gateway`.

The Docker deployment model mattered in two ways:

- the trigger was a Docker restart
- the investigation required both Docker-level checks and GitLab-internal checks

# The fix

After confirming no real PostgreSQL process was active inside the GitLab container, the recovery was straightforward:

1. Remove the stale PostgreSQL socket file and lock file inside the container.
2. Restart PostgreSQL inside the container.
3. Recheck GitLab service status.
4. Wait for dependent GitLab services to stabilize.

After that:

- PostgreSQL came back up
- `puma` and `sidekiq` stayed running
- the GitLab web UI became accessible again

# Commands that were useful

These checks were the most useful during the incident.

Check Docker-level status:

```bash
docker ps -a
docker logs <gitlab-container>
```

Check GitLab internal services:

```bash
docker exec -it <gitlab-container> gitlab-ctl status
docker exec -it <gitlab-container> gitlab-ctl tail postgresql
docker exec -it <gitlab-container> gitlab-ctl tail puma
docker exec -it <gitlab-container> gitlab-ctl tail gitlab-rails
```

Check whether the PostgreSQL PID really exists:

```bash
docker exec -it <gitlab-container> ps -fp <pid>
docker exec -it <gitlab-container> ps -ef | grep postgres
```

# Lessons learned

A few takeaways from this Docker-based GitLab incident:

- If GitLab is running in Docker, do not assume `docker ps` being healthy means GitLab itself is healthy.
- A `502 Bad Gateway` can happen even when the container is up, because one internal GitLab service may be broken.
- After restarting Docker, stateful services inside the container may fail to recover cleanly.
- GitLab-in-Docker troubleshooting usually needs two layers: Docker-level checks and GitLab internal service checks through `docker exec`.
- If PostgreSQL reports an existing socket lock, always verify whether it belongs to a real running process or is just a stale file before removing it.

# Conclusion

In this case, GitLab was deployed with Docker and the container itself remained up, but the web UI returned `502` because PostgreSQL inside the container failed to restart cleanly after a Docker restart.

The real cause was a stale PostgreSQL socket lock file. Once that stale lock was removed and PostgreSQL was restarted inside the container, GitLab recovered normally.

If you see GitLab returning `502` in a Docker deployment after restart, it is worth checking both `docker logs` and `docker exec ... gitlab-ctl status` early, especially the PostgreSQL state.
