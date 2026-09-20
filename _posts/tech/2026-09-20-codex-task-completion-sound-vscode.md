---
title: "Play a Sound When Codex Finishes a Task in VS Code"
date: 2026-09-20
permalink: /posts/2026/09/codex-task-completion-sound-vscode/
categories: tech
tags: [codex, vscode, ubuntu, linux, notifications, python]
excerpt: "Configure a user-wide Codex completion beep on Ubuntu with notify, a small Python event filter, and PipeWire audio playback."
---

When Codex is working in VS Code, I often switch to another window. A short sound when its turn ends saves me from repeatedly checking the chat panel.

On an Ubuntu 24.04 desktop, the working setup was a local sound player, a small Python script, and Codex's user-level `notify` setting. The sound command ran successfully, and I could hear the beep.

This post describes the setup used in September 2026. A completion beep means the assistant's turn ended; it does not certify that the requested work succeeded or that its checks passed.

* TOC
{:toc}

## First, Check That the Desktop Can Play the Sound

Run this in a terminal in the same desktop environment where Codex runs:

```bash
pw-play /usr/share/sounds/freedesktop/stereo/bell.oga
```

In this setup, `pw-play` and the sound file were already installed. If either is missing, choose an available audio player and a short sound file before configuring Codex.

Listen for the sound. A successful process exit is useful evidence, but hearing it confirms that playback reaches the intended speakers or headphones.

This example assumes Codex runs on the local Linux desktop. With SSH, containers, or another remote environment, the command runs on the Codex host; configuring it there does not automatically route sound to the computer displaying VS Code.

## Connect Playback to a Completion Event

The [official notification documentation](https://developers.openai.com/zh-Hans/docs/notifications) describes using `notify` on the connected Codex host for IDE completion notifications. The [advanced configuration guide](https://learn.chatgpt.com/docs/config-file/config-advanced#notifications) specifies that Codex passes the notification as a JSON command-line argument and currently supports the `agent-turn-complete` event.

Create `~/.codex/notify-completion-sound.py` with this content:

```python
#!/usr/bin/env python3
"""Play a short sound for a Codex turn-completion notification."""

import json
import subprocess
import sys


def main():
    if len(sys.argv) < 2:
        return

    event = json.loads(sys.argv[1])
    if event.get("type") != "agent-turn-complete":
        return

    subprocess.run(
        [
            "/usr/bin/pw-play",
            "/usr/share/sounds/freedesktop/stereo/bell.oga",
        ],
        check=True,
        timeout=10,
    )


if __name__ == "__main__":
    main()
```

The script checks the event type before playing anything. It does not need the prompt or the assistant's answer, and it does not save those fields to a log.

Test it manually with a synthetic event:

```bash
python3 ~/.codex/notify-completion-sound.py \
  '{"type":"agent-turn-complete"}'
```

You should hear the same short sound. Passing another event type should produce no sound:

```bash
python3 ~/.codex/notify-completion-sound.py \
  '{"type":"example-other-event"}'
```

## Enable It Across Local Codex Chats

Back up `~/.codex/config.toml` if it already exists, then edit it. Add this as a **top-level setting**, before any table header such as `[projects]` or `[tui]`:

```toml
notify = ["/usr/bin/python3", "/home/<user>/.codex/notify-completion-sound.py"]
```

Replace `/home/<user>` with your actual home directory. The placeholder keeps the published example generic; it must be replaced in the local configuration. Use an absolute path rather than relying on shell expansion of `~`.

If `notify` already exists, edit the existing setting instead of adding a second definition. Preserve the rest of the configuration.

Using the user-level configuration makes this a default across local Codex chats that use that configuration. It is not an account-wide setting synchronized to other computers. If you use a custom `CODEX_HOME`, edit the configuration in that directory instead.

Reload VS Code to make sure the extension picks up the change:

```text
Ctrl+Shift+P → Developer: Reload Window
```

Ask a short question and listen when the answer finishes. That checks the automatic event path; the earlier manual test checked only the script and audio playback.

## Why Wrap a One-Line Audio Command in Python?

The playback command itself is simple:

```bash
pw-play /usr/share/sounds/freedesktop/stereo/bell.oga
```

However, `notify` appends its JSON payload to the configured command. Pointing it directly at `pw-play` would give the audio player an extra argument that belongs to the notification protocol.

The Python wrapper consumes that argument and filters for `agent-turn-complete`. It then starts the player with only the audio file argument.

Python is optional. A shell command can ignore the appended payload:

```toml
notify = ["/bin/sh", "-c", "exec /usr/bin/pw-play /usr/share/sounds/freedesktop/stereo/bell.oga"]
```

Here, the appended argument becomes the shell's `$0`, which the command does not use. Choose either this setting or the Python setting, not both. I prefer Python because the event filter is explicit and easy to extend.

## What If the First Answer Beeps Twice?

I noticed an occasional double beep around the first answer in a new chat, while later answers produced one beep. Automatic chat-title generation seemed like a possible explanation, but I did not verify that it emitted the second notification.

There are two different cases to distinguish:

- The same completion event is delivered more than once. A wrapper can remember a combination of thread ID and turn ID to suppress repeat playback.
- Two distinct completion events arrive. Deduplicating identical IDs will not suppress the second event if its IDs differ.

The minimal script above plays once per matching invocation; it does not implement deduplication. I also tried a wrapper with ID-based duplicate suppression, but that alone does not establish the cause of two audible beeps.

For this use, the occasional extra beep was acceptable. I left it as a minor behavior to observe rather than adding a timing filter that might hide legitimate completions from other chats.

## Disable the Sound

Remove the `notify` setting, or restore the previous notification command if there was one, then reload VS Code. The Python script can remain on disk; it will not run through this setting once the reference is removed.
