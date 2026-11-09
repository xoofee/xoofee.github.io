---
title: "A 100 ms BLE Advertising Interval Can Produce 5 Android Scan Results per Second"
date: 2026-11-09
permalink: /posts/2026/11/ble-advertising-interval-android-scan-rate/
categories: tech
tags: [bluetooth, ble, android, linux, bluez]
excerpt: "A configured BLE advertising interval, Android scan callback rate, and graph refresh rate measure different parts of the pipeline."
---

A BLE advertiser configured for a 100 ms interval has a nominal rate of about 10 advertising events per second. An Android scanner may deliver fewer callbacks. A graph can update more slowly still. These are three different rates, and confusing them makes a working radio link look throttled.

* TOC
{:toc}

## Three rates in one BLE test

| Rate | What it measures | Example |
| --- | --- | --- |
| Advertising interval | Time between scheduled advertising events from the transmitter | 100 ms is nominally about 10 events per second |
| Scan callback rate | Results Android delivers to the application | A test may receive about 5 callbacks per second |
| UI or graph refresh rate | How often the application reads or redraws its data | A UI polling once per second can plot about one sample per second |

A callback rate of roughly 5 Hz does not, by itself, show that the transmitter is advertising every 200 ms. It shows that the scanner application received about five results per second during the measurement window. Radio reception, scan scheduling, filtering and operating-system delivery affect that count. Android describes `SCAN_MODE_LOW_LATENCY` as using the highest scan duty cycle; it does not promise one callback for every over-the-air advertising event. [Android `ScanSettings`](https://developer.android.com/reference/android/bluetooth/le/ScanSettings#SCAN_MODE_LOW_LATENCY) [Android `ScanCallback`](https://developer.android.com/reference/android/bluetooth/le/ScanCallback)

Legacy BLE advertising also adds a pseudo-random delay of 0 to 10 ms to each scheduled advertising interval. A 100 ms configuration therefore is not a perfectly metronomic packet schedule. [Bluetooth Core Specification, Link Layer](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-62/out/en/low-energy-controller/link-layer-specification.html)

## Configure the Linux legacy advertising default

The `btmgmt add-adv` command configures an advertising instance and its payload; it does not include an interval argument. For BlueZ's legacy advertising interface, the adapter defaults can be set in `/etc/bluetooth/main.conf`:

```ini
[LE]
MinAdvertisementInterval=0x00A0
MaxAdvertisementInterval=0x00A0
```

These values are expressed in 0.625 ms units: `0x00A0` is 160 slots, or 100 ms. BlueZ documents these settings as defaults for the legacy advertising interface, and notes that it loads them when the kernel supports the relevant management command. They are adapter defaults, so they can affect other legacy advertisements on that adapter. [BlueZ `main.conf`](https://github.com/bluez/bluez/blob/5.72/src/main.conf) [BlueZ MGMT documentation](https://github.com/bluez/bluez/wiki/MGMT)

After changing the file, restart BlueZ and start the advertisement again. Capture the setup with `btmon` already running. The useful evidence is the HCI `LE Set Advertising Parameters` command and its min/max interval fields. A value of `0x00A0` corresponds to 100 ms; `0x0800` corresponds to 1,280 ms.

This check matters because a tool can display a requested per-advertisement interval that the daemon, kernel or controller path does not actually apply. In one test, the tool showed a request for 100 ms while `btmon` showed the controller configured for 1,280 ms. After setting the legacy adapter defaults, the HCI command showed `100.000 msec (0x00A0)`. The HCI trace is stronger evidence of the controller configuration than the client-side display.

## Measure Android callback rate separately

Count callback invocations over a timed window. For example, if the callback counter increases by 50 over 10 seconds, the delivered scan-result rate was about 5 results per second:

```text
rate = (end_count - start_count) / elapsed_seconds
```

For more detail, record a monotonic timestamp such as `SystemClock.elapsedRealtimeNanos()` in each `ScanCallback.onScanResult()` call. This measures when Android delivered results to the app, not the exact transmission time of each radio packet. Use a BLE sniffer or controller-level capture when the over-the-air event schedule itself must be measured.

Be explicit about what the counter counts. It may count delivered results, including repeated reports of a device; it is not automatically a count of unique advertising events or a count of every packet sent on every advertising channel. The `ScanCallback` API reports advertisements found by the scanner, not a transmitter-side event log. [Android `ScanCallback`](https://developer.android.com/reference/android/bluetooth/le/ScanCallback)

## The graph can be slower than the scanner

An application can receive several Android callbacks between UI updates. If it polls a native status snapshot once per second and stores only the latest RSSI value per device during each refresh, the graph will add roughly one point per second even when callback counts rise by five or more in that second.

Keep callback accounting separate from graph sampling:

- Increment an observation counter in the scan callback so it reflects received reports.
- Timestamp each callback if rate and jitter matter.
- Update the graph at a deliberate display cadence, such as 5–10 frames per second, or decimate the data for a long time window.
- Preserve the raw count or samples if later analysis needs more detail than the displayed graph.

A low graph refresh rate does not necessarily mean BLE acquisition is being throttled. It may mean the UI is sampling a faster stream for display.

## Practical conclusion

Use `btmon` to confirm the transmitter's configured interval. Use timestamps in Android's callback to measure the result rate delivered to the app. Inspect the graph's sampling logic to learn its display rate. These measurements answer different questions; comparing them is how to locate a real loss or throttle in the pipeline.
