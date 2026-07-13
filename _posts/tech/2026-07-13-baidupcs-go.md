---
title: "Using BaiduPCS-Go cli"
date: 2026-07-13
permalink: /posts/2026/07/baidupcs_go_cli/
categories: tech
tags: [baidu, baidupcs-go, netdisk, download]
---

BaiduPCS-Go is a command-line Baidu Netdisk client.

You can use it in an interactive shell, or run one-shot commands from the normal terminal. The main things to get right are:

- download the Linux binary
- log in, usually with a browser cookie if verification is annoying
- keep download concurrency low
- avoid leaking cookies or tokens

* TOC
{:toc}

# 1. Download and extract

For Linux AMD64, download the release zip from GitHub.

At the time of writing, `v4.0.1` is the latest release:

```bash
wget https://github.com/qjfoidnh/BaiduPCS-Go/releases/download/v4.0.1/BaiduPCS-Go-v4.0.1-linux-amd64.zip
unzip BaiduPCS-Go-v4.0.1-linux-amd64.zip
cd BaiduPCS-Go-v4.0.1-linux-amd64
chmod +x BaiduPCS-Go
```

Run it:

```bash
./BaiduPCS-Go
```

Or check help:

```bash
./BaiduPCS-Go help
```

The release page is:

```text
https://github.com/qjfoidnh/BaiduPCS-Go/releases
```

If a newer version is available later, use the same pattern with the newer Linux AMD64 zip.

# 2. Set a config directory if needed

If you want to keep the BaiduPCS-Go config in a specific location, set the config directory explicitly:

```bash
export BAIDUPCS_GO_CONFIG_DIR="$HOME/.config/BaiduPCS-Go"
```

If you want this to persist across terminal sessions, add it to your shell profile.

# 3. Login with browser cookies

For first login, the most reliable method is often:

1. Log in to `pan.baidu.com` in a normal browser.
2. Complete SMS, email, captcha, or other verification in the browser.
3. Open browser DevTools.
4. Copy the `Cookie` request header from a logged-in request to Baidu Netdisk.
5. Use that cookie with BaiduPCS-Go.

The cookie should include fields such as:

```text
BDUSS
STOKEN
```

Then log in:

```bash
./BaiduPCS-Go login -cookies='BDUSS=...; STOKEN=...; ...'
```

Check the login:

```bash
./BaiduPCS-Go who
./BaiduPCS-Go ls /
```

# 4. Interactive login

You can also run the interactive login:

```bash
./BaiduPCS-Go login
```

If Baidu asks for SMS or email verification, the CLI prompts you to choose the verification method and enter the received code.

If Baidu asks for an image captcha, the CLI prints a local captcha path and a URL. Open the URL in your browser, read the captcha, then enter it in the terminal.

This can work, but cookie login is usually easier when Baidu insists on browser-side verification.

# 5. Interactive shell vs one-shot commands

When you run:

```bash
./BaiduPCS-Go
```

with no arguments, it enters the BaiduPCS-Go interactive shell.

Inside that shell, commands do not need the `./BaiduPCS-Go` prefix:

```bash
ls /
download /YA2025198_Data --saveto "$HOME/downloads"
```

From the normal shell, include the binary prefix:

```bash
./BaiduPCS-Go ls /
./BaiduPCS-Go download /YA2025198_Data --saveto "$HOME/downloads"
```

# 6. Keep concurrency low

To avoid Baidu throttling, especially for normal accounts, keep download concurrency low:

```bash
config set -max_parallel 1 -max_download_load 1
```

If you are in the normal terminal instead of the BaiduPCS-Go interactive shell, run:

```bash
./BaiduPCS-Go config set -max_parallel 1 -max_download_load 1
```

# 7. Fix unreadable terminal output

If terminal output appears as underscores or unreadable text, set UTF-8 locale variables:

```bash
export LANG=C.UTF-8
export LC_ALL=C.UTF-8
```

If that fixes the display, add the exports to your shell profile.

# 8. Security note

`BDUSS`, `STOKEN`, and full cookie strings are effectively login credentials.

Do not publish them in:

- blog posts
- screenshots
- terminal logs
- Git repositories
- issue reports

If they are accidentally exposed, refresh the Baidu session and treat the old cookie as compromised.

# 9. Minimal command sequence

For Linux AMD64, the basic flow is:

```bash
wget https://github.com/qjfoidnh/BaiduPCS-Go/releases/download/v4.0.1/BaiduPCS-Go-v4.0.1-linux-amd64.zip
unzip BaiduPCS-Go-v4.0.1-linux-amd64.zip
cd BaiduPCS-Go-v4.0.1-linux-amd64
chmod +x BaiduPCS-Go

export BAIDUPCS_GO_CONFIG_DIR="$HOME/.config/BaiduPCS-Go"
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

./BaiduPCS-Go login -cookies='BDUSS=...; STOKEN=...; ...'
./BaiduPCS-Go who
./BaiduPCS-Go ls /
./BaiduPCS-Go config set -max_parallel 1 -max_download_load 1
./BaiduPCS-Go download /YA2025198_Data --saveto "$HOME/downloads"
```

The key lesson is simple: do the hard login verification in a browser first, then let BaiduPCS-Go use the resulting session cookie for command-line downloads.
