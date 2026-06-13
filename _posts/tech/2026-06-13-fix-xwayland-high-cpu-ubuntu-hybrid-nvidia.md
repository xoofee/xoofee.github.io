---
title: "Fixing XWayland High CPU Spikes on Ubuntu 24.04 with Intel + NVIDIA Hybrid Graphics"
date: 2026-06-13
permalink: /posts/2026/06/fix-xwayland-high-cpu-ubuntu-hybrid-nvidia/
categories: tech
tags: [ubuntu, wayland, xwayland, nvidia, nouveau, hybrid-graphics, linux]
excerpt: "How installing the proprietary NVIDIA driver fixed repeated XWayland CPU spikes when launching Electron and Chromium apps on an Ubuntu 24.04 Intel + NVIDIA hybrid laptop."
---

On my Dell Latitude 5501, which has Intel UHD Graphics 630 and an NVIDIA GeForce MX150, I ran into a strange Ubuntu 24.04 desktop problem: `Xwayland` CPU usage would spike after login when launching heavy GUI applications such as Microsoft Edge or VSCode.

The spike usually lasted about 30 to 60 seconds. After that, the system became normal again. But the same delay came back after every reboot.

At first this looked like a Wayland or XWayland issue. In the end, the real cause was the graphics driver stack.

* TOC
{:toc}

## System Configuration

The laptop uses hybrid graphics:

```bash
Intel UHD Graphics 630 (i915)
NVIDIA GeForce MX150 (GP107M)
```

The initial driver state was:

```bash
Intel: i915 (active)
NVIDIA: nouveau (open-source driver)
```

No proprietary NVIDIA driver was installed:

```bash
dpkg -l | grep nvidia
# no output
```

The PRIME tools were also not installed:

```bash
prime-select
# command not found
```

So the system was running the Intel display path, while the NVIDIA GPU was present through the open-source `nouveau` driver.

## Problem

The symptom was very repeatable:

- `Xwayland` CPU usage became very high after login
- The spike appeared when launching Electron or Chromium based applications
- VSCode and Microsoft Edge were the easiest applications to reproduce it with
- The desktop temporarily slowed down
- After about 30 to 60 seconds, everything stabilized
- The problem came back after every reboot

Because the visible process was `Xwayland`, it was tempting to debug this as an XWayland problem directly. But the timing was suspicious: it happened during the first heavy GUI rendering event after startup, and then disappeared until the next boot.

That made it look more like a graphics stack warm-up problem.

## Investigation

The important findings were:

- The Intel GPU was correctly using `i915`
- The NVIDIA GPU was using `nouveau`
- The system had hybrid graphics, but no proprietary NVIDIA driver support
- XWayland became busy during the first heavy GUI application startup

Even though the Intel GPU was handling the display, the NVIDIA GPU still existed in the system. On a hybrid laptop, the graphics stack is not isolated to only the GPU driving the panel. Buffer handling, compositor initialization, EGL, DMA-BUF, and driver probing can still involve the broader GPU environment.

In this case, `nouveau` was not failing in an obvious way. There was no hard crash and no permanent performance issue. Instead, it caused a temporary startup penalty during early graphics-heavy application launches.

## Fix

Installing the proprietary NVIDIA driver fixed the problem:

```bash
sudo apt install nvidia-driver-580
```

After installing the driver, I rebooted the system.

That was all. I did not need to configure PRIME manually:

- No `prime-select` setup
- No manual NVIDIA offload configuration
- No compositor tuning
- No XWayland-specific workaround

## Result

After rebooting with the proprietary NVIDIA driver installed:

- The `Xwayland` CPU spike disappeared
- VSCode opened without the initial lag
- Microsoft Edge opened normally
- The desktop became responsive immediately after login
- The warm-up delay no longer returned after reboot

The practical difference was very obvious. Before the driver change, the first heavy GUI application after boot made the system feel temporarily stuck. After the driver change, application startup felt normal.

## Why This Worked

Installing the proprietary NVIDIA driver replaced the `nouveau` stack with the full NVIDIA driver stack.

That likely helped in several ways:

- More complete NVIDIA GPU initialization during boot
- Better integration with Wayland, EGL, and DMA-BUF
- More stable behavior in a hybrid Intel + NVIDIA environment
- Less compositor and XWayland synchronization overhead during the first heavy rendering event

The key point is that the NVIDIA GPU does not need to be the primary display GPU to affect desktop behavior. On a hybrid graphics laptop, an improperly initialized secondary GPU stack can still create latency or synchronization problems during GUI startup.

## Takeaway

If you are using Ubuntu 24.04 on an Intel + NVIDIA hybrid laptop and see this pattern:

- `Xwayland` CPU spikes after login
- The spike happens when first opening VSCode, Edge, or another Electron/Chromium app
- The system slows down for 30 to 60 seconds
- Everything becomes normal afterward
- The problem repeats after every reboot

then check which driver your NVIDIA GPU is using.

If it is using `nouveau`, installing the proprietary NVIDIA driver may stabilize the whole graphics pipeline, even if you are not explicitly rendering applications on the NVIDIA GPU.

For this machine, the command that fixed it was:

```bash
sudo apt install nvidia-driver-580
```
