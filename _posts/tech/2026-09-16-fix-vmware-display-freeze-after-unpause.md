---
title: "VMware Freezes After Unpause: Disabling 3D Acceleration Fixed It"
date: 2026-09-16
permalink: /posts/2026/09/fix-vmware-display-freeze-after-unpause/
categories: tech
tags: [vmware, windows, linux, graphics, troubleshooting]
excerpt: "A Windows 10 guest appeared frozen after Unpause. Reopening Workstation restored its display, and disabling 3D acceleration made Pause and Unpause work normally again."
---

A Windows 10 virtual machine in VMware Workstation could pause, but its display appeared frozen after unpausing. **Disabling Accelerate 3D graphics fixed the problem on this machine.** After that change, the guest recovered normally from Pause without closing and reopening Workstation.

The useful diagnostic clue was that reopening the Workstation window, while leaving the VM running in the background, restored the display and input. That strongly pointed toward the console's display handling rather than a guest that had stopped executing altogether.

* TOC
{:toc}

## The Environment and Symptom

The affected setup used:

- VMware Workstation 26.0.1.
- A Linux host running a Wayland desktop, with VMware using XWayland.
- A Windows 10 guest with **Accelerate 3D graphics** enabled.
- Vulkan rendering and presentation, as reported by VMware's graphics log.

Pausing the VM worked. Unpausing it left the console looking frozen instead of returning to a usable Windows desktop.

## The Fix

1. Shut down Windows inside the VM and wait until the VM is powered off.
2. Open **VM Settings → Hardware → Display**.
3. Clear **Accelerate 3D graphics**.
4. Start the VM, then test **Pause → Unpause** again.

With this option disabled, Pause and Unpause worked normally in this setup. Reopening the Workstation window was no longer necessary.

This is a confirmed workaround for the affected configuration, not proof that all Windows guests or Linux hosts need this setting disabled.

## A Temporary Recovery Without Restarting Windows

Before changing the graphics setting, the following procedure also recovered the console:

1. Close the Workstation window.
2. When prompted, choose to **keep the VM running in the background**.
3. Reopen Workstation and return to the VM.

The guest display and input recovered. The VM did not need to be reset or powered off for this recovery.

This is useful when the frozen console prevents a normal shutdown: first recover the window, then shut down Windows cleanly before changing the display setting.

## What the Logs Showed

The VM log recorded both pause and unpause requests. Relevant message fragments included:

```text
VigorVMAutomationPause: pause = TRUE
SWBWindow: Window #0 validation failed: no valid host window or host surface.
VigorVMAutomationPause: pause = FALSE
MKSVmdb_X11GetAuth failed: gotError=1, ret = OK
```

After each Unpause request, the graphics log also recorded creation of a replacement display window. A read-only status query reported VMware Tools as running, and the host VM process was not in Linux's stopped state.

These observations alone do not prove that Windows was responsive. In particular, an authentication or window-validation message is not sufficient to identify the cause: the authentication message also appeared during startup. The stronger evidence came from the two practical tests:

- Recreating the Workstation window restored the existing guest session.
- Disabling 3D acceleration removed the Pause/Unpause symptom.

Together, these results implicate the accelerated console/display path. They do not establish whether the underlying defect belongs to VMware's overlay handling, rendering backend, graphics driver, or interaction with the desktop compositor.

A [Broadcom community discussion about a pause overlay remaining after Unpause](https://community.broadcom.com/vmware-cloud-foundation/discussion/pause-overlay-doesnt-go-away-on-unpause) describes a closely matching problem. The reporter observed it with 3D acceleration enabled and recovered by reopening Workstation while the VM continued running. That discussion also includes reports from X11 sessions, so Wayland alone is not a sufficient explanation.

## Pause Is Different From Suspend

Pause temporarily stops guest execution while retaining the running VM's state in host memory. It does not create the saved execution state needed to close the VM and resume it after a host restart.

Suspend saves the VM's execution state to disk so it can be resumed later. It is closer to hibernation in that respect, although VMware performs the save outside the guest operating system.

The absence of a suspend-to-disk operation during Pause was therefore expected. The fault here was that the console did not recover correctly after Unpause.

## What Disabling 3D Acceleration Changes

VMware's 3D acceleration lets supported guest graphics workloads use the host GPU instead of doing that rendering work on the CPU. See [Broadcom's explanation of hardware 3D acceleration](https://knowledge.broadcom.com/external/article/329348).

Disabling it can reduce graphics performance or limit applications that require accelerated graphics. The difference may be more noticeable in 3D applications and graphical interfaces than in ordinary text editing or other CPU- and storage-bound work.

For this VM, reliable Pause/Unpause behavior made disabling the option a useful tradeoff. For a graphics-heavy workload, compare the application's behavior with the option off; keeping acceleration enabled and using the window-reopen workaround may be preferable until a suitable fix is available.
