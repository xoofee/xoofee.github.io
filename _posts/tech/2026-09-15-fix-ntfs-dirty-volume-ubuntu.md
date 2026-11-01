---
title: "Fix an NTFS Dirty Volume That Won't Mount on Ubuntu"
date: 2026-09-15
permalink: /posts/2026/09/fix-ntfs-dirty-volume-ubuntu/
categories: tech
tags: [ubuntu, linux, ntfs, storage, troubleshooting]
excerpt: "Ubuntu's ntfs3 driver can refuse a volume that still carries the NTFS dirty flag, even after chkdsk reports no errors. Diagnose it safely and clear the flag with ntfsfix."
---

An NTFS partition can refuse to mount on Ubuntu even when Windows `chkdsk /f` reports no filesystem errors. In one such case, Ubuntu's kernel log still showed that the volume was marked dirty, and the in-kernel `ntfs3` driver refused to mount it. A read-only `ntfsfix` check could read the main NTFS metadata, but it did not clear the dirty flag.

This guide shows how to identify that specific condition and try the limited Ubuntu-side repair. It does not treat a successful metadata check as proof that every file or filesystem structure is healthy.

* TOC
{:toc}

## Confirm which partition is affected

Reconnectable disks can receive different device names, so identify the partition immediately before running a repair:

```bash
lsblk -o NAME,PATH,TRAN,SIZE,FSTYPE,LABEL,UUID,MOUNTPOINTS
```

Use the NTFS partition's current path in place of `/dev/sdXN` below. Check whether it is mounted:

```bash
findmnt --source /dev/sdXN
```

If it is mounted, close applications using it and unmount it before continuing. For a USB disk with other mounted partitions, be careful to unmount and repair only the intended NTFS partition.

## Read the kernel's reason for refusing the mount

After a failed mount, check the recent kernel log:

```bash
sudo dmesg --ctime | tail -n 40
```

The relevant message in this case was:

```text
ntfs3: sdXN: volume is dirty and "force" flag is not set!
```

That message identifies the dirty flag as the reason the `ntfs3` driver refused the mount. The generic `mount` error by itself is less informative. Do not use the `force` mount option as a repair: it bypasses the refusal without clearing the flag or checking why it was set.

## Run a no-write check

If `ntfsfix` is not installed, it is provided by the `ntfs-3g` package:

```bash
sudo apt install ntfs-3g
```

Run its no-action mode on the unmounted partition:

```bash
sudo ntfsfix -n /dev/sdXN
```

The `-n` option does not write repairs. Output saying that the MFT and MFT mirror were processed, the alternate boot sector is OK, and the volume was processed successfully is reassuring for those checks. It does not clear the volume's dirty flag, so `ntfs3` may continue to refuse the mount.

If the command reports I/O errors or metadata problems it cannot handle, stop and investigate those first. For important data, prioritize making a backup or disk image before changing filesystem metadata.

## Clear the dirty flag with ntfsfix

If the Windows check completed, `ntfsfix -n` reported no errors, and the kernel specifically reports a dirty volume, try the write operation on the unmounted partition:

```bash
sudo ntfsfix -d /dev/sdXN
```

The `-d` option clears the dirty flag if the volume can be fixed and mounted. It changes filesystem metadata. `ntfsfix` is limited: it handles some fundamental NTFS inconsistencies and can reset the NTFS journal, but it is not a Linux replacement for a full Windows `chkdsk` check. [Ubuntu `ntfsfix` manual](https://manpages.ubuntu.com/manpages/resolute/man8/ntfsfix.8.html)

If it completes successfully, retry mounting the partition:

```bash
sudo mkdir -p /mnt/ntfs-data
sudo mount -t ntfs3 /dev/sdXN /mnt/ntfs-data
```

Check whether it mounted:

```bash
findmnt --source /dev/sdXN
```

If mounting still fails, inspect the newest kernel messages. Do not repeatedly clear the flag without understanding a new error.

## When Windows reports no errors

A clean `chkdsk /f` result and a dirty-flag refusal from Linux are not necessarily contradictory. In this case, the Windows command reported no problems, while the Linux kernel continued to see the flag and block `ntfs3` mounting. The read-only `ntfsfix -n` check also completed successfully but left the state unchanged; the next Ubuntu-side step is `ntfsfix -d`.

If the flag returns, `ntfsfix -d` fails, or the disk reports I/O errors, stop using the partition for writes and investigate the drive and filesystem further. Clearing a flag is not a substitute for a complete filesystem check or a backup.
