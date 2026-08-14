---
title: "Set Dell Battery Charge Limits on Linux with smbios-battery-ctl"
date: 2026-08-14
permalink: /posts/2026/08/dell-battery-charge-limit-linux-smbios/
categories: tech
tags: [linux, ubuntu, dell, battery, smbios]
excerpt: "Cap a Dell laptop battery at 50%–80% from the Linux CLI. smbios-battery-ctl writes the thresholds to the EC, so they survive reboot, sleep, and power-off."
---

Lithium-ion batteries degrade faster when they sit at 100%, especially if the laptop stays plugged in. On a Dell machine, the practical fix is a charge window: stop at **80%**, resume only after it drops below **50%**.

Dell's `smbios-battery-ctl` writes those thresholds to the Embedded Controller (EC). Unlike a userspace daemon, the limit stays in effect across reboot, sleep, hibernation, and even while the machine is powered off and still on AC.

* TOC
{:toc}

## Install smbios-utils

Ubuntu / Debian:

```bash
sudo apt install smbios-utils
```

Fedora / RHEL:

```bash
sudo dnf install libsmbios
```

Arch:

```bash
sudo pacman -S libsmbios
```

## Set the 50%–80% window

Switch the charging profile to custom, then set the start and stop percentages:

```bash
sudo smbios-battery-ctl --set-charging-mode=custom
sudo smbios-battery-ctl --set-custom-charge-interval 50 80
```

Dell BIOS rules: start must be at least 50%, and stop must be at least 5% above start.

## Verify

```bash
sudo smbios-battery-ctl --get-charging-cfg
```

Expected output:

```text
Charging mode: custom
Charging interval: (50, 80)
```

If that interval shows up, the EC has the new limits. No extra service or reboot is required.
