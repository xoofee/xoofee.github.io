---
title: "Chinese and English Voice Input on Ubuntu with Fcitx5-VInput and Alibaba Bailian"
date: 2026-09-19
permalink: /posts/2026/09/fcitx5-vinput-bailian-voice-input/
categories: tech
tags: [ubuntu, linux, fcitx5, voice-input, asr, bailian]
excerpt: "Set up Fcitx5-VInput Lite with Alibaba Bailian's streaming speech recognition and configure a Ctrl + Alt + Shift recording shortcut through the Fcitx5 GUI."
---

I wanted voice input on Ubuntu that could handle Chinese and English in the same sentence, including technical terms such as EtherCAT, PLC, Siemens, and Ubuntu. I already used Fcitx5 with a US keyboard and Wubi.

The working setup uses **Fcitx5-VInput Lite with Alibaba Bailian cloud speech recognition**. I configured Left Ctrl + Left Alt + Left Shift as my recording shortcut through the Fcitx5 GUI. Holding the combination lets me speak, and releasing it finishes the recording so the recognized text can appear in the focused input field. Wubi remains available as before.

This post records the setup with `fcitx5-vinput-lite` version `2.3.25-1ppa1~noble1` on Ubuntu. Provider names and cloud model availability may change; the configuration below reflects the setup used in September 2026.

* TOC
{:toc}

## What Each Component Does

The input path is:

```text
Microphone
    -> VInput daemon
    -> Bailian streaming speech recognition
    -> Fcitx5 VInput addon
    -> Focused application's input field
```

Fcitx5 handles desktop input integration. VInput captures audio and connects it to a recognition provider. Bailian runs the speech recognition model in the cloud.

The Lite package supports cloud recognition without installing the local ONNX runtime. The full package is the option for local recognition. For this cloud setup, I did not need to download a local speech model. See the project's [installation instructions](https://github.com/xifan2333/fcitx5-vinput).

VInput also supports LLM post-processing, but that is a separate step. I left it out initially so I could evaluate the speech recognizer's own output.

## Install VInput Lite

This assumes Fcitx5 is already installed and working in desktop applications. For Ubuntu 24.04, the project documents this PPA:

```bash
sudo add-apt-repository ppa:xifan233/ppa
sudo apt update
sudo apt install fcitx5-vinput-lite
```

If the PPA is already configured, only the installation command is needed.

Enable and start the user service:

```bash
systemctl --user enable --now vinput-daemon.service
```

If Fcitx5 was already running when the addon was installed, restart it to load the addon. This command replaces the existing instance and runs the new instance in the background, returning control to the terminal:

```bash
fcitx5 -rd
```

**`-r` means `--replace`, not reload; `-d` runs Fcitx5 as a daemon.** The local `fcitx5 --help` output confirms these options. This replaces the Fcitx5 process; it does not restart the VInput daemon.

With only `fcitx5 -r`, the new instance stays in the foreground and does not return a shell prompt while it runs. That is expected behavior. Pressing Ctrl+C terminates that instance and can stop input methods from working. If that has already happened, run `fcitx5 -rd` to start it again in the background.

Logging out and back in is another way to load the addon when Fcitx5 starts with the desktop session. If VInput already works, skip this restart step; it is not needed before each use.

Check the package, addon, and service:

```bash
dpkg-query -W fcitx5-vinput-lite
fcitx5-diagnose | grep -i vinput
systemctl --user status vinput-daemon.service --no-pager
```

My diagnostic output included:

```text
Vinput 2.3.25
```

That confirms VInput appears in the diagnostic report. It does not establish that cloud recognition has been configured successfully.

## VInput Is an Addon, Not Another Keyboard Layout

The Fcitx configuration window still listed only these active input methods:

```text
Keyboard - English (US)
Wubi
```

That was expected. The installed VInput addon declares `Category=Module`; it does not need to be added as an ordinary input method alongside Wubi. Look under **Addons** for its Fcitx settings, and use `vinput-gui` for the recognition provider configuration.

Likewise:

```bash
fcitx5-remote -n
```

may return `keyboard-us`. This reports the current input method, not whether the VInput addon is installed or whether its cloud connection works.

## Create a Bailian API Key

There are two Alibaba Cloud services that are easy to confuse:

| Service | Console and credentials relevant here |
| --- | --- |
| Alibaba Cloud Model Studio / Bailian | The cloud model platform used by this VInput provider; requires a Bailian API key |
| Intelligent Speech Interaction 2.0 | A separate speech service, whose console offers a temporary AccessToken |

I initially opened the Intelligent Speech Interaction console at `nls-portal.console.aliyun.com`. Its temporary AccessToken is **not** the credential for the Bailian provider configured here. A free trial on that service also does not establish a free allowance for Bailian models.

To obtain the correct key:

1. Open the [Bailian console](https://bailian.console.aliyun.com/) and sign in to an Alibaba Cloud account.
2. Select **China (Beijing)**, also labeled **North China 2 (Beijing)**, and activate the service if prompted.
3. Complete any account verification required by the console.
4. Open **API Key**, create a key in the default workspace, and copy it into VInput locally.

Keys and endpoints are region-specific. A key from another region should not be paired with the Beijing endpoint below. The [official API key guide](https://help.aliyun.com/zh/model-studio/get-api-key) explains the account, workspace, and region options.

Creating the key is free; model calls can incur usage charges. Check the selected model's price, free allowance, and expiry in the console before regular use. VInput being free software does not make the cloud service free. See [Bailian's service overview](https://help.aliyun.com/zh/model-studio/what-is-model-studio).

## Add the Streaming Recognition Provider

Open the VInput configuration application:

```bash
vinput-gui
```

Use its resource catalog to add the provider with this identifier:

```text
bailian-qwen-audio3-stream
```

Alternatively, add it from the terminal:

```bash
vinput provider add bailian-qwen-audio3-stream
```

It appeared in my GUI as **Bailian Qwen-Audio (Streaming)**. Use the provider identifier to distinguish it from `bailian-stream`: the adapters use different WebSocket protocols, so their names are not interchangeable. The [Qwen-Audio provider documentation](https://github.com/xifan2333/vinput-registry/blob/main/resources/providers/bailian/qwen-audio3.streaming/README.md) describes the required adapter.

Select the provider under **Control → ASR Providers**, click **Edit**, and enter these values in **Env**, one entry per line:

```ini
VINPUT_ASR_API_KEY=YOUR_BAILIAN_API_KEY
VINPUT_ASR_MODEL=qwen-audio-3.0-asr-flash-streaming
VINPUT_ASR_URL=wss://dashscope.aliyuncs.com/api-ws/v1/inference
```

Replace `YOUR_BAILIAN_API_KEY` with the actual key. Keep it out of screenshots, blog posts, and Git commits.

The model ID is an ASR model, not a general chat model. Alibaba's [speech recognition model guide](https://help.aliyun.com/zh/model-studio/asr-model) currently recommends this model for real-time recognition and lists support for Chinese, English, and recognition context. I chose it for this workflow; I did not run a comparative accuracy benchmark.

The prompt supplies domain vocabulary to the recognizer. It is not an LLM rewriting stage or a separately provisioned weighted hotword dictionary, and it cannot guarantee correct spelling of every technical term. **The prompt is optional**: Chinese and English recognition still works if it is left empty:

```ini
VINPUT_ASR_PROMPT=
```

The adapter documents the URL above as the legacy Beijing endpoint. It also supports workspace-specific endpoints. If using that route, omit the explicit URL and set `VINPUT_ASR_WORKSPACE_ID` as described in the adapter documentation; an explicit URL takes precedence.

## Leave Optional Settings at Their Defaults First

The provider form also exposes these environment variables:

| Variable | Initial setting and purpose |
| --- | --- |
| `VINPUT_ASR_LANGUAGE` | Leave unset to avoid sending an explicit language hint |
| `VINPUT_ASR_ENABLE_PUNCTUATION` | Keep the default; this specifically controls semantic punctuation and sentence splitting |
| `VINPUT_ASR_VAD_SILENCE_DURATION_MS` | Keep the default silence threshold for sentence splitting |
| `VINPUT_ASR_TIMEOUT` | Keep the default network timeout |
| `VINPUT_ASR_FINISH_GRACE_SECS` | Keep the default wait for final results after recording ends |
| `VINPUT_ASR_WORKSPACE_ID` | Not needed when using the explicit URL above |

These are configuration settings, not additional products to buy. Optional rows can remain blank in this adapter. Leaving the punctuation setting at its default does not mean that the transcript must contain no punctuation.

For the first test, I kept language hints unset and used the vocabulary prompt. Language hint behavior depends on the model; there is no universal rule that specifying Chinese prevents English recognition.

## Save, Activate, and Dictate

In the configuration window:

1. Save the provider edits and click **Save Settings**.
2. Select **Bailian Qwen-Audio (Streaming)** and click **Activate** if available.
3. Click **Restart** in the daemon section and wait for **Running: idle**.

The command-line equivalents for selecting the provider and restarting the daemon are:

```bash
vinput provider use bailian-qwen-audio3-stream
systemctl --user restart vinput-daemon.service
```

The initial recording shortcut on my installation was **Right Alt**. It worked for the first test, but I then changed it to **Left Ctrl + Left Alt + Left Shift** using the GUI below.

## Configure the Recording Shortcut Through the GUI

Use the Fcitx5 configuration tool for key bindings:

```bash
fcitx5-configtool
```

1. Open the **Addons** tab.
2. Find **Vinput** (or **语音输入** in the Chinese interface).
3. Click its configuration button, shown as a gear icon.
4. Select the recording trigger shortcut field and replace Right Alt by pressing **Left Ctrl + Left Alt + Left Shift**. Hold Ctrl and Alt first, then press Left Shift.
5. Confirm the shortcut and click **Apply** or **OK** to save it.

This GUI is separate from `vinput-gui`: Fcitx5's addon settings control the shortcut, while `vinput-gui` manages the recognition provider and daemon. I recommend capturing the shortcut in the GUI because it saves Fcitx5's key representation without having to guess the modifier syntax.

For reference, the GUI saved the following in `~/.config/fcitx5/conf/vinput.conf`:

```ini
TriggerMode=Both

[TriggerKey]
0=Control+Alt+Shift+Shift_L

[MenuKey]
0=Shift_R
```

The repeated `Shift` in `Control+Alt+Shift+Shift_L` is the representation the GUI generated; there is no need to simplify it manually. `Shift_L` identifies the left Shift key, while the Control and Alt modifier flags do not enforce which side of the keyboard is used. I use all three left-hand keys, but this should not be read as a strict left-only restriction for every modifier.

Click inside a text editor or chat input field. Hold **Left Ctrl and Left Alt**, then press and hold **Left Shift** while speaking. Release Left Shift to finish, then release the other modifiers and wait for the text to appear.

With `TriggerMode=Both`, the trigger supports both hold-to-talk and a brief press to toggle recording. Right Shift remains the VInput menu shortcut. If a desktop or application shortcut intercepts the combination, choose another binding through the same GUI.

A useful test is a sentence containing Chinese, English, and a domain-specific name, such as saying that a PLC uses EtherCAT to control three servo axes. Check whether the result preserves the technical terms before adding optional LLM correction.

## Troubleshooting the Initial Setup

**The daemon runs, but the log says ASR is disabled.** Before I selected the cloud provider, the Lite build reported:

```text
running with ASR disabled (Local ASR support is disabled in this Lite build.)
```

The service was alive, but the selected local backend could not work in the Lite build. Adding and activating the cloud provider resolved this setup issue.

**The GUI says “configured,” but no text appears.** Configuration status alone does not prove that authentication or model access works. Make a short recording, then inspect the daemon log:

```bash
journalctl --user -u vinput-daemon.service -n 50 --no-pager
```

For authentication errors, verify that the key comes from Bailian, matches the endpoint region, and has access to the selected model. For quota errors, check that model's allowance and billing status in Bailian. Redact credentials before sharing logs.

**Recording does not start or captures silence.** Confirm that an application input field has focus and that Fcitx5 is working there. Check the recording shortcut under **Fcitx5 Configuration → Addons → Vinput**, then select the intended microphone under **Capture Device** in `vinput-gui`.

**Recognition works, but technical words are wrong.** Refine the domain prompt and test with the same sentences. Microphone quality, background noise, pronunciation, and the model all affect the result. Add LLM correction only after the basic transcription path works; it can introduce extra latency, cost, and unwanted wording changes.

The completed setup lets me dictate into desktop applications while retaining my existing keyboard and Wubi input methods. The essential pieces were the cloud-capable Lite package, the correct Bailian adapter, a matching regional API key, and activating that provider before recording.
