---
title: "Install OpenSSH Server on Windows from the Win32-OpenSSH release zip"
date: 2026-04-13
permalink: /posts/2026/04/install_openssh_server_on_windows/
categories: tech
tags: [windows, openssh, ssh, powershell]
---

Quick notes for setting up the Windows OpenSSH server from the `OpenSSH-Win64.zip` package.

This uses the official Win32-OpenSSH release page:
`https://github.com/powershell/win32-openssh/releases`

* TOC
{:toc}

# 1. Download `OpenSSH-Win64.zip`

Download `OpenSSH-Win64.zip` from:

`https://github.com/powershell/win32-openssh/releases`

Extract it to a directory such as:

```powershell
C:\Program Files\OpenSSH-Win64
```

# 2. Run `install-sshd.ps1` in admin mode

Open PowerShell as Administrator, then enter the extracted directory and run:

```powershell
cd 'C:\Program Files\OpenSSH-Win64'
.\install-sshd.ps1
```

This installs the Windows SSH server service.

# 3. Start the services

Still in the elevated PowerShell session:

```powershell
# Start the SSH server service
Start-Service sshd

# Optional: Start the Authentication Agent (for key management)
Start-Service ssh-agent

# Set them to start automatically on boot
Set-Service -Name sshd -StartupType 'Automatic'
Set-Service -Name ssh-agent -StartupType 'Automatic'
```

# 4. SSH server config path

The main server config file is:

```powershell
C:\ProgramData\ssh\sshd_config
```

# 5. Default `authorized_keys` path for administrators

By default, the config uses:

```powershell
C:\ProgramData\ssh\administrators_authorized_keys
```

If you log in as an administrator account, this is the file where your public key is usually placed.

# 6. Quick checks

Check that the services are installed and running:

```powershell
Get-Service sshd
Get-Service ssh-agent
```

Check the configured startup type:

```powershell
Get-Service sshd | Select-Object Name, Status, StartType
Get-Service ssh-agent | Select-Object Name, Status, StartType
```

Check that the config directory exists:

```powershell
Get-ChildItem C:\ProgramData\ssh
```

# 7. Notes

- `install-sshd.ps1` must be run from an elevated PowerShell session.
- `ssh-agent` is optional. It is useful when you want Windows to manage private keys for outbound SSH usage.
- If you modify `C:\ProgramData\ssh\sshd_config`, restart the service to apply changes:

```powershell
Restart-Service sshd
```
