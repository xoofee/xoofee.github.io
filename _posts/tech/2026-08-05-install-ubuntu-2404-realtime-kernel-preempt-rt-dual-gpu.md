---
title: "How to Install Ubuntu 24.04 Real-Time Kernel (PREEMPT_RT) on a Dual-GPU Laptop"
date: 2026-08-05
permalink: /posts/2026/08/install-ubuntu-2404-realtime-kernel-preempt-rt-dual-gpu/
categories: tech
tags: [ubuntu, realtime, preempt-rt, nvidia, dkms, ethercat, robotics, linux, hybrid-graphics]
excerpt: "Install ubuntu-realtime on Ubuntu 24.04 with Intel + NVIDIA hybrid graphics: why apt stalls at 2%, why NVIDIA DKMS fails against PREEMPT_RT, how to finish dpkg, and how to restore nvidia-smi on the generic kernel only."
---

Installing the official Ubuntu real-time kernel (`ubuntu-realtime`) on Ubuntu 24.04 LTS for low-latency work—such as $1\text{ kHz}$ EtherCAT motor control or robotics—is straightforward, but it often hits a severe snag on laptops with NVIDIA graphics.

During installation, `dpkg` invokes DKMS to compile proprietary NVIDIA kernel modules against the new `PREEMPT_RT` kernel. Proprietary drivers (for example `nvidia-driver-580`) frequently fail to build against hard real-time kernel headers, so `apt` exits with status 11 and leaves `dpkg` broken.

This post covers the full install path, why the progress bar sits at 2%, how to bypass the DKMS failure, and how to bring NVIDIA back on the **generic** kernel without installing it on the realtime kernel.

* TOC
{:toc}

## Prerequisites

* **OS:** Ubuntu 24.04 LTS (Noble Numbat)
* **GPU setup:** Integrated GPU (e.g. Intel UHD Graphics) plus a discrete NVIDIA GPU

## Step 1: Install `ubuntu-realtime` from Main Repositories

On Ubuntu 24.04 LTS, the real-time kernel packages are in the standard archives. No Ubuntu Pro subscription is required:

```bash
# 1. Update package lists
sudo apt update

# 2. Install the real-time kernel metapackage
sudo apt install ubuntu-realtime
```

## Step 2: Why Installation Appears Stuck at 2%

During `apt install`, the progress bar may sit at `Progress: [ 2%]` for several minutes while extracting `linux-realtime-headers`.

* **Why it slows down:** Header packages contain roughly **40,000–50,000** tiny `.h` and `.c` files. Updating inode metadata and issuing synchronous disk writes (`fsync`) for each file creates a heavy I/O bottleneck—even on fast NVMe SSDs.
* **What to do:** Do not interrupt `apt` or kill the process. Let extraction finish.

## Step 3: Handling the NVIDIA DKMS Build Failure

If proprietary NVIDIA drivers are installed, the install typically stops with an error like:

```text
Error! Bad return status for module build on kernel: 6.8.1-1015-realtime (x86_64)
Consult /var/lib/dkms/nvidia/580.159.03/build/make.log for more information.
dkms autoinstall on 6.8.1-1015-realtime/x86_64 failed for nvidia(10)
run-parts: /etc/kernel/header_postinst.d/dkms exited with return code 11
dpkg: error processing package linux-headers-6.8.1-1015-realtime (--configure)
```

### Why This Happens

Real-time motion control usually runs on integrated graphics (e.g. Intel UHD) rather than the discrete GPU, to avoid System Management Interrupts (SMIs) that inject latency jitter. Ubuntu’s default post-install hooks still try to build DKMS modules for **every** installed kernel, so a failed NVIDIA build against `PREEMPT_RT` leaves `dpkg` locked.

### The Fix: Unbind DKMS and Finish `dpkg`

1. **Unregister the NVIDIA DKMS module build job:**

```bash
sudo dkms remove -m nvidia -v 580.159.03 --all
```

Replace `580.159.03` with the version shown in your error log.

`--all` removes built modules for **every** kernel—not only realtime. After this, `nvidia-smi` fails on both the generic and realtime kernels until you restore the generic build (Step 4).

2. **Resume and finalize the broken package setup:**

```bash
sudo dpkg --configure -a
```

`dpkg` can then configure `linux-image-realtime`, build the initramfs, and add the `PREEMPT_RT` GRUB entry without compiling the incompatible GPU modules.

## Step 4: Restore NVIDIA on the Generic Kernel Only

Boot (or stay on) the **generic** kernel—for example `6.8.0-134-generic`—and rebuild NVIDIA for that kernel alone. The driver source under `/usr/src/nvidia-*` is usually still present after `dkms remove`, so a plain DKMS install is enough; no `apt reinstall` of `nvidia-driver-*` is required.

```bash
uname -r   # confirm you are on *-generic, not *-realtime
sudo dkms install nvidia/580.159.03 -k $(uname -r)
```

Use the same version string as in the earlier error log (or `dkms status` / `/usr/src/nvidia-*`).

A successful install places modules under `/lib/modules/$(uname -r)/updates/dkms/` and may sign them with your MOK key. That does **not** load them into the currently running kernel, so `nvidia-smi` can still report:

```text
NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver.
```

until you reboot into the same generic kernel.

Do **not** run the same `dkms install` against a `*-realtime` `uname -r` if you want the realtime boot free of proprietary NVIDIA modules.

After reboot on generic:

```bash
nvidia-smi
dkms status
```

Verified on this machine: `nvidia-smi` works again on `*-generic`, and `dkms status` lists `nvidia` as installed for that generic kernel only.

## Step 5: Boot into the Real-Time Kernel

Reboot:

```bash
sudo reboot
```

1. At startup, hold **`Esc`** or **`Shift`** to open the GRUB menu.
2. Open **`Advanced options for Ubuntu`**.
3. Select **`Ubuntu, with Linux 6.8.x-xxxx-realtime`**.

On this boot, integrated graphics handle the display. Verified: `nvidia-smi` is unavailable on the realtime kernel when NVIDIA was never installed for that `uname -r`—the desired outcome for low-latency work.

## Step 6: Verify PREEMPT_RT and the Dual-Boot Split

After login on realtime:

```bash
uname -a
nvidia-smi
```

**Expected `uname` output:**

```text
Linux hostname 6.8.1-1015-realtime #16-Ubuntu SMP PREEMPT_RT Fri Jun 26 ... x86_64 GNU/Linux
```

When **`PREEMPT_RT`** appears in the kernel string, hard real-time preemption is active.

Final check after rebooting into each kernel once:

| Boot | `nvidia-smi` |
| --- | --- |
| `*-generic` | Works |
| `*-realtime` | Unavailable (no proprietary modules for this kernel) |

That split is intentional: use the generic kernel when you need the discrete GPU, and the realtime kernel for EtherCAT / motion control on the iGPU.

## Key Takeaways

1. **Patience on headers:** The 2% “freeze” during header extraction is inode-heavy I/O, not a lockup.
2. **Integrated graphics for RT:** EtherCAT, ROS 2 motion loops, and similar work should stay on the iGPU to avoid GPU-induced latency.
3. **Clean up DKMS hooks:** If DKMS blocks `dpkg`, `sudo dkms remove -m nvidia -v <version> --all` followed by `sudo dpkg --configure -a` finishes the real-time kernel install cleanly.
4. **Restore NVIDIA on generic only:** `--all` also drops the generic-kernel modules. Rebuild with `sudo dkms install nvidia/<version> -k $(uname -r)` while on `*-generic`, then reboot. Confirmed result: `nvidia-smi` OK on generic, unavailable on realtime.
