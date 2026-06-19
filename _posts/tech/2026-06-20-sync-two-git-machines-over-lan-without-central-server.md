---
title: "Syncing Two Git Machines Over LAN Without a Central Server"
date: 2026-06-20
permalink: /posts/2026/06/sync_two_git_machines_over_lan_without_central_server/
categories: tech
tags: [git, ssh, lan, worktree, workflow]
---

Sometimes the normal Git server is temporarily unavailable, but you still need to move work between two machines on the same local network.

For example:

- GitHub, GitLab, or a private Git server is down
- one workstation has the latest branch state
- another machine needs to keep working
- both machines already have the same long-running repository
- the project uses `git worktree`

In that situation, one practical fallback is to treat one normal Git checkout as a temporary SSH remote.

This is not the cleanest long-term Git server design. A bare repository is still the better default. But as a short-lived LAN bridge, it can be very useful.

* TOC
{:toc}

# 1. The idea

Assume there are two machines:

- Machine A: a Linux machine on the LAN, used as the temporary server
- Machine B: a Mac or another Linux machine, used as the client

Both machines already have the same project history. Instead of setting up Gitea, GitLab, or a new bare repository, Machine B pushes directly over SSH into the existing repository on Machine A.

The important Git setting is:

```bash
git config receive.denyCurrentBranch updateInstead
```

That setting allows a push into a non-bare repository whose target branch is currently checked out. After receiving the push, Git updates the working tree too.

# 2. Why this is useful when the server is down

Normally, all machines push to and pull from the central remote:

```text
laptop -> Git server -> workstation
```

When that server is unavailable, work can get stuck even though the machines can still reach each other over LAN.

This fallback changes the flow to:

```text
laptop -> workstation over SSH
```

It is useful when you need to keep moving for a few hours or days, and you do not want to rebuild your whole Git hosting setup just to bridge the outage.

# 3. Example repository layout

On Machine A, the temporary LAN server, suppose the repository already exists:

```text
/home/user/project/repo/
```

If the project uses worktrees, the layout may look like this:

```text
/home/user/project/repo/
├── .git/
├── worktree-develop/
└── worktree-feature-x/
```

On Machine B, the client:

```text
/Users/user/project/repo/
```

The exact paths do not matter. What matters is that Machine A has a real non-bare Git repository, and Machine B can SSH into it.

# 4. Configure the temporary server

On Machine A:

```bash
cd /home/user/project/repo
git config receive.denyCurrentBranch updateInstead
```

By default, Git refuses pushes into a non-bare repository when the target branch is checked out. That refusal is intentional: Git does not want the branch ref and the working directory to disagree.

`updateInstead` changes the behavior. When a push arrives, Git accepts the new commit and updates the checked-out working tree to match.

This is the key difference from a bare repository. A bare repository has no working tree to update. Here, the working tree is part of the synchronization behavior.

# 5. Configure the client remote

On Machine B, point a remote directly at Machine A's repository path:

```bash
cd /Users/user/project/repo
git remote add lan ssh://user@192.168.1.xxx/home/user/project/repo
```

If you want to reuse `origin` temporarily:

```bash
git remote set-url origin ssh://user@192.168.1.xxx/home/user/project/repo
```

I usually prefer adding a separate remote named `lan`, because it makes the temporary nature obvious:

```bash
git remote -v
```

Then push the branch you want to sync:

```bash
git push lan develop
```

After that push, the `develop` branch on Machine A is updated.

# 6. Daily workflow during the outage

Keep the workflow boring and disciplined.

On Machine B:

```bash
git status
git push lan develop
```

On Machine A:

```bash
cd /home/user/project/repo
git status
```

If Machine A also has a remote configured back to Machine B or to another available remote, you can pull from it as needed. But for a temporary two-machine setup, I prefer one clear direction of travel at a time.

For example:

```text
Machine B edits and pushes
Machine A receives and runs
```

or:

```text
Machine A edits and pushes
Machine B receives and tests
```

Avoid both machines editing the same branch at the same time unless you are ready to resolve conflicts carefully.

# 7. Worktree notes

This setup can coexist with `git worktree`, but it is worth being precise about what is being updated.

Git receives the pushed commit in the repository on Machine A. If the target branch is checked out in the repository or one of its linked worktrees, Git may update that working tree depending on where the branch is active.

A typical layout might be:

```text
repo/
├── .git/
├── develop/
└── feature-x/
```

If `develop` is the branch being pushed, make sure the corresponding `develop/` worktree is clean before pushing into it:

```bash
cd /home/user/project/repo/develop
git status
```

If the worktree has local uncommitted changes, stop and commit, stash, or move them first.

# 8. The main risk

The risk is simple: a non-bare repository has real files checked out.

If Machine A has local edits in the target working tree, an incoming push can fail or leave you with a working tree state that needs attention. That is why this method should be used with a clean working directory and a simple branch discipline.

Before pushing into Machine A, check:

```bash
git status
```

You want a clean result on the target branch or target worktree.

# 9. When to use this

Use this approach when:

- the normal Git server is temporarily down
- both machines are on the same LAN
- SSH between the machines already works
- you need a quick bridge, not a permanent hosting setup
- one branch, such as `develop`, is the main synchronization branch

This is especially handy for personal development setups where a workstation, laptop, or lab machine needs to stay synchronized during a short outage.

# 10. When not to use this

Avoid this setup when:

- multiple developers are pushing at the same time
- you need protected branches
- CI/CD depends on server-side hooks
- auditability and permissions matter
- the repository is shared by a team
- you want a permanent Git hosting solution

For those cases, use a bare repository or a real Git service.

# 11. Better long-term replacement

When the outage is over, switch back to a normal remote.

If you want a robust LAN-only setup, use one of these:

- a bare repository over SSH
- Gitea
- GitLab CE
- another lightweight Git server

The simplest bare repository version looks like this:

```bash
mkdir -p /srv/git/project.git
cd /srv/git/project.git
git init --bare
```

Then clients can use:

```bash
git remote add lan ssh://user@192.168.1.xxx/srv/git/project.git
```

That avoids all the working-tree synchronization risks because the server repository has no checked-out files.

# 12. Summary

Pushing into a normal non-bare repository over SSH is not the standard Git server model, but it can be a useful emergency bridge.

The essential server-side command is:

```bash
git config receive.denyCurrentBranch updateInstead
```

With that in place, a second machine can push over LAN directly into the repository:

```bash
git push lan develop
```

Use it for controlled, temporary, two-machine synchronization when the real Git server is unavailable. Once the server is back, move back to the normal remote or set up a proper bare repository.
