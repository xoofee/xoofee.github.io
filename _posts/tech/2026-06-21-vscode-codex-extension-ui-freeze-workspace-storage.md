---
title: "VS Code Codex Extension UI Freeze May Be Caused by Missing Shell Environment"
date: 2026-06-21
permalink: /posts/2026/06/vscode_codex_extension_ui_freeze_shell_environment/
categories: tech
tags: [vscode, codex, extension, openssl, debugging, environment]
---

Sometimes the Codex extension in VS Code can get stuck even though the Codex CLI still works normally.

I originally thought the fix was deleting VS Code workspace storage. After more observation, that now looks misleading. Removing `workspaceStorage` may have only worked by chance, or only temporarily. It does not seem reliable enough to explain the real problem.

The stronger clue is this:

```text
When VS Code is launched from a terminal, the Codex extension does not seem to get stuck.
```

So my current hypothesis is that the Codex extension is missing some environment inherited from the user's shell when VS Code is launched from the desktop.

I am still observing this. It is stable for now, but I do not want to call it proven yet.

* TOC
{:toc}

# 1. Problem summary

The visible symptom was simple: the Codex extension UI froze in VS Code.

The Codex panel showed only the centered Codex icon, blinking about every three seconds:

- no session history appeared
- no prompt input appeared
- no usable chat UI appeared
- only the center icon kept blinking
- the CLI worked
- reloading VS Code did not fix it
- reinstalling the extension did not fix it

The confusing part was that everything around it looked mostly healthy:

- VS Code did not obviously crash
- the extension host did not visibly die
- the Codex CLI still worked
- the Codex plugin panel opened

At first, I interpreted this as broken VS Code extension state. Now I think that was probably too narrow.

# 2. Current experiment: launch VS Code with shell environment

The current workaround I am testing is changing the VS Code desktop entry so it launches Code through an interactive shell.

The original desktop entry used:

```ini
Exec=/usr/share/code/code %F
```

The current experiment uses:

```ini
Exec=bash -ic '/usr/share/code/code "$@"' bash %F
```

For the "New Empty Window" action, the original entry used:

```ini
Exec=/usr/share/code/code --new-window %F
```

The current experiment uses:

```ini
Exec=bash -ic '/usr/share/code/code --new-window "$@"' bash %F
```

With this desktop-file method, the Codex extension has been stable so far.

The important idea is not that this exact `bash -ic` line is magically special. The important idea is that VS Code launched from the desktop may not receive the same environment as VS Code launched from a terminal.

# 3. Why this looks like an environment problem

The strongest observation is:

```text
VS Code launched from terminal: Codex extension works
VS Code launched from desktop: Codex extension may get stuck
```

That split points away from a pure Codex service outage. It also weakens the old theory that workspace storage was the whole cause.

The Codex CLI already worked. The VS Code extension also worked when Code inherited the terminal environment. So the failure may be in the environment available to the extension when VS Code starts from the desktop launcher.

Possible missing environment could include shell initialization, paths, authentication-related variables, proxy variables, or other configuration that exists in an interactive shell but not in the desktop session.

I have not isolated the exact variable yet.

# 4. The older workspace storage theory

The first version of this post claimed that the fix was deleting VS Code workspace storage:

```bash
rm -rf ~/.config/Code/User/workspaceStorage
```

That conclusion now seems too confident.

Deleting `workspaceStorage` did appear to help once. But later observation made it look unreliable:

- it was not stable enough to solve the stuck UI repeatedly
- the problem could still happen again
- launching VS Code from terminal avoided the stuck state more consistently
- the desktop-file shell-launch method is currently more promising

So I now treat the storage reset as a previous attempt, not the real fix.

If you still want to try it, use a reversible move instead of deleting it:

```bash
mv ~/.config/Code/User/workspaceStorage ~/.config/Code/User/workspaceStorage.bak
```

But I would not start there anymore unless there is clear evidence that VS Code workspace state is actually corrupted.

# 5. The old log clue: BAD_DECRYPT

One clue from the first debugging pass was this Extension Host log message:

```text
OPENSSL_internal:BAD_DECRYPT
Cipher functions: BAD_DECRYPT
```

At the time, that made `workspaceStorage` look like the likely problem. A decrypt error sounds like stored state, cached credentials, or extension data failing to restore.

That may still be related. But it may also be secondary. For example, if the extension starts without the expected environment, it may fail while trying to restore or use some state.

So I no longer want to over-read this log message as proof that workspace storage was corrupted.

# 6. Things that did not reliably fix it

The first attempts were the natural ones.

Reload the VS Code window:

```text
Ctrl+Shift+P -> Developer: Reload Window
```

This did not resolve the issue.

Restart the extension host:

```text
Ctrl+Shift+P -> Developer: Restart Extension Host
```

This gave no lasting improvement.

Uninstalling and reinstalling the Codex extension also did not solve it reliably.

Resetting global storage did not fix it:

```bash
rm -rf ~/.config/Code/User/globalStorage
```

Resetting workspace storage seemed to help once, but later looked more like coincidence than root cause:

```bash
rm -rf ~/.config/Code/User/workspaceStorage
```

# 7. Practical checklist

If the Codex extension UI freezes but the CLI still works, I would now debug it in this order:

1. Launch VS Code from a terminal:

   ```bash
   code
   ```

2. Open the same workspace and check whether the Codex extension starts normally.
3. If terminal launch works, compare that with launching VS Code from the desktop icon.
4. If desktop launch is the failing path, test a desktop entry that starts Code through an interactive shell:

   ```ini
   Exec=bash -ic '/usr/share/code/code "$@"' bash %F
   ```

5. Also update the new-window action if you use it:

   ```ini
   Exec=bash -ic '/usr/share/code/code --new-window "$@"' bash %F
   ```

6. Only then consider storage reset as a fallback, preferably with a reversible move:

   ```bash
   mv ~/.config/Code/User/workspaceStorage ~/.config/Code/User/workspaceStorage.bak
   ```

# 8. Current takeaway

I no longer think `workspaceStorage` deletion was the real answer.

The current best explanation is:

```text
The Codex extension may need environment that exists when VS Code is launched from a terminal, but is missing when VS Code is launched directly from the desktop.
```

Changing the desktop entry to launch Code through `bash -ic` is stable for now.

This is still an experiment. The root cause is not fully proven yet, and I still need to observe whether this stays fixed over time.
