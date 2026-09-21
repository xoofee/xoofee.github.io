---
title: "Fix Waydroid ARM Apps Freezing at 1000% CPU: Switch from Houdini to libndk"
date: 2026-09-10
permalink: /posts/2026/09/fix-waydroid-arm-apps-high-cpu-libndk/
categories: tech
tags: [waydroid, android, ubuntu, linux, houdini, libndk, troubleshooting]
excerpt: "ARM apps in Waydroid became unusable with 1000–1200% CPU usage. Replacing Houdini with libndk restored normal operation on my Intel machine."
---

Several ARM Android apps in Waydroid started freezing and using **1000–1200% CPU** on my Ubuntu machine. Restarting sometimes helped, but eventually the problem became frequent enough to make Waydroid unusable.

The fix that worked for me was **uninstalling Houdini and installing libndk with the Android 13 option**. After the switch, the affected apps worked again. I stopped investigating Houdini at that point: my priority was getting a usable Android environment back.

* TOC
{:toc}

## Environment and Symptoms

My setup was:

- Ubuntu 24.04 on an Intel Core i7-9850H, with 12 logical CPUs.
- Waydroid 1.6.2.
- Android 13, API 33, LineageOS 20 VANILLA images.
- Houdini `14.0.0_z.GoogleGame_com1.2`, installed through `waydroid_script`.

Waydroid had worked for a while after installation. After a few weeks, ARM apps would frequently get stuck. On one occasion, I could use it for about 30–60 minutes before it became unusable again.

This affected multiple unrelated apps. It was also easy to miss when checking an app in the background: CPU usage could look low until I brought it to the foreground.

On Linux tools that count 100% per logical CPU, 1200% means approximately all 12 logical CPUs are busy. One reproduced failure averaged about 1168%, with roughly 911% spent in kernel time.

## Replace Houdini with libndk

These steps use the community [Waydroid Extras Script](https://github.com/casualsnek/waydroid_script), which is also listed in [Waydroid's community projects](https://docs.waydro.id/faq/community-projects-we-like).

The instructions below are for **Android 13**. Check your Android version while Waydroid is running:

```bash
sudo waydroid shell -- getprop ro.build.version.release
sudo waydroid shell -- getprop ro.build.version.sdk
```

My results were `13` and `33`.

### Prepare the Installer

If you already have the script and its Python environment, use that directory and skip this setup:

```bash
sudo apt install git python3-venv lzip

git clone https://github.com/casualsnek/waydroid_script.git
cd waydroid_script
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

An existing environment created with `virtualenv venv` also works; there is no need to recreate it just for this switch.

### Stop Waydroid and Keep a Backup

```bash
waydroid session stop
sudo systemctl stop waydroid-container

wd_backup=$(mktemp -d /var/tmp/waydroid-before-libndk.XXXXXX)
sudo tar -C /var/lib/waydroid -cpf "$wd_backup/backup.tar" \
  overlay waydroid.cfg
echo "Backup: $wd_backup/backup.tar"
```

Keep the printed backup path. This saves the custom overlay and configuration before replacing the translator; it is not a backup of Android app data.

### Remove Houdini, Then Install libndk

From the `waydroid_script` directory:

```bash
sudo venv/bin/python3 main.py -a 13 uninstall libhoudini
sudo venv/bin/python3 main.py -a 13 install libndk

# for a reverse
sudo venv/bin/python3 main.py -a 13 uninstall libndk
sudo venv/bin/python3 main.py -a 13 install libhoudini
```

If either command fails, resolve that error before continuing. Remove Houdini first because the installers use overlapping ARM library directories. Installing both on top of each other is not a useful comparison.

Once installation succeeds:

```bash
sudo systemctl start waydroid-container
waydroid show-full-ui
```

This procedure replaces the translator without wiping installed apps or their data.

### Verify the Active Translator

After Android boots, run this in another terminal:

```bash
sudo waydroid shell -- getprop ro.dalvik.vm.native.bridge
```

The expected result is:

```text
libndk_translation.so
```

Open the apps that previously froze and check responsiveness and CPU usage. Because my failures could appear after 30–60 minutes, a longer session is a better check than a successful launch alone.

## What Did Not Fix My Problem

Before changing translators, I tried:

- Reinstalling the same Houdini bundle.
- Starting with fresh Android `/data`.
- Booting an older installed Ubuntu kernel.
- Rebuilding the overlay and resetting `overlay_rw` and `overlay_work`.
- Adding the missing ARM CPU-information file mentioned in a native-bridge warning.

None resolved the problem. The CPU-information change removed a warning but did not fix the high CPU usage.

I also suspected damaged files. Read-only filesystem checks of both Android images passed, and the installed Houdini libraries matched the downloaded bundle. Those checks did not point to file corruption.

## What the Evidence Actually Showed

Tracing two affected apps showed hot threads repeatedly calling `sched_yield()` from the same location inside `libhoudini.so`. This identified a busy-wait loop in the translator's execution path, but did not establish what triggered it.

The different version numbers were another suspicion: Android was 13, while the Houdini bundle came from an Android 14 image. However, the community installer explicitly selected that bundle for its Android 13 option. The numbers alone did not prove a compatibility problem.

I did not determine the underlying Houdini bug. What I could confirm was that **switching to libndk restored normal operation on this Intel machine**. For someone facing the same symptoms, that is the practical result worth sharing before spending more time on repeated resets and reinstalls.
