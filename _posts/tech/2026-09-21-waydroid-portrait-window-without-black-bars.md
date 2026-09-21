---
title: "Waydroid Portrait Windows Without Black Bars"
date: 2026-09-21
permalink: /posts/2026/09/waydroid-portrait-window-without-black-bars/
categories: tech
tags: [waydroid, android, ubuntu, linux, gnome, wayland]
excerpt: "A Waydroid portrait display and a portrait Ubuntu window are different things. Use the right property for each layer."
---

I wanted to run a portrait Android app in a narrow window on the left side of an Ubuntu desktop. The first attempt produced a portrait-sized Android canvas in the middle of a fullscreen Waydroid surface, with large black areas on both sides.

The mistake was changing the wrong display layer.

* TOC
{:toc}

## Two different sizes

There are two independent objects involved:

| Setting | Controls | Typical symptom |
| --- | --- | --- |
| Android `wm size` | The logical display seen by Android apps | Portrait content with black margins inside a larger Waydroid surface |
| Waydroid `persist.waydroid.width` and `height` | The Wayland/desktop surface size | A genuinely smaller Waydroid window that can be moved or tiled |

This command changes Android's internal display only:

```bash
sudo waydroid shell -- wm size 600x1000
```

It does not tell Ubuntu to create a 600×1000 window. If the host surface remains fullscreen, Android renders its 600×1000 logical display inside that larger surface.

## The correct setup

First remove any Android display override:

```bash
sudo waydroid shell -- wm size reset
sudo waydroid shell -- wm density reset
```

Set the Waydroid surface dimensions:

```bash
waydroid prop set persist.waydroid.width 600
waydroid prop set persist.waydroid.height 1000
waydroid prop set persist.waydroid.width_padding 0
waydroid prop set persist.waydroid.height_padding 0
```

`persist.waydroid.multi_windows` is optional. It changes Waydroid's desktop-integration behavior, but it is not required for a correctly sized portrait Waydroid window. A setup with `persist.waydroid.multi_windows=false` can work normally when the surface dimensions are set explicitly.

Restart the session so the compositor receives the new dimensions, then launch the app:

```bash
waydroid session stop
waydroid session start
waydroid app launch com.example.androidapp
```

Replace `com.example.androidapp` with the package you want to run. On GNOME, focus the resulting window and press `Super+Left` to tile it on the left side.

The important part is that Android stays at its physical display size while Waydroid changes the host surface. This avoids the black-bar effect.

## Verify which layer changed

Check the Android display:

```bash
sudo waydroid shell -- wm size
sudo waydroid shell -- wm density
```

The desired result is a physical size with no override, for example:

```text
Physical size: 1854x1048
Physical density: 213
```

Check the Waydroid host-window properties separately:

```bash
sudo waydroid shell -- getprop persist.waydroid.multi_windows
sudo waydroid shell -- getprop persist.waydroid.width
sudo waydroid shell -- getprop persist.waydroid.height
sudo waydroid shell -- getprop waydroid.display_width
sudo waydroid shell -- getprop waydroid.display_height
```

The width and height properties should report the requested window dimensions, while `waydroid.display_width` and `waydroid.display_height` should reflect the active Waydroid surface after the session restarts. `persist.waydroid.multi_windows` may be either `true` or `false`; it is not the setting that determines the portrait dimensions.

## A misleading connection with ARM translators

Switching between Houdini and `libndk_translation` can appear to change the window layout because the installer stops or upgrades Waydroid and causes a new session to be created. That is a lifecycle side effect, not evidence that the translator selected the window dimensions.

The same distinction matters when diagnosing an app that freezes under translation. Keep the Android display override reset, configure the host surface independently, and change only one runtime variable at a time.

## The general lesson

When an Android app appears as a portrait rectangle surrounded by black space, do not immediately keep changing Android's `wm size`. First ask which layer owns the unwanted space:

1. Android's logical display size;
2. Waydroid's host surface size; or
3. the desktop compositor's window placement.

For a portrait Ubuntu window, use Waydroid's `width` and `height` properties, leave Android's display at its physical size, and let GNOME position the resulting surface.

For more Waydroid properties, see the [Waydroid property options](https://github.com/waydroid/docs/blob/master/usage/waydroid-prop-options.md). If separate desktop application windows are desired, the [official multi-window guidance](https://docs.waydro.id/usage/install-on-desktops#launch-waydroid-in-multi-window-mode) covers that optional mode.
