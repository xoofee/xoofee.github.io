---
title: "Set Dell Battery Charge Limits on Linux with cctk"
date: 2026-08-14
permalink: /posts/2026/08/dell-battery-charge-limit-linux-smbios/
categories: tech
tags: [linux, ubuntu, dell, battery, cctk, latitude-5501, smbios]
excerpt: "On Dell Latitude 5501, smbios-battery-ctl can read charge limits but cannot set them. Use Dell Command | Configure (cctk) to write Custom:50-80 to the EC."
---

Lithium-ion batteries degrade faster when they sit at 100%, especially if the laptop stays plugged in. On a Dell machine, the practical fix is a charge window: stop at **80%**, resume only after it drops below **50%**.

On a **Dell Latitude 5501** (Ubuntu 24.04), `smbios-battery-ctl` looked like the right tool—but it only **reads**. Setting thresholds appeared to succeed and then silently did nothing. The working path is Dell Command | Configure (`cctk`), which talks to the low-level Dell driver (`/dev/dcdbas`) and commits limits to the Embedded Controller.

* TOC
{:toc}

## Why smbios-battery-ctl fails on Latitude 5501

Querying works:

```bash
sudo smbios-battery-ctl --get-charging-cfg
```

```text
Charging mode: custom
Charging interval: (50, 80)
```

Setting looks successful, then nothing changes:

```bash
sudo smbios-battery-ctl --set-custom-charge-interval 50 100
```

```text
Custom charge interval has been set to (50, 100)
```

```bash
sudo smbios-battery-ctl --get-charging-cfg
```

```text
Charging mode: custom
Charging interval: (50, 80)
```

`smbios-battery-ctl` writes via userspace SMBIOS WMI tokens in NVRAM. On this generation of Dell business laptops, the EC ignores those tokens unless the update goes through Dell's ring-0 ACPI path. So `libsmbios` is effectively read-only here.

## Install Dell Command | Configure (cctk)

Download **Dell Command | Configure Application** from Dell Support for the Latitude 5501:

[Latitude 15 5501 drivers](https://www.dell.com/support/product-details/en-bz/product/latitude-15-5501-laptop/drivers)

On that page, select:

```text
Dell Command | Configure Application
Recommended
30 Jan 2023
Systems Management
```

The package used here was:

```text
command-configure_4.10.0-595.ubuntu18_amd64.tar.gz
```

It is labeled for Ubuntu 18.04, but it works on Ubuntu 24.04.

Extract, then install the HAPI backend first, then Command | Configure:

```bash
cd /path/to/command-configure_ubuntu_amd64/
sudo apt install ./srvadmin-hapi_*_amd64.deb
sudo apt install ./command-configure_*_amd64.deb
```

### OpenSSL 1.1 on Ubuntu 22.04 / 24.04

If `cctk` fails looking for `libcrypto.so.1.1`:

```bash
wget http://security.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2.24_amd64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2.24_amd64.deb
```

### Optional PATH shortcut

The binary lands at `/opt/dell/dcc/cctk`:

```bash
sudo ln -s /opt/dell/dcc/cctk /usr/local/bin/cctk
```

## Set charge limits with cctk

The primary-battery option is `--PrimaryBattChargeCfg` (`Batt`, not `Battery`).

Check current setting:

```bash
sudo cctk --PrimaryBattChargeCfg
```

Set custom start/stop (50%–80%):

```bash
sudo cctk --PrimaryBattChargeCfg=Custom:50-80
```

If a BIOS setup password is set:

```bash
sudo cctk --PrimaryBattChargeCfg=Custom:50-80 --ValSetupPwd=YourPassword
```

For a full charge before travel:

```bash
sudo cctk --PrimaryBattChargeCfg=Standard
```

Other profiles: `Express`, `Adaptive`, `PrimAC`.

## Verify

```bash
sudo cctk --PrimaryBattChargeCfg
```

Expected:

```text
PrimaryBattChargeCfg=Custom:50-80
```

These settings commit to the EC and persist across reboot, dual-boot, and OS reinstall.
