---
title: "Run WireGuard on Apple Silicon macOS with wg-quick and launchd"
date: 2026-04-14
permalink: /posts/2026/04/run_wireguard_on_macos_apple_silicon_with_launchd/
categories: tech
tags: [macos, wireguard, apple-silicon, launchd, bash]
---

Quick notes for running a WireGuard tunnel on an Apple Silicon Mac with `wg-quick` and `launchd`.

This setup assumes Homebrew is installed under `/opt/homebrew`, which is the default on Apple Silicon systems.

The goal here is to make the setup as reproducible as possible, including writing the `launchd` plist with a shell heredoc so the XML stays exact.

* TOC
{:toc}

# 1. Prerequisites and installation

On Apple Silicon Macs, Homebrew installs binaries to `/opt/homebrew`.

Install the WireGuard tools and a modern Bash first. macOS still ships Bash 3.2, but `wg-quick` requires Bash 4 or newer.

```bash
# Install WireGuard tools and modern Bash
brew install wireguard-tools bash

# Ensure the directory for symlinks exists
sudo mkdir -p /usr/local/bin

# Symlink Homebrew Bash so wg-quick can find it
sudo ln -s /opt/homebrew/bin/bash /usr/local/bin/bash
```

# 2. Configuration setup

Place the WireGuard config under Homebrew's WireGuard directory and lock down the file permissions.

```bash
# Ensure the config directory exists
sudo mkdir -p /opt/homebrew/etc/wireguard

# Move your config (assuming it's in your current folder)
sudo mv wg1.conf /opt/homebrew/etc/wireguard/wg1.conf

# Secure the permissions
sudo chown root:wheel /opt/homebrew/etc/wireguard/wg1.conf
sudo chmod 600 /opt/homebrew/etc/wireguard/wg1.conf
```

# 3. Persistent always-on setup with `launchd`

Create a system `launchd` plist so the tunnel starts immediately and comes back after reboot.

Using `cat <<EOF` is useful here because it writes the XML in one block and reduces the chance of accidental formatting errors.

```bash
sudo bash -c 'cat <<EOF > /Library/LaunchDaemons/com.wireguard.wg1.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.wireguard.wg1</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/wg-quick</string>
        <string>up</string>
        <string>wg1</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/tmp/wg1.err</string>
    <key>StandardOutPath</key>
    <string>/tmp/wg1.out</string>
</dict>
</plist>
EOF'

# Set the strictly required ownership for system daemons
sudo chown root:wheel /Library/LaunchDaemons/com.wireguard.wg1.plist
sudo chmod 644 /Library/LaunchDaemons/com.wireguard.wg1.plist
```

# 4. Activation and management

Use `launchctl` to load the service. This starts the VPN immediately and also registers it to start automatically after every reboot.

| Action | Command |
| :--- | :--- |
| **Start and enable at boot** | `sudo launchctl bootstrap system /Library/LaunchDaemons/com.wireguard.wg1.plist` |
| **Stop and disable at boot** | `sudo launchctl bootout system /Library/LaunchDaemons/com.wireguard.wg1.plist` |
| **Check handshake** | `sudo wg show` |
| **Check interface** | `ifconfig wg1` |

# 5. Troubleshooting

- **Version mismatch:** If `wg-quick` complains about Bash 3, verify the symlink with `ls -l /usr/local/bin/bash`.
- **Input/output error 5:** This usually means the service is already loaded. Run the `bootout` command above before retrying `bootstrap`.
- **Logs:** If the tunnel does not come up, inspect the error log with `cat /tmp/wg1.err`.

# 6. Notes

- This post assumes the interface name is `wg1`. Adjust both the config filename and plist label if you use a different interface.
- The `launchd` plist shown here runs `wg-quick up wg1`. If you need a teardown step on unload, you can extend the service design later, but this is the minimal always-on setup.
