---
title: "SV660N Keypad Panel Status Codes"
date: 2026-08-11
permalink: /posts/2026/08/sv660n-keypad-panel-status-codes/
categories: tech
tags: [sv660n, inovance, ethercat, igh, cia402, servo, stacker]
excerpt: "Quick reference for the 5-digit LED keypad on Inovance SV660N (MS1 / EtherCAT): how to decode _28ry, AL blink rules, servo status, and everyday combinations on the stacker."
---

Quick reference for the 5‑digit LED keypad on **Inovance SV660N** (MS1 / EtherCAT), as used on this stacker.

All digit layout and blink timings below are from the **SV660N Advanced User Guide** (status indication / Figure 8‑2), not from guesswork.

* TOC
{:toc}

## How to read `_28ry` (official digit map)

The five LEDs show **several fields at once** (fixed positions). They do **not** time‑share / alternate full screens between `2` and `ry`.

```text
  LED:   [ 1st ] [ 2nd ] [ 3rd ] [ 4th ] [ 5th ]
  field:  link    AL     mode    ---- servo ----
  ex.:     _       2       8       r       y
```

| LED position | Meaning (manual) |
|---|---|
| **1st** | Physical link: segment `-` upper = PORT1 (CN4 OUT), lower = PORT0 (CN3 IN). Solid OFF = no PHY link; solid ON = link detected. |
| **2nd** | EtherCAT **AL** state: `1` / `2` / `4` / `8` |
| **3rd** | Control mode from `0x6060` (e.g. `8` = CSP) |
| **4th–5th** | Servo status: `ry` / `rn` / `nr` / … |

So what looks like **`_28ry`** is one composite readout:

