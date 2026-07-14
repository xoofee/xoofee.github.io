---
title: "Fixing llvmpipe on Ubuntu Wayland with Intel + NVIDIA Hybrid Graphics"
date: 2026-07-14
permalink: /posts/2026/07/fix-llvmpipe-ubuntu-wayland-hybrid-graphics/
categories: tech
tags: [ubuntu, wayland, xwayland, llvmpipe, intel, nvidia, hybrid-graphics, linux]
excerpt: "How I diagnosed a misleading llvmpipe report on Ubuntu Wayland and fixed the real Xwayland/GLX fallback by updating Xwayland and Xorg core packages."
---

On my Ubuntu desktop, I noticed that OpenGL appeared to be using software rendering.

The first clue came from:

```bash
glxinfo -B
```

It reported:

```text
OpenGL renderer string: llvmpipe
Accelerated: no
```

At first glance, this looked serious. `llvmpipe` means Mesa is rendering on the CPU instead of using a real GPU.

But in this case, the result was a little misleading.

* TOC
{:toc}

## System Setup

This machine is an Intel + NVIDIA hybrid graphics laptop:

```text
Intel UHD Graphics 630
NVIDIA GeForce MX150
```

The desktop session was GNOME on Wayland.

That detail matters because `glxinfo -B` usually checks the X11/GLX path. In a Wayland session, that means it is mostly testing `Xwayland`, the compatibility layer used by old X11 applications.

So `glxinfo -B` showing `llvmpipe` does not automatically prove that the whole Wayland desktop is using software rendering. It may only mean the Xwayland/GLX path is broken.

## Checking Native Wayland

To check the native Wayland graphics path, I ran:

```bash
glmark2-wayland
```

The result was good:

```text
GL_VENDOR:      Intel
GL_RENDERER:    Mesa Intel(R) UHD Graphics 630 (CFL GT2)
```

That changed the diagnosis. Native Wayland applications were already using the Intel GPU correctly.

The real problem was narrower:

- GNOME Wayland itself was hardware accelerated
- Native Wayland applications were using Intel graphics
- Xwayland/GLX applications were falling back to `llvmpipe`

So the issue was not "the whole desktop is software rendered." It was "the Xwayland GLX path is software rendered."

## Fix

The fix was to update Xwayland and the related Xorg core packages:

```bash
sudo apt install xwayland xserver-xorg-core
```

This upgraded only a small group of display-server packages:

```text
xserver-common
xserver-xephyr
xserver-xorg-core
xserver-xorg-legacy
xwayland
```

After installing those updates, I rebooted.

After rebooting, `glxinfo -B` no longer reported `llvmpipe`. The Xwayland/GLX path was using hardware acceleration again.

## NVIDIA PRIME Offload

I also tested NVIDIA PRIME render offload for GLX/X11 applications:

```bash
__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia glxinfo -B
```

This worked. It reported:

```text
OpenGL vendor string: NVIDIA Corporation
OpenGL renderer string: NVIDIA GeForce MX150/PCIe/SSE2
```

So NVIDIA offload was working for GLX/X11 applications.

## Native Wayland Offload

Forcing NVIDIA for native Wayland/EGL applications was not as straightforward.

This command still used Intel:

```bash
__NV_PRIME_RENDER_OFFLOAD=1 glmark2-wayland
```

I also tried a stronger EGL vendor override:

```bash
__NV_PRIME_RENDER_OFFLOAD=1 \
__EGL_VENDOR_LIBRARY_FILENAMES=/usr/share/glvnd/egl_vendor.d/10_nvidia.json \
glmark2-wayland
```

That failed with:

```text
eglGetDisplay() failed
```

So I decided not to use that override. It was not needed for the desktop, and it made native Wayland testing worse instead of better.

## Takeaway

The final state was:

- The main GNOME Wayland desktop was already hardware accelerated
- `glxinfo -B` showing `llvmpipe` only meant the Xwayland/GLX path was broken
- Updating `xwayland` and `xserver-xorg-core`, then rebooting, fixed the Xwayland issue
- NVIDIA PRIME offload worked for GLX/X11 applications
- For this hybrid laptop, `prime-select on-demand` remained the best setup

That setup keeps Intel driving the desktop while using NVIDIA only for selected heavy applications.

The main lesson is to test both paths separately. On a Wayland desktop, `glxinfo -B` is not enough by itself. Use a native Wayland test such as `glmark2-wayland` before concluding that the whole desktop is falling back to software rendering.
