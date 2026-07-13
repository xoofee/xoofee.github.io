---
title: "Fix Clash Verge TUN Mode on Ubuntu: operation not permitted"
date: 2026-07-13
permalink: /posts/2026/07/fix_clash_verge_tun_mode_ubuntu_operation_not_permitted/
categories: tech
tags: [ubuntu, linux, clash-verge, mihomo, tun]
---

Clash Verge TUN mode is useful because it gives you system-wide proxying without configuring every application separately.

But on Ubuntu, TUN mode may fail even when everything looks enabled:

- Clash Verge is installed
- Service Mode is enabled
- TUN Mode is enabled
- the Clash Verge service is running

The error usually looks like this:

```text
Start TUN listening error:
configure tun interface: operation not permitted
```

The short version: the Clash core process needs Linux network capabilities.

* TOC
{:toc}

# 1. Why this happens

TUN mode creates a virtual network interface and changes routing rules. On Linux, a normal user process is not allowed to do that by default.

The Clash core process, usually `mihomo` or `verge-mihomo`, needs this capability:

```text
CAP_NET_ADMIN
```

This allows operations such as:

- creating TUN/TAP devices
- modifying network interfaces
- changing routing rules

Without it, Clash Verge can start normally, but the core fails when it tries to create the TUN interface.

# 2. Diagnose the capability problem

Find the Clash core process:

```bash
ps aux | grep verge-mihomo
```

Then check the process capabilities:

```bash
cat /proc/<pid>/status | grep Cap
```

A failing process may show:

```text
CapEff: 0000000000000000
```

That means the process has no effective Linux capabilities.

The user ID may still look normal:

```text
Uid: 1000
```

That is expected. Clash Verge usually runs under your desktop user account. The problem is not the user account; the problem is missing process capabilities.

# 3. Check TUN kernel support

Before changing capabilities, make sure the TUN device exists.

Check whether the module is loaded:

```bash
lsmod | grep tun
```

If needed, load it:

```bash
sudo modprobe tun
```

Then check the device:

```bash
ls -l /dev/net/tun
```

On a working system, `/dev/net/tun` should be available.

# 4. Grant capabilities to verge-mihomo

Use `setcap` to grant only the permissions the core needs:

```bash
sudo setcap cap_net_admin,cap_net_bind_service=+ep /usr/bin/verge-mihomo
```

This is better than running the whole application as root.

Avoid launching Clash Verge like this:

```bash
sudo clash-verge
```

Running the GUI as root can create root-owned config files, expose too much of the desktop application to privilege, and make later updates or settings changes annoying.

`setcap` keeps the privilege attached to the core binary instead.

# 5. Verify the fix

Check the binary capabilities:

```bash
getcap /usr/bin/verge-mihomo
```

Expected output:

```text
/usr/bin/verge-mihomo cap_net_bind_service,cap_net_admin=ep
```

Then restart the Clash core. You can do this from the Clash Verge GUI, or close and reopen Clash Verge.

# 6. Confirm the TUN interface

Before the fix, `ip link` may only show normal interfaces:

```text
lo
wlp60s0
docker0
waydroid0
```

After TUN mode starts successfully, a new interface should appear. The exact name depends on your Clash configuration, but common names include:

```text
Meta
clash0
tun0
```

Check:

```bash
ip link
ip route
```

A working TUN setup usually creates routes that redirect traffic through the Clash interface.

# 7. Test without proxy environment variables

When testing TUN mode, make sure you are not accidentally testing normal HTTP proxy mode.

Check proxy variables:

```bash
echo $http_proxy
echo $https_proxy
```

For a real TUN test, unset them:

```bash
unset http_proxy
unset https_proxy
unset HTTP_PROXY
unset HTTPS_PROXY
```

Then test with a command-line tool that has no explicit proxy configuration:

```bash
timeout 10 wget -S -O /dev/null http://google.com
```

If this works, the traffic is being captured transparently by TUN mode.

# 8. Proxy mode vs TUN mode

HTTP proxy mode and TUN mode are different.

In HTTP proxy mode, traffic looks like this:

```text
Application
    |
    | HTTP proxy
    v
127.0.0.1:7897
    |
    v
Clash
    |
    v
Proxy server
```

Only applications configured to use the proxy go through Clash.

In TUN mode, traffic looks like this:

```text
Application
    |
    v
Linux network stack
    |
    v
Clash TUN interface
    |
    v
Proxy server
```

Applications do not need proxy settings.

This is why TUN mode is useful for:

- command-line tools
- Docker containers
- browsers without proxy settings
- system services
- applications that ignore proxy variables

# 9. Summary

Clash Verge Service Mode running does not automatically mean TUN mode has enough permission.

The important fix is:

```bash
sudo setcap cap_net_admin,cap_net_bind_service=+ep /usr/bin/verge-mihomo
```

Then verify:

```bash
getcap /usr/bin/verge-mihomo
ip link
ip route
```

After that, Clash Verge TUN mode should be able to create its virtual network interface and provide system-wide proxying without running the application as root.