| Glyph | Field | Meaning |
|---|---|---|
| `_` / `-` | link segments | often blank-looking on 7‑seg |
| **`2`** | AL | Pre-operational (**blinks** — see [AL blink rules](#official-al-digit-blink-rules)) |
| **`8`** | mode | Cyclic synchronous position (CSP) |
| **`ry`** | servo | Ready (waiting for S‑ON) |

Official spelling is **`ry`** (ready). On 7‑seg it is easy to misread as `rdy`.

Cross-check on the PC:

```bash
ethercat slaves -v    # State: INIT / PREOP / SAFEOP / OP
```

## Terminology

| Term | Full name | Plain meaning |
|---|---|---|
| **Master** | EtherCAT master | PC side that owns the bus (here: **IgH** + ROS `EthercatDriver`). |
| **Slave** | EtherCAT slave | Device on the bus (here: **SV660N**). Listed by `ethercat slaves`. |
| **AL** | Application Layer state | EtherCAT device state machine. Panel **2nd digit** and CLI words (`PREOP`, …) are the same AL. |
| **INIT** | AL Init | Early / no useful mailbox+PDO. Panel **`1`**, **solid**. Typical with cable unplugged. |
| **PREOP** | Pre-operational | SDO / network config available; no cyclic PDO yet. Panel **`2`**, **blinks 400 ms**. Normal with Idle IgH master. |
| **SAFEOP** | Safe-operational | SDO + TPDO; DC available. Panel **`4`**, special blink pattern. |
| **OP** | Operational | Full cyclic PDO. Panel **`8`**, **solid**. Target for motion. |
| **PDO** | Process Data Object | Cyclic realtime process data. |
| **SDO** | Service Data Object | Non-cyclic mailbox parameter access (PREOP setup). |
| **CoE** | CANopen over EtherCAT | Object-dictionary protocol used by SV660 (CiA402). |
| **EoE** | Ethernet over EtherCAT | Optional Ethernet tunnel; can contend with CoE on the mailbox if enabled in IgH. |
| **CiA402** | Drive profile | Standard servo objects / state machine (`0x6040` / `0x6041`, modes, …). |
| **S‑ON** | Servo ON | Enable; panel `ry` → **`rn`**. Over EtherCAT via CiA402 controlword. |
| **CSP** | Cyclic Synchronous Position | Mode **`8`**: master sends target position every cycle. |
| **DC** | Distributed Clocks | EtherCAT time sync; bad DC timing → sync / AL errors. |
| **IgH** | EtherLab EtherCAT Master | Kernel master (`/dev/EtherCAT0`, `ethercat` tool). |
| **Domain** | Process-data domain | Master PDO memory map for one cycle. |
| **WC** | Working counter | How many slaves answered the cyclic frame successfully. |

### AL ladder

```text
cable / power-up
    →  INIT (1)     solid on panel
    →  PREOP (2)    blinks 400 ms   ← Idle master + cable in
    →  SAFEOP (4)   slow blink pattern
    →  OP (8)       solid           ← motion app target
```

| Panel (2nd LED) | CLI (`ethercat slaves`) | AL name |
|---|---|---|
| `1` | `INIT` | Initialization |
| `2` | `PREOP` | Pre-operational |
| `4` | `SAFEOP` | Safe-operational |
| `8` | `OP` | Operational |

Servo status (`ry` / `rn`) is **independent** of AL: the drive can show `ry` already in PREOP; it becomes `rn` after S‑ON / CiA402 enable (usually with AL in OP for bus control).

## Official AL digit blink rules

From Advanced User Guide — **Communication status** (2nd LED):

| AL status | SDO | RPDO | TPDO | Keypad (2nd LED) |
|---|---|---|---|---|
| Init | No | No | No | **`1` solid ON** |
| Pre-Operational | Yes | No | No | **`2` blinking every 400 ms** |
| Safe-Operational | Yes | No | Yes | **`4` blinking every 1200 ms** (ON 200 ms / OFF 1000 ms) |
| Operational | Yes | Yes | Yes | **`8` solid ON** |

### Matches observed on this machine

| Cable | Display | Why (manual) |
|---|---|---|
| **Unplugged** | `_18ry`, **no blink** | AL=`1` Init → **solid**; mode=`8`; servo=`ry` |
| **Plugged** (IgH Idle) | `_28ry`, **only `2` blinks** | AL=`2` PREOP → **400 ms blink**; `8` and `ry` stay solid |

So the blink is **how PREOP (and SAFEOP) are drawn**, not a separate “bus activity” metaphor and not a full-screen carousel.

## Servo status (4th–5th LEDs)

| Display | Meaning | Notes (manual) |
|---|---|---|
| `Reset` | Initializing | After power-on / reset |
| `nr` | Not ready | e.g. control on, main circuit off / not ready |
| `ry` | Ready | Waiting for S‑ON |
| `rn` | Running | S‑ON active |

When motor speed ≠ 0 RPM, the manual says the trailing letter can blink:

- In PREOP/SAFEOP: `y` / `n` blink **at the same rate as** AL digit `2` / `4`
- In Init/OP: `y` / `n` blink at **2 Hz**

(At standstill ready/`ry`, you typically only notice the AL digit blink in PREOP.)

Also listed in §4.2.3: `reset` / `nr` / `ry` / `rn` for general status display.

## Control mode (3rd LED)

| Digit | Mode (`0x6060`) |
|---|---|
| `1` | Profile position |
| `3` | Profile velocity |
| `4` | Profile torque |
| `6` | Homing |
| `8` | Cyclic synchronous position (**CSP**) |
| `9` | Cyclic synchronous velocity (CSV) |
| `A` | Cyclic synchronous torque (CST) |

This stacker bring-up uses **CSP (`8`)** (`mode_of_operation: 8`).

## Ports CN3 / CN4

| Port | Role |
|---|---|
| **CN3** | EtherCAT **IN** (from master / previous slave) — PC cable here |
| **CN4** | EtherCAT **OUT** (to next slave) |

Link may also be shown via 1st-LED `-` segments (PORT0 / PORT1) as in the [digit map](#how-to-read-_28ry-official-digit-map).

## Fault blink (different from AL blink)

| Symptom | Meaning | Action |
|---|---|---|
| **All five digits blinking** + `E…` / warning | Fault or warning | Press **SET** to stop blink; fix cause; reset (`H0d.01=1` or FunIN.2 ALM‑RST) |

Do **not** confuse with PREOP’s single **`2`** blinking at 400 ms (normal).

## Everyday combinations on this machine

| You see | Decode | Expected? |
|---|---|---|
| `_18ry` solid | AL Init + CSP + ready | **Yes** with RJ45 unplugged |
| `_28ry` (`2` blinks ~400 ms) | AL PREOP + CSP + ready | **Yes** with cable in, Idle master |
| `_48ry` (`4` slow blink) | AL SAFEOP + CSP + ready | During app activate |
| `_88ry` / `…rn` (AL solid) | AL OP + CSP + ready/run | Target when CSP app is live |
| `nr` | Not ready | Check main power, STO1/STO2 = 24 V |
| All 5 flash + `E…` | Fault | Bad — see Troubleshooting Guide |

## References

1. **SV660N Series Servo Drive Advanced User Guide**
   - Mirror: [eec.by download](https://eec.by/downloads/1961/%D0%A0%D0%B0%D1%81%D1%88%D0%B8%D1%80%D0%B5%D0%BD%D0%BD%D0%BE%D0%B5-%D1%80%D1%83%D0%BA%D0%BE%D0%B2%D0%BE%D0%B4%D1%81%D1%82%D0%B2%D0%BE-%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F-SV660N.pdf)
   - **Digit map + blink timings:** status indication / Figure 8‑2 (communication connection status, communication status, servo mode, servo status)
   - Also §4.2.3 Status Display (`reset` / `nr` / `ry` / `rn`, modes `1–A`, AL `1/2/4/8`)

2. **SV660N Commissioning Guide** (keypad overview; fault = all five LEDs blink)
   - Mirror: [servotechnica.ru](https://servotechnica.ru/files/doc/documents/file-2489.pdf)

3. **SV660N Troubleshooting Guide** (fault/warning codes, reset)
   - Example: [mrosupply.com](https://documents.mrosupply.com/product_documents/64/86/6486865/SV660N_Troubleshooting_EN_B00_19011908_49lowVG.pdf)

4. Inovance portal: [inovance.com](https://www.inovance.com/)

Hardware on this project: **SV660NS2R8I** + **MS1H4-40B30CBA334R**, EtherCAT.
