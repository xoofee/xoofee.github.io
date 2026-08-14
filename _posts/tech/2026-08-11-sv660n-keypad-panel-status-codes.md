---
title: "SV660N Keypad Panel Status Codes"
date: 2026-08-11
permalink: /posts/2026/08/sv660n-keypad-panel-status-codes/
categories: tech
tags: [sv660n, inovance, ethercat, igh, cia402, servo, stacker]
excerpt: "SV660N 5-digit keypad: decode _28ry / AL blink, and panel-as-read faults (E6200, E6400, EE083) mapped to CoE 0x603F/0x203F."
---

Quick reference for the 5‑digit LED keypad on **Inovance SV660N** (MS1 / EtherCAT), as used on this stacker.

All digit layout and blink timings below are from the **SV660N Advanced User Guide** (status indication / Figure 8‑2), not from guesswork. The [panel ↔ EtherCAT error map](#panel--ethercat-common-error-map) is maintained from the **SV660N Troubleshooting Guide** (fault tables → objects `0x603F` / `0x203F`) plus desk observations with IgH `ethercat`.

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
| **CSP** | Cyclic Synchronous Position | Mode **`8`**: master sends target position every cycle. Panel 3rd digit **`8`**. |
| **CSV** | Cyclic Synchronous Velocity | Mode **`9`**: master sends target velocity (`0x60FF`) every cycle. Panel 3rd digit **`9`** → composite **`_89rn`** when OP + running. |
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
| `9` | Cyclic synchronous velocity (**CSV**) |
| `A` | Cyclic synchronous torque (CST) |

Stacker bring-up: **CSP (`8`)** via `mode:=csp` (default); **CSV (`9`)** via `mode:=csv`. Panel 3rd digit tracks `0x6060` / `0x6061`.

## Ports CN3 / CN4

| Port | Role |
|---|---|
| **CN3** | EtherCAT **IN** (from master / previous slave) — PC cable here |
| **CN4** | EtherCAT **OUT** (to next slave) |

Link may also be shown via 1st-LED `-` segments (PORT0 / PORT1) as in the [digit map](#how-to-read-_28ry-official-digit-map).

## Fault blink (different from AL blink)

| Symptom | Meaning | Action |
|---|---|---|
| **All five digits blinking** + `E…` / warning | Fault or warning | Press **SET** to stop blink; fix cause; reset (`H0d.01=1` or FunIN.2 ALM‑RST / ROS `reset_fault`) |

Do **not** confuse with PREOP’s single **`2`** blinking at 400 ms (normal).

### How to read panel fault glyphs

The 7‑seg **dot is tiny** (especially when all five digits blink). What you actually read is a compact string:

| You read (panel) | Manual spelling | Rule |
|---|---|---|
| **`E6200`** | `E620.0` | `E` + group `620` + sub `0` |
| **`E6400`** | `E640.0` | same |
| **`EE083`** | `EE08.3` | `EE` + group `08` + sub `3` |

Tables below put **Panel (as read)** first so you can look up what your eye saw without hunting for the dot.

## Panel ↔ EtherCAT common error map

Use the keypad for the **glyph you see**, and IgH CoE / AL for the **machine-readable** view. Maintain this table when new faults show up on the stacker desk.

### Objects / CLI to read (common set)

| Source | What | Command / note |
|---|---|---|
| AL state + `E` flag | EtherCAT Application Layer | `ethercat slaves` / `ethercat slaves -v` |
| Kernel AL text | e.g. Invalid watchdog, No Sync | `journalctl -k \| grep -i EtherCAT` |
| `0x6041` | CiA402 **statusword** (bit3 = Fault) | `ethercat upload -p0 0x6041 0 --type uint16` |
| `0x603F` | CiA402 **Error code** (often shared by a fault family) | `ethercat upload -p0 0x603F 0 --type uint16` |
| `0x203F` | Inovance **Aux. Code** (disambiguates subcode) | `ethercat upload -p0 0x203F 0 --type uint32` |
| `0x1001` | Generic error register | `ethercat upload -p0 0x1001 0 --type uint8` |
| Keypad / H0b.34 | Same fault as panel; hex layout `sscc` (sub + code) | InoDriveShop / panel; not always needed if `0x203F` works |

Healthy OP example (this machine): `ethercat slaves` → `OP +`; `0x6041=0x1637` (Operation enabled); `0x603F=0`; `0x203F=0`.

**Encoding tip:** for EtherCAT group faults, Troubleshooting Guide maps:

| Manual | Panel (as read) | `0x603F` (family) | `0x203F` Aux. Code (subcode) |
|---|---|---|---|
| `EE08.n` | `EE08n` | `0x0E08` | `0xnE080E08` |
| `EE09.n` | `EE09n` | `0x6320` (most) | `0xnE090E09` |
| `EE10.n` | `EE10n` | `0x0E10` | `0xnE100E10` |

So panel **`EE083`** = manual **`EE08.3`** ⇒ **`0x603F = 0x0E08`**, **`0x203F = 0x3E080E08`**.

SDO upload needs a reachable mailbox (usually PREOP+). In OP it often still works; if upload fails, drop to PREOP or read after the fault is latched and link is back.

### Normal status (not faults)

| Panel (typical) | `ethercat slaves` | `0x6041` (state) | Notes |
|---|---|---|---|
| `_18ry` solid | *(empty / link down)* or slave gone | n/a or unreachable | Cable out → AL Init on panel; master may show no slaves |
| `_28ry` (`2` @ 400 ms) | `PREOP` | often Switch on disabled / Ready | Idle IgH + cable in |
| `_48ry` (`4` slow blink) | `SAFEOP` | transitional | During activate / DC bring-up |
| `_88ry` | `OP +` | Ready / Switched on | OP + **CSP**, not yet S‑ON |
| `_88rn` | `OP +` | **Operation enabled** (e.g. `0x1637`) | Target for **CSP** motion |
| `_89ry` | `OP +` | Ready / Switched on | OP + **CSV** (`0x6061=9`), not yet S‑ON |
| `_89rn` | `OP +` | **Operation enabled** | Target for **CSV** motion (`mode:=csv`) |

### EtherCAT / network faults

Values for `0x603F` / `0x203F` are from **SV660N Troubleshooting Guide**. “Desk hint” = what we see on the PC.

| Panel (as read) | Manual | Name | `0x603F` | `0x203F` Aux. | Desk / IgH hint | Seen? |
|---|---|---|---|---|---|---|
| **EE080** | EE08.0 | SYNC signal loss | `0x0E08` | `0x0E080E08` | Lost SYNC while OP | |
| **EE081** | EE08.1 | Network status switchover | `0x0E08` | `0x1E080E08` | OP drop while enabled (kill CM) | **Yes** |
| **EE083** | EE08.3 | Network cable improper | `0x0E08` | `0x3E080E08` | Link flap / empty slaves | **Yes** |
| **EE084** | EE08.4 | Data frame loss | `0x0E08` | `0x4E080E08` | Bad WC / EMC | |
| **EE085** | EE08.5 | Data frame transfer | `0x0E08` | `0x5E080E08` | Upstream invalid frame | |
| **EE086** | EE08.6 | Data update timeout | `0x0E08` | `0x6E080E08` | No PDO too long | |
| **EE093** | EE09.3 | Homing method setting | `0x6320` | `0x3E090E09` | Bad `0x6098` | |
| **EE095** | EE09.5 | PDO mapping limit | `0x6320` | `0x5E090E09` | Too many objects | |
| **EE101** | EE10.1 | SM2 setting | `0x0E10` | `0x1E100E10` | Bad RxPDO | |
| **EE102** | EE10.2 | SM3 config | `0x0E10` | `0x2E100E10` | Bad TxPDO | |
| **EE103** | EE10.3 | PDO watchdog setting | `0x0E10` | `0x3E100E10` | AL `0x001F` class | bring-up |
| **EE104** | EE10.4 | PLL / sync incomplete | `0x0E10` | `0x4E100E10` | AL `0x002D` class | bring-up |
| **EE11x** | EE11.x | ESI / EEPROM | `0x5530` / `0x0E11` | `0xnE110E11` | Wrong ESI | |
| **EE130** | EE13.0 | Sync period setting | `0x6320` | `0x0E130E13` | Cycle rejected | |
| **EE150** | EE15.0 | Excessive sync period | `0x0E15` | `0x0E150E15` | Period out of range | |

### Drive / motor thermal & overload

| Panel (as read) | Manual | Name | `0x603F` | `0x203F` Aux. | Desk / IgH hint | Seen? |
|---|---|---|---|---|---|---|
| **E6200** | E620.0 | Motor overload | `0x3230` | `0x06200620` | Accumulative motor heat; statusword Fault (e.g. `5816`); **wait ≥30 s** before reset; often after hard CSP demos / prior E640 | **Yes** — after `spin_bare_motor_demo2_…`; see note **d04** |
| **E6400** | E640.0 | IGBT over-temperature | `0x4210` | `0x06400640` | With `auto_fault_reset: true` → blink ↔ `_88rn` loop | **Yes** — note **d03** |
| **E6401** | E640.1 | Flywheel diode over-temp | `0x0640` | `0x16400640` | Same thermal family | |

AL-only failures (panel may still show `_28ry` / drop toward `_18ry` **without** an `E…` code):

| Panel / symptom | IgH observation | Usual cause on this desk |
|---|---|---|
| Stays `_28ry` or falls to `_18ry` | activate timeout; never `OP` | link flap, DC off when drive requires DC, bad PDO YAML |
| Brief unlink | `Slaves: 0`, `Rx frames: 0` | CN3 unplug / bad RJ45 — can escalate to **EE083** |

When filling a new row: record **panel as read** (no dot) → manual form → `0x6041` / `0x603F` / `0x203F` → one desk note.

## Everyday combinations on this machine

| You see (panel) | Decode | Expected? |
|---|---|---|
| `_18ry` solid | AL Init + CSP + ready | **Yes** with RJ45 unplugged |
| `_28ry` (`2` blinks ~400 ms) | AL PREOP + CSP + ready | **Yes** with cable in, Idle master |
| `_48ry` (`4` slow blink) | AL SAFEOP + mode + ready | During app activate |
| `_88ry` / `_88rn` (AL solid) | AL OP + **CSP** + ready/run | Target when CSP app is live (`mode:=csp`) |
| **`_89ry` / `_89rn`** | AL OP + **CSV** + ready/run | Target when CSV app is live (`mode:=csv`); 3rd digit **`9`**, not `8` |
| `nr` | Not ready | Check main power, STO1/STO2 = 24 V |
| All 5 flash + `E…` | Fault | Bad — see [error map](#panel--ethercat-common-error-map) |
| **`EE083`** | EE08.3 cable / link | Reseat CN3 |
| **`E6400`** ↔ `_88rn` ~3 s | E640.0 + auto fault reset | Stop launch; cool; **d03** |
| **`E6200`** blink | E620.0 motor overload | Wait ≥30 s; slower demos; **d04** |
| **`E6200` again ~5 s after ROS reset** | Latch cleared, I²t/re-enable still overloaded | Stop launch; cool longer; **d05** |
| Shaft jumps after `reset_fault` pulse | CSP catch-up (target ≠ actual) | Not a move cmd; see **d06** + `docs/cia402_csp.md` |
## References

1. **SV660N Series Servo Drive Advanced User Guide**
   - Mirror: [eec.by download](https://eec.by/downloads/1961/%D0%A0%D0%B0%D1%81%D1%88%D0%B8%D1%80%D0%B5%D0%BD%D0%BD%D0%BE%D0%B5-%D1%80%D1%83%D0%BA%D0%BE%D0%B2%D0%BE%D0%B4%D1%81%D1%82%D0%B2%D0%BE-%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F-SV660N.pdf)
   - **Digit map + blink timings:** status indication / Figure 8‑2 (communication connection status, communication status, servo mode, servo status)
   - Also §4.2.3 Status Display (`reset` / `nr` / `ry` / `rn`, modes `1–A`, AL `1/2/4/8`)

2. **SV660N Commissioning Guide** (keypad overview; fault = all five LEDs blink)
   - Mirror: [servotechnica.ru](https://servotechnica.ru/files/doc/documents/file-2489.pdf)

3. **SV660N Troubleshooting Guide** (fault/warning codes, reset; **Error Code `603Fh` / Aux. Code `203Fh` tables**)
   - Example: [mrosupply.com](https://documents.mrosupply.com/product_documents/64/86/6486865/SV660N_Troubleshooting_EN_B00_19011908_49lowVG.pdf)
   - H0b.34 fault log encoding; EE08 / EE10 families used in the [error map](#panel--ethercat-common-error-map)

4. Inovance portal: [inovance.com](https://www.inovance.com/)

Hardware on this project: **SV660NS2R8I** + **MS1H4-40B30CBA334R**, EtherCAT.
