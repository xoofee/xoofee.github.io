---
title: "Fix VS Code Codex Extension UI Freeze When CLI Still Works"
date: 2026-06-21
permalink: /posts/2026/06/vscode_codex_extension_ui_freeze_workspace_storage/
categories: tech
tags: [vscode, codex, extension, openssl, debugging]
---

Sometimes the Codex extension in VS Code can get stuck even though the Codex CLI still works normally.

In this case, the UI was not fully crashed. It was stuck in a bad streaming state:

- the chat UI stayed on "thinking..."
- no response stream appeared
- the CLI worked
- reloading VS Code did not fix it
- reinstalling the extension did not fix it

The final fix was deleting VS Code workspace storage:

```bash
rm -rf ~/.config/Code/User/workspaceStorage
```

This resets VS Code's per-workspace stored state. That can include extension state, cached webview data, and workspace UI/session data, so treat it as a reset, not a harmless refresh.

* TOC
{:toc}

# 1. Problem summary

The visible symptom was simple: the Codex extension UI froze in VS Code.

The confusing part was that everything around it looked mostly healthy:

- VS Code did not obviously crash
- the extension host did not visibly die
- the Codex CLI still worked
- authentication seemed to start
- the request appeared to begin
- the response stream never completed

That pattern matters. If the CLI works but the VS Code UI does not, the problem may be local VS Code extension state rather than the Codex service or the network.

# 2. Quick fix

The fix that resolved this case was:

```bash
rm -rf ~/.config/Code/User/workspaceStorage
```

Then restart VS Code and try the Codex extension again.

On Linux, this is the normal VS Code user storage path. Other VS Code builds or platforms use different paths, for example:

- VS Code Insiders: `~/.config/Code - Insiders/User/workspaceStorage`
- macOS: `~/Library/Application Support/Code/User/workspaceStorage`
- Windows: `%APPDATA%\Code\User\workspaceStorage`

If you want a reversible version, move the directory instead of deleting it:

```bash
mv ~/.config/Code/User/workspaceStorage ~/.config/Code/User/workspaceStorage.bak
```

# 3. Things that did not fix it

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

Uninstalling and reinstalling the Codex extension also did not solve it. That was the important clue: reinstalling the extension did not remove the broken workspace state that VS Code was restoring.

# 4. The useful debugging entry point

The most useful diagnostic step was opening the Extension Host logs:

```text
Ctrl+Shift+P -> Developer: Show Logs... -> Extension Host
```

This was more useful than staring at the frozen UI. The UI only showed the symptom. The Extension Host log showed what kind of failure was happening underneath.

# 5. The key log message

The important log entry was:

```text
OPENSSL_internal:BAD_DECRYPT
Cipher functions: BAD_DECRYPT
```

That points to a decryption failure while VS Code or the extension host is reading stored state.

In practical terms, that stored state can include things like:

- cached authentication/session data
- extension state
- encrypted tokens
- workspace-scoped extension data

The exact internal object does not matter much for the fix. The useful conclusion is that VS Code was trying to restore state, and some encrypted state could not be decrypted cleanly.

# 6. The real failure mode

The behavior was not a normal network failure.

The request appeared to start:

- authentication/session state partially loaded
- the extension began the request
- a stream connection seemed to open

But the lifecycle never completed:

- no response arrived in the chat UI
- the UI stayed pending
- VS Code did not clearly crash
- the CLI remained usable

That suggests a broken extension-side state machine rather than a full service outage. The extension was alive enough to start, but not healthy enough to finish the streaming lifecycle.

# 7. Storage reset attempts

After seeing `BAD_DECRYPT`, the working hypothesis was corrupted VS Code extension storage.

The first reset was global storage:

```bash
rm -rf ~/.config/Code/User/globalStorage
```

That did not fix the issue in this case.

The second reset was workspace storage:

```bash
rm -rf ~/.config/Code/User/workspaceStorage
```

That fixed it completely.

# 8. Why workspace storage mattered

VS Code stores a lot of per-workspace extension state under `workspaceStorage`.

If the corrupted or inconsistent state is workspace-scoped, removing `globalStorage` will not help. VS Code may keep reloading the broken data every time that workspace opens.

That matches the observed behavior:

- extension reinstall did not help
- global storage reset did not help
- workspace storage reset did help

So the likely root cause was corrupted or inconsistent VS Code workspace storage that caused a decrypt failure and left the Codex extension stuck during streaming.

# 9. Why the CLI still worked

The Codex CLI and the VS Code extension do not rely on exactly the same runtime state.

The CLI does not depend on VS Code's Extension Host, webview state, or VS Code's workspace storage. So it can remain healthy while the VS Code UI is broken.

In this case:

| Component | Status |
| --- | --- |
| Codex CLI | OK |
| VS Code Codex UI | Broken |

That split is an important diagnostic signal.

# 10. Practical checklist

If the Codex extension UI freezes but the CLI still works, use this order:

1. Reload the VS Code window.
2. Restart the extension host.
3. Check the Extension Host logs:

   ```text
   Ctrl+Shift+P -> Developer: Show Logs... -> Extension Host
   ```

4. Look for decrypt or state-restoration errors, especially:

   ```text
   BAD_DECRYPT
   ```

5. If the request starts but the response stream never completes, suspect extension-side state corruption.
6. Move or remove workspace storage:

   ```bash
   mv ~/.config/Code/User/workspaceStorage ~/.config/Code/User/workspaceStorage.bak
   ```

7. Restart VS Code.

If the moved directory fixes the issue, you can delete the backup later.

# 11. Final takeaway

Do not assume this is a Codex outage just because the VS Code UI is stuck.

The strongest signal in this case was:

```text
CLI works, VS Code UI starts a request, but streaming never completes.
```

Together with `OPENSSL_internal:BAD_DECRYPT`, that pointed to broken VS Code extension state.

The effective fix was resetting workspace storage:

```bash
rm -rf ~/.config/Code/User/workspaceStorage
```
