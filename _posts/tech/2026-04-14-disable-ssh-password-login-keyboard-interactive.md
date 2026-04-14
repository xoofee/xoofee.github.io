---
title: "Why SSH Still Asks for a Password After PasswordAuthentication no"
date: 2026-04-14
permalink: /posts/2026/04/disable_ssh_password_login_keyboard_interactive/
categories: tech
tags: [ssh, openssh, linux, macos, security]
---

If you set `PasswordAuthentication no` in `sshd_config` and SSH still accepts a password, the problem is usually not your keys. The problem is that OpenSSH can still allow password-like login through `KbdInteractiveAuthentication`, often backed by PAM.

This shows why that happens and the small config change that actually forces key-only login.

* TOC
{:toc}

# 1. Why `PasswordAuthentication no` is not enough

`PasswordAuthentication` only controls the traditional SSH password authentication method.

On many modern systems, especially Linux distributions that use PAM and macOS setups that still expose keyboard-interactive prompts, SSH can continue to ask for a password through `KbdInteractiveAuthentication`.

From the user's perspective, it still looks like a normal password prompt. From the server's perspective, it is a different authentication mechanism.

That is why a server can appear to ignore:

```bash
PasswordAuthentication no
```

when keyboard-interactive auth is still enabled.

# 2. The config rule that trips people up

OpenSSH config processing is order-sensitive. In practice, the first value obtained for a setting wins.

That matters when your main `sshd_config` has an `Include` line near the top, such as:

```bash
Include /etc/ssh/sshd_config.d/*.conf
```

If one of those included files sets authentication directives first, changing the same directives later in the main file may not have the effect you expect.

When I want an override to be explicit, I usually place it in a dedicated early file such as:

```bash
/etc/ssh/sshd_config.d/000-custom.conf
```

# 3. The fix

To fully disable password-based login, disable both direct password auth and keyboard-interactive auth, while keeping public key auth enabled:

```bash
# Disable standard password auth
PasswordAuthentication no

# Disable password prompts via keyboard-interactive / challenge-response
KbdInteractiveAuthentication no

# Keep key auth enabled
PubkeyAuthentication yes

# Keep PAM for account/session handling if needed
UsePAM yes
```

If your system uses an older OpenSSH naming convention, you may also see `ChallengeResponseAuthentication`. On modern systems, `KbdInteractiveAuthentication` is the directive to check first.

# 4. Apply the change safely

After saving the config, validate it before restarting the SSH service.

## Syntax check

```bash
sudo sshd -t
```

## macOS restart

```bash
sudo launchctl unload /System/Library/LaunchDaemons/ssh.plist
sudo launchctl load -w /System/Library/LaunchDaemons/ssh.plist
```

## Linux restart

```bash
sudo systemctl restart ssh
```

Some distributions use `sshd` instead of `ssh`:

```bash
sudo systemctl restart sshd
```

# 5. Verify the effective server config

Do not trust only the file you edited. Check the effective server config that `sshd` is actually using:

```bash
sudo sshd -T | grep -E "passwordauthentication|kbdinteractiveauthentication|usepam|pubkeyauthentication"
```

You want the relevant lines to resolve to:

```text
passwordauthentication no
kbdinteractiveauthentication no
pubkeyauthentication yes
```

# 6. Practical result

Once both password-based methods are disabled, SSH will stop offering password prompts and require a valid key instead.

If it still asks for a password after that, the next things to check are:

- whether you edited the file that is actually loaded first
- whether `sshd -T` shows a different effective value than expected
- whether you restarted the correct SSH service
- whether your client is falling back because key authentication itself is failing
