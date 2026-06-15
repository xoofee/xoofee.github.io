---
title: "BLE Random Address Type Bits"
date: 2026-06-15
permalink: /posts/2026/06/ble-random-address-type-bits/
categories: tech
tags: [bluetooth, ble, address]
excerpt: "BLE random device addresses encode their address type in the two most significant bits of the random address."
---

BLE random device addresses use the two most significant bits of the random address to indicate the address type.

One easy way to remember it is to look at the top two bits of the most significant byte.

* TOC
{:toc}

## Address type bits

| Type | Top bits | Hex range of the most significant byte |
| --- | --- | --- |
| Non-resolvable private address | `00xxxxxx` | `0x00` - `0x3F` |
| Resolvable private address | `01xxxxxx` | `0x40` - `0x7F` |
| Reserved | `10xxxxxx` | `0x80` - `0xBF` |
| Static random address | `11xxxxxx` | `0xC0` - `0xFF` |

## Byte order note

The table is about the most significant byte of the 48-bit random address.

This matters because Bluetooth addresses are often printed in human-readable order, for example:

```text
C2:34:56:78:9A:BC
```

In that representation, `C2` is the most significant byte, so the top bits are `11` and the address is a static random address.

In code, however, addresses are often stored little-endian in a six-byte array. In that case the byte that contains these type bits may be the last byte of the array, not the first one printed.

## Quick check

If the most significant byte is:

- `0x23`, top bits are `00`, so it is a non-resolvable private address
- `0x5A`, top bits are `01`, so it is a resolvable private address
- `0x91`, top bits are `10`, so it is reserved
- `0xD4`, top bits are `11`, so it is a static random address

So the compact rule is:

```text
00 = non-resolvable private
01 = resolvable private
10 = reserved
11 = static random
```
