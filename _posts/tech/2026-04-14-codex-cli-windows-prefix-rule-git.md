---
title: "Codex CLI 0.119.0 on Windows: `prefix_rule` for `git` is not usable"
date: 2026-04-14
permalink: /posts/2026/04/codex_cli_windows_prefix_rule_git/
categories: tech
tags: [codex, windows, git, powershell, automation]
---

Quick note from testing `codex cli 0.119.0` on Windows: `prefix_rule` was not practical for allowing common `git` commands in a reusable way.

What I wanted was simple: allow a small set of safe `git` commands such as `add`, `commit`, `status`, `diff`, and `log` without re-approving them each time. On this version, that did not work reliably on Windows.

* TOC
{:toc}

# 1. Environment

Tested with:

```text
codex cli 0.119.0
Windows
~/.codex/rules/git_custom.rules
```

# 2. What I tried

## Pattern form for plain `git`

This would be the obvious rule:

```text
prefix_rule(pattern=["git", ["add", "commit", "status", "diff", "log"]], decision="allow")
```

On Windows in this version, it did not work.

## Pattern form for PowerShell + `git commit`

I also tried matching the PowerShell wrapper explicitly:

```text
prefix_rule(pattern=["C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command", "git commit"], decision="allow")
```

This also did not work.

## Array form for the `git commit` part

I then tried making the `git commit` portion array-shaped:

```text
prefix_rule(pattern=["C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command", ["git", "commit"]], decision="allow")
```

That did not work either.

# 3. What did work

Only an exact full command pattern worked:

```text
prefix_rule(pattern=["C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command", "git commit -m \"Add foo.txt\""], decision="allow")
```

That is technically valid, but not useful in practice. It only helps for one exact command string, including the commit message.

For normal `git` usage, that defeats the point of having a reusable allow rule.

# 4. Why this is a problem

On Windows, many commands are executed through PowerShell:

```text
C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe -Command ...
```

So even if you conceptually want to allow:

```text
git commit
```

the actual prefix matching may be happening against the wrapped PowerShell invocation, not against the logical subcommand you expected.

In `0.119.0`, the result from my testing was:

- generic `git` prefix rules were not effective
- PowerShell-wrapped partial patterns were not effective
- exact full-command matching could work, but was too narrow to be useful

# 5. Practical conclusion

For this version on Windows, I gave up on trying to maintain reusable `prefix_rule` entries for everyday `git` commands.

If you are on `codex cli 0.119.0` and Windows, my practical recommendation is:

- do not spend much time trying to generalize `prefix_rule` for `git`
- treat exact full-command matches as a debugging clue, not a real solution
- wait for a newer version before relying on this workflow

# 6. Test snippets

For reference, these were the test cases:

```text
# not work in windows
prefix_rule(pattern=["git", ["add", "commit", "status", "diff", "log"]], decision="allow")

# still not work
prefix_rule(pattern=["C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command", "git commit"], decision="allow")

# not work either
prefix_rule(pattern=["C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command", ["git", "commit"]], decision="allow")

# ok for git commit -m "Add foo.txt", but this is useless
prefix_rule(pattern=["C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command", "git commit -m \"Add foo.txt\""], decision="allow")
```

# 7. Bottom line

As of my testing on Windows with `codex cli 0.119.0`, `prefix_rule` was too brittle for practical `git` allow-listing.

For now, I would not build a workflow around it.
