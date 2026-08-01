---
title: "Free Disk Space by Cleaning Stale Snap Revisions on Ubuntu"
date: 2026-08-01
permalink: /posts/2026/08/free-disk-remove-stale-snapd-ubuntu/
categories: tech
tags: [ubuntu, snap, snapd, disk-space, cleanup, mesa, firmware-updater, linux]
excerpt: "How I reclaimed about 2.8 GB from /var/lib/snapd/snaps on Ubuntu 24.04 by removing disabled Snap revisions and unused GNOME platform snaps."
---

On Ubuntu 24.04, `/var/lib/snapd/snaps` quietly grew to about **3.5 GB**.

Most of that was not one orphaned file. It was Snap keeping old package revisions, plus heavy shared runtimes that desktop snaps depend on.

* TOC
{:toc}

## What Was Taking Space

A directory listing showed pairs of large snaps, for example:

```text
core22_2139.snap / core22_2411.snap
gnome-42-2204_247.snap / gnome-42-2204_263.snap
gnome-46-2404_153.snap / gnome-46-2404_164.snap
mesa-2404_1165.snap / mesa-2404_1839.snap
snapd_27406.snap / snapd_27591.snap
```

By default, Snap keeps **2 revisions** of each package so you can roll back after a bad update. That is useful, but expensive when the packages are 400–600 MB each.

The biggest duplicate cost was roughly:

| Snap | Old revision | New revision | Duplicate size |
| --- | --- | --- | --- |
| `gnome-46-2404` | 607M | 615M | ~607 MB |
| `gnome-42-2204` | 532M | 532M | ~532 MB |
| `mesa-2404` | 395M | 402M | ~395 MB |

## Clean Disabled Revisions

First, remove every **disabled** (non-active) revision while keeping the current ones:

```bash
sudo snap list --all | awk '/disabled/{print $1, $3}' | while read snapname revision; do
  sudo snap remove "$snapname" --revision="$revision"
done
```

That alone dropped the directory from about **3.5 GB** to about **1.9 GB**.

To limit future growth, keep Snap at the minimum retain count:

```bash
sudo snap set system refresh.retain=2
```

Snap does not allow retaining fewer than 2 revisions. Setting `2` means it will not keep a third copy around.

## Two GNOME Snaps Are Not Always Duplicates

After cleanup, both of these were still present:

```text
gnome-42-2204_263.snap
gnome-46-2404_164.snap
```

That is **not** two revisions of the same package. They are two different GNOME platform runtimes:

- `gnome-42-2204`: GNOME 42 stack for older snaps (Ubuntu 22.04 base)
- `gnome-46-2404`: GNOME 46 stack for newer snaps (Ubuntu 24.04 base)

Snap apps declare which runtime they need, so both can coexist.

Do not force-remove a platform snap without checking dependents first.

## Check Before Removing a Platform Snap

Use the snap name, not the filename with revision suffix:

```bash
# wrong
snap connections mesa-2404_1839

# right
snap connections gnome-42-2204
```

In this case, `gnome-42-2204` looked unused:

```text
Interface  Plug  Slot                         Notes
content    -     gnome-42-2204:gnome-42-2204  -
```

An empty `Plug` column means no installed snap is connected to it. That made removal safe:

```bash
sudo snap remove gnome-42-2204
```

After removing unused GNOME platform snaps as well, `/var/lib/snapd/snaps` dropped further to about **718 MB**.

If some older snap later needs `gnome-42-2204` again, `snapd` can re-download it automatically.

## What Remained, and What Is Still Useful

After cleanup, the remaining snaps looked like this:

```text
bare
core22
core24
firmware-updater
gtk-common-themes
mesa-2404
snapd
snapd-desktop-integration
snap-store
```

Firefox and Thunderbird had already been removed earlier, so most of the leftover Snap stack was infrastructure plus a few Ubuntu desktop utilities.

### `mesa-2404`

This is not an app you launch. It is a shared Mesa/OpenGL/Vulkan content snap for Ubuntu 24.04-based desktop snaps.

Checking connections:

```bash
snap connections mesa-2404
```

showed active GPU content plugs from:

- `firmware-updater`
- `snap-store`
- `snapd-desktop-integration`

So `mesa-2404` was still required for those GUI snaps. Removing it would risk broken or software-rendered Snap UIs.

The disconnected `kernel-gpu-2404` plug is normal on a regular Ubuntu desktop. Those systems talk to the host GPU through `/dev/dri` rather than a kernel snap.

### `firmware-updater`

This is Ubuntu's graphical frontend for hardware firmware updates. Under the hood it uses `fwupd` and LVFS for BIOS/UEFI, SSD, and peripheral firmware.

If you purge Snap entirely, you lose the GUI app, but firmware updates are still available via:

```bash
fwupdmgr get-updates
fwupdmgr update
```

## Optional: Remove Snap Completely

You can remove Snap thoroughly if you do not want it at all. On Ubuntu desktop, that also removes Snap-only apps such as `snap-store` and `firmware-updater`.

A careful sequence:

```bash
# 1. Remove installed snaps first
sudo snap list | awk 'NR>1 {print $1}' | while read snapname; do
  sudo snap remove --purge "$snapname"
done

# 2. Stop services
sudo systemctl stop snapd.service snapd.socket snapd.seeded.service
sudo systemctl disable snapd.service snapd.socket snapd.seeded.service

# 3. Purge the package
sudo apt purge -y snapd

# 4. Delete leftovers
sudo rm -rf /var/cache/snapd/ /var/lib/snapd/ /snap
rm -rf ~/snap

# 5. Prevent automatic reinstall
printf 'Package: snapd\nPin: release *\nPin-Priority: -10\n' | sudo tee /etc/apt/preferences.d/nosnapd
```

Then replace anything you still need with APT or Flatpak. For firmware updates, keep using `fwupdmgr`.

In this case I did **not** purge Snap completely. Cleaning disabled revisions and unused platform snaps was enough.

## Result

| Stage | Approx. size of `/var/lib/snapd/snaps` |
| --- | --- |
| Before | 3.5 GB |
| After removing disabled revisions | 1.9 GB |
| After removing unused GNOME platform snaps | 718 MB |

About **2.8 GB** came back without removing the useful pieces that remaining Snap apps still depend on.

## Checklist

1. Inspect `/var/lib/snapd/snaps`
2. Remove disabled revisions with `snap remove --revision=...`
3. Set `refresh.retain=2`
4. Distinguish old revisions from different major platform snaps
5. Use `snap connections <name>` before removing shared runtimes
6. Keep `mesa-2404` if GUI snaps still plug into it
7. Keep `firmware-updater`, or fall back to `fwupdmgr`
8. Only purge `snapd` if you are ready to replace Snap-only apps
