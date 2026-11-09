---
title: "Update BLE Advertising Data with btmgmt"
date: 2026-11-09
permalink: /posts/2026/11/update-ble-advertising-data-btmgmt/
categories: tech
tags: [bluetooth, ble, linux, bluez]
excerpt: "Use btmgmt to create a BLE advertising instance, understand its payload bytes, and update an existing instance without removing it first."
---

`btmgmt` can configure BLE advertising from a Linux terminal. The important distinction is between adding an advertising instance and changing its data: repeatedly removing and re-adding an instance creates avoidable advertising gaps. Reuse the same instance ID to update its configuration, while remembering that a controller may still pause or reconfigure advertising during an update.

* TOC
{:toc}

## Add a one-time test advertisement

The following example advertises the text `TEST-42` as manufacturer-specific data. Replace `4D00` with a company identifier appropriate for your use. The example bytes use little-endian order for the 16-bit company identifier.

```bash
sudo btmgmt -i 0 add-adv -c -g -d "0AFF4D00544553542D3432" 1
```

Here `-i 0` selects controller index 0, `-c` requests connectable advertising, `-g` requests general discoverability, and the final `1` is the advertising instance ID.

The advertising data is a sequence of bytes:

```text
0A FF 4D 00 54 45 53 54 2D 34 32
│  │  └─────┘ └─────────────────┘
│  │  company       ASCII data
│  │  identifier     TEST-42
│  manufacturer-specific data type
└─ number of following bytes in this AD structure
```

`0A` is the number of bytes after the length field: one type byte, two company-identifier bytes and seven text bytes. The flags requested by `-g` are managed by BlueZ and are not included in this supplied data field.

To stop the instance:

```bash
sudo btmgmt -i 0 rm-adv 1
```

## Update a changing counter

The Management API defines adding an already existing advertising instance as an update to that instance's configuration. Therefore, call `add-adv` again with the same instance ID; do not remove it before every update.

This Bash loop changes a 16-bit counter from `0000` through `FFFF` and then starts over. The two counter bytes are big-endian in this example.

```bash
counter=0

while true; do
    hex=$(printf '%04X' "$counter")
    sudo btmgmt -i 0 add-adv -c -g -d "05FF4D00${hex}" 1 || break
    counter=$(((counter + 1) & 0xFFFF))
    sleep 0.5
done
```

The AD structure is `05 FF 4D 00 HH LL`: five bytes follow the length byte, consisting of the manufacturer-specific type, the two-byte company identifier and the two counter bytes. Android's manufacturer-data API removes the AD length, type and company identifier; an app may therefore show the identifier separately and encode the remaining counter bytes as Base64 or hexadecimal.

BlueZ documents re-adding an existing instance as updating it. It also notes that changing the instance while it is being advertised cancels that advertising instance and applies the change. With only one instance, the new configuration becomes visible right away, but this is not a guarantee of gap-free over-the-air transmission. The adapter, kernel and BlueZ version can affect the observed behavior. [BlueZ MGMT advertising commands](https://github.com/bluez/bluez/wiki/MGMT)

For a basic scan-rate check, a single stable advertisement is usually more useful than a rapidly changing payload. Count scan callbacks over a measured interval, and distinguish that callback rate from the advertiser's packet interval and the scanning application's UI refresh rate. Updating the payload every 500 ms does not mean packets are transmitted at 2 Hz.

## Interpret addresses and observations carefully

BLE devices can use random addresses, and an address can change even while the advertised data stays recognizable. If a scanner treats the address as the device identity, address rotation can make one physical advertiser appear as several sources. For repeatable tests, include a stable test identifier in manufacturer data and group observations by that identifier when the scanner supports it. Do not assume that every BLE address is a permanent hardware MAC address.

An observation counter in a scanner usually counts results delivered to the application, not every radio packet transmitted by the advertiser. Duplicate filtering, scan settings, radio conditions, operating-system callback delivery and UI polling can all affect the displayed count. Measure the counter over time, and use packet capture or controller-level diagnostics when you need to distinguish missed packets from delayed UI updates.

## Check the local command syntax

`btmgmt` syntax and supported advertising features vary across BlueZ versions and controllers. Check the local tool's help if an option is rejected:

```bash
btmgmt help
```

The Bluetooth controller must have LE enabled. A controller may reject payloads with malformed AD lengths or unsupported advertising flags. If an add command fails with `Invalid Parameters`, verify the byte count first: each AD structure's length byte counts the following type and data bytes, but does not count itself.
