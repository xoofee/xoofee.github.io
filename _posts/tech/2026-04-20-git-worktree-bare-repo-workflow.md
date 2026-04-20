---
title: "A Professional Git Worktree Workflow with a Bare Repository"
date: 2026-04-20
permalink: /posts/2026/04/git_worktree_bare_repo_workflow/
categories: tech
tags: [git, worktree, bare-repo, workflow, ai]
---

If you regularly switch between branches, keep separate runtime environments, or want AI agents to work without disturbing your main checkout, a bare repository plus `git worktree` is one of the cleanest setups.

The core idea is simple:

- keep the Git database in one central place
- attach multiple working directories to it
- dedicate one worktree per task, feature, or agent

This avoids the usual `git stash` churn and makes it much easier to run multiple branches side by side.

* TOC
{:toc}

# 1. Why use a bare repo with worktrees

In a normal clone, the `.git/` directory lives inside the working tree. That is fine for simple projects, but it becomes awkward when you want several active checkouts at once.

With a bare repository layout:

- the Git object database and refs live in a central `.git` directory
- each worktree gets its own folder with real files
- you can open multiple branches at the same time without cloning the repository repeatedly

This is especially useful when:

- `main/` is your stable working environment
- `feature-x/` is where you implement something risky
- `ai-sandbox/` is where Codex or another agent can run experiments

Each folder is isolated at the filesystem level, but all of them share the same repository history.

# 2. Starting from scratch

If you have not cloned the repository yet, create a project container and store the repository as a bare Git directory:

```bash
mkdir my-project
cd my-project
git clone --bare https://github.com/user/repo.git .git
```

Using `.git` as the bare repository folder is convenient because many tools immediately understand that this directory is the Git backend for the workspace.

Now create your main working tree:

```bash
git worktree add main main
```

This gives you a layout like:

```text
my-project/
├── .git/    # bare repository
└── main/    # normal working tree
```

Then set up your local environment files in `main/`:

```bash
cd main
touch .env.development .env.production
```

# 3. Migrating an existing repo without losing local files

If you already have a normal clone with untracked files such as `.env`, you can migrate into the bare-repo layout without throwing those away.

First create the new hub:

```bash
cd ~/dev
git clone --bare https://github.com/user/repo.git .git_temp_storage
mkdir my-project-pro
mv .git_temp_storage my-project-pro/.git
cd my-project-pro
git worktree add main main
```

At this point, `main/` is a fresh checkout. Now copy your existing working files into it:

```bash
rm -rf ~/dev/old-project/.git
cp -a ~/dev/old-project/. main/
```

If the old folder is no longer needed, remove it afterward:

```bash
rm -rf ~/dev/old-project
```

The reason this works is that you strip the old checkout of its Git metadata, then move the whole working directory state into the new worktree. That preserves untracked files, local config, and environment files.

# 4. Daily workflow

Once the structure is in place, your day-to-day flow becomes much simpler.

Use `main/` as the default stable checkout:

```bash
cd ~/dev/my-project-pro/main
```

When you need a new branch for a feature:

```bash
cd ~/dev/my-project-pro
git worktree add feature-login -b feature/login
```

Now you have two independent folders:

- `main/`
- `feature-login/`

You can run the app in one and edit or test in the other.

Useful commands:

```bash
git worktree list
git worktree remove feature-login
git worktree repair
```

`git worktree repair` is particularly useful if you move the parent directory and Git needs to refresh worktree links.

# 5. Using this with AI agents

This layout is a very good fit for AI-assisted development because it gives each agent its own filesystem sandbox.

For example, create a dedicated worktree for an AI-driven refactor:

```bash
cd ~/dev/my-project-pro
git worktree add ai-sandbox -b feature/ai-refactor
cp main/.env ai-sandbox/
```

Now point the agent at `ai-sandbox/` and keep your own work in `main/`.

That separation has a few practical benefits:

- the agent can run tests or make broad edits without touching your active checkout
- you can inspect its changes as a normal branch diff
- deleting a failed experiment is as simple as removing the worktree

If your project relies on multiple local config files, use a helper script to bootstrap new worktrees consistently:

```bash
#!/bin/bash
# setup-wt.sh
git worktree add "$1" "$2"
cp main/.env* "$1"/
echo "Worktree $1 created with .env files synced."
```

Example:

```bash
./setup-wt.sh ai-sandbox feature/ai-refactor
```

# 6. Why this is better than constant stashing

The main advantage is not that it is clever. It is that it removes friction.

With this setup:

- branch switching no longer disrupts your local runtime state
- long-running work can stay open in its own folder
- AI agents and human developers can work in parallel
- experiments are disposable

Instead of using one checkout for everything and constantly reshuffling files, you create a separate workspace for each job and let Git manage the mapping.

For teams or solo developers who frequently context-switch, that is usually a better operational model than relying on `git stash` and memory.

# 7. A few cautions

- Do not manually edit the internals of the bare `.git` directory.
- Be careful when copying `.env` files into agent worktrees if they contain secrets.
- Before removing a worktree, make sure you do not have uncommitted changes you still need.
- If a branch is already checked out in one worktree, Git will stop you from checking it out again elsewhere. That is expected behavior.

# 8. Recommended layout

For a personal development machine, a structure like this works well:

```text
~/dev/my-project/
├── .git/
├── main/
├── feature-login/
└── ai-sandbox/
```

This keeps the repository backend hidden, gives every active task a dedicated folder, and scales nicely once you start mixing normal development with AI-assisted workflows.

If you are doing serious multi-branch work, this is one of the highest-leverage Git habits you can adopt.
