---
title: "SV660N + MS1 from Scratch: EtherCAT, ROS 2, and a Smooth First Spin"
date: 2026-08-14
permalink: /posts/2026/08/sv660n-ms1-ethercat-ros2-spin-from-scratch/
categories: tech
tags: [sv660n, ms1, inovance, ethercat, igh, ros2, jazzy, cia402, csp, servo, newbie, stacker, preempt-rt]
excerpt: "Fresh Ubuntu 24.04 to a smooth SV660N/MS1 spin: wire the holding brake 24 V, build IgH with --disable-eoe, ROS 2 Jazzy + motor_drive, reach panel _88rn, run a soft CSP demo, and stop without EE081."
---

Complete desk path from a **fresh Ubuntu** machine plus an **Inovance SV660N** drive and **MS1** motor to a **smooth first spin**. Everything needed to succeed is in this post—commands, wiring, panel reading, and the mistakes that cost days on this desk.

* TOC
{:toc}

## What you will achieve

| Step | Target |
|---|---|
| Idle bus | Panel **`_28ry`**, `ethercat slaves` → **PREOP** |
| Enabled CSP | Panel **`_88rn`**, `0x6041 ≈ 0x1637`, `0x6061 = 8` |
| Motion | Soft CSP stream; shaft turns **smoothly** (no stair-steps / E6200) |
| Stop | **Ctrl+C** → PREOP, **`0x603F = 0`**, no **EE081** |

**Keep Sync0 / `ros2_control` at 100 Hz (10 ms).** Do not “upgrade” to 1 ms until you understand Write-cycle budget.

## Hardware this guide assumes

| Role | Exact model (this desk) |
|---|---|
| Drive | **SV660NS2R8I** |
| Motor | **MS1H4-40B30CBA334R** (brake variant — last digit family **4**) |
| Encoder | Absolute, **23-bit** → **8388608 counts / rev** |
| Bus | Dedicated Ethernet NIC → IgH master → drive EtherCAT **IN** |
| Host | Ubuntu **24.04**, **PREEMPT_RT** kernel, ROS 2 **Jazzy** |
| Software | Stacker `codes/ros2_ws` with Inovance YAML + `mode:=csp\|csv\|pp` (not bare upstream ICube alone) |

Software path used below:

```bash
# Desk machine often uses /work/stacker — elsewhere clone/checkout as ~/stacker
export STACKER=/work/stacker   # or: export STACKER=$HOME/stacker
export WS=$STACKER/codes/ros2_ws
```

## Safety

- Mount the motor **horizontal, bare shaft clear**. Keep hands/tools away once enabled.
- If STO / E-stop is wired, know how to cut power.
- After **E6200** / **E6400**: **stop motion, cool ≥ 30–60 s**, reset **once**. Do not spam **H0d.01**.
- Prefer **Ctrl+C** on the launch terminal. Avoid `kill -9` on `ros2_control_node` while the drive is in OP + enabled (latches **EE081**).
- Desk brake unlock = external **24 V always on** is OK for a **horizontal** axis. For a **vertical** axis you need timed BK via relay / drive DO so the shaft does not drop when disabled.

---

## 1. Bill of materials (beyond PC)

| Item | Notes |
|---|---|
| SV660N drive + mains cable | Rated for motor; PE connected |
| MS1 motor + power + encoder cables | Use **brake** power cable if motor has BK leads |
| EtherCAT patch cable | Master NIC → drive **CN3 (IN)** |
| Dedicated Ethernet NIC | Prefer a second NIC so LAN and EtherCAT are not the same port |
| **24 VDC PSU for holding brake** | See next subsection — **mandatory** on this motor |

### Holding brake electrical (do not skip)

This MS1 is a **brake** motor. **BK+/BK− unpowered = shaft mechanically locked.** Commanding CSP/CSV/PP against a locked brake looks like “stairs,” huge torque (`0x6077`), then **E6200**. Desk confirmation: after 24 V on the brake, CSP / CSV / PP all spin smoothly.

| Spec (MS1H4-40B30CB-A33\*R) | Value |
|---|---|
| Supply | **24 VDC ±10%** |
| Exciting current | **0.32 A** |
| Rated power | **7.6 W** |
| Coil resistance | ~**75.8 Ω ±7%** |
| Holding torque | **1.5 N·m** |
| Release / apply | ≤ 20 ms / ≤ 60 ms |

Desk PSU: **24 V**, ≥ **0.5 A**, preferably **dedicated** to the brake; cable ≥ **0.5 mm²**. Coil has **no polarity**.

- **Desk validation:** connect external 24 V directly to motor **BK+ / BK−** (always released while powered).
- **Production:** 24 V through a **relay** whose coil is driven by the drive’s BK digital output (drive DO is a weak signal — it does **not** replace the 24 V supply).

Datasheet sources: [MS1-R INT selection guide (EN)](https://inova.by/downloads/4184/MS1-R-INT.-Selection-Guide-(EN,-A00,-2025).PDF) (section MS1H4-40B30CB-A33\*R-INT), older [MS1 guide data code 19010786](https://htg-group.com.vn/wp-content/uploads/2021/05/MS1_Motor-Selection-Guide_EN_C00_20200602_19010786.pdf) §1.3.5.

**Verify before any ROS motion:** apply 24 V → hear/feel brake **release click**; with servo off you should not feel a hard lock (horizontal desk).

---

## 2. Hardware wiring checklist

```text
   Mains AC ──► SV660N (L/N/PE per label)
                    │
                    ├── U/V/W/PE ──► MS1 motor power
                    ├── CN2 ────────► encoder cable
                    ├── CN3 IN ◄──── EtherCAT NIC (master)
                    └── CN4 OUT     (unused on single-axis desk)

   External 24 VDC ──► motor BK+ / BK−   ← REQUIRED on …A334R
```

| Connection | Check |
|---|---|
| Mains + PE | Drive powers; keypad alive |
| Motor power | Phase order per cable; PE on |
| Encoder | CN2 seated; no bent pins |
| EtherCAT | PC → **CN3 IN** only (not OUT) |
| Brake 24 V | BK+/BK− powered; release click |

Power the drive. Until the PC master is up you may see Init/ready-style glyphs; after IgH Idle + cable you want **`_28ry`**-class idle (see panel section).

---

## 3. Panel literacy (enough to spin)

Five LEDs are **one composite** status (not five unrelated screens):

```text
  LED:   [ 1st ] [ 2nd ] [ 3rd ] [ 4th ] [ 5th ]
  field:  link    AL     mode    ---- servo ----
  ex.:     _       2       8       r       y     →  _28ry
```

| Position | Meaning |
|---|---|
| 1st | PHY link segments (can look blank) |
| **2nd** | EtherCAT **AL**: `1` Init, `2` PREOP, `4` SAFEOP, `8` OP |
| **3rd** | Mode: `8` CSP, `9` CSV, `1` PP |
| 4th–5th | `ry` ready / `rn` running (enabled) |

| You want | Meaning |
|---|---|
| **`_28ry`** | PREOP + CSP mode digit + ready — idle master OK |
| **`_88rn`** | OP + CSP + **enabled** — ready for CSP demos |
| **`_89rn`** | OP + CSV + enabled |
| **`_81rn`** | OP + PP + enabled |

**AL blink:** PREOP’s `2` blinks ~400 ms — **normal**. Fault is **all five digits blinking** with `E…` / `EE…`.

| Panel (as read) | Meaning | Typical CoE | What to do |
|---|---|---|---|
| **E6200** | Motor overload (I²t) | `0x603F=0x3230` | Stop, cool ≥30–60 s, reset once |
| **E6400** | IGBT over-temp | — | Stop, cool; do not re-enable hot |
| **EE081** | Network status switchover | `0x0E08` | Usually kill-in-OP; cool, H0d.01 once → want `28ry` |
| **EE150** | Excessive sync period | `0x0E15` | Sync0/jitter; stay at 100 Hz; fix RT later |

Keypad clear (when cool): **SET** → **H0d.01 = 1** (alarm reset). One shot.

Cross-check from PC (after IgH is installed):

```bash
ethercat slaves
ethercat upload -p0 0x6041 0 --type uint16   # statusword
ethercat upload -p0 0x603F 0 --type uint16   # error code (0 = ok)
ethercat upload -p0 0x6061 0 --type int8     # mode display
```

Healthy OP + enabled CSP example: slaves `OP +`, `0x6041≈0x1637`, `0x603F=0`, `0x6061=8`.

---

## 4. OS: Ubuntu 24.04 + realtime kernel

1. Install **Ubuntu 24.04 LTS** (Noble).
2. Install the realtime kernel:

```bash
sudo apt update
sudo apt install -y ubuntu-realtime
sudo reboot
```

3. Confirm:

```bash
uname -r
# must contain: realtime
```

### NVIDIA dual-GPU note (only if apt breaks)

On Intel + NVIDIA laptops, `ubuntu-realtime` often fails when DKMS tries to build proprietary NVIDIA modules against PREEMPT_RT. If `dpkg` is broken after that:

- Do **not** interrupt a long “2%” header extract — wait.
- After a NVIDIA DKMS failure: finish/fix `dpkg`, keep using the **realtime** kernel for EtherCAT; restore NVIDIA only on the **generic** kernel if you need the discrete GPU for other work.

(Longer NVIDIA/DKMS write-up: sibling post on this site about Ubuntu 24.04 PREEMPT_RT + dual GPU — optional.)

### Optional: isolate CPUs for the control thread

Not required for a first 100 Hz spin, but recommended on this desk:

```bash
sudo nano /etc/default/grub
# append to GRUB_CMDLINE_LINUX_DEFAULT:
#   isolcpus=2,3 nohz_full=2,3 rcu_nocbs=2,3
sudo update-grub
sudo reboot
cat /proc/cmdline | grep isolcpus
```

---

## 5. ROS 2 Jazzy and build tools

Use **system** Python for ROS (`which python3` should **not** be inside a project venv that shadows `ros2`).

```bash
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
  -o /usr/share/keyrings/ros-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" \
  | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null

sudo apt update

sudo apt install -y \
  build-essential cmake git pkg-config autoconf libtool \
  python3-pip python3-dev \
  python3-colcon-common-extensions python3-rosdep python3-vcstool \
  net-tools ethtool \
  ros-jazzy-desktop \
  ros-jazzy-ros2-control \
  ros-jazzy-ros2-controllers \
  ros-jazzy-hardware-interface \
  ros-jazzy-xacro

sudo rosdep init    # ok if it says already initialized
rosdep update

echo "source /opt/ros/jazzy/setup.bash" >> ~/.bashrc
source ~/.bashrc
ros2 --help | head
```

---

## 6. IgH EtherCAT master (**--disable-eoe** required)

SV660 CoE breaks if IgH is built **with EoE** (mailbox contention). Always configure with **`--disable-eoe`**.

### Dependencies

```bash
sudo apt install -y dkms linux-headers-$(uname -r)
```

### Build and install

```bash
cd ~
git clone https://gitlab.com/etherlab.org/ethercat.git
cd ethercat
./bootstrap
./configure --sysconfdir=/etc --disable-8139too --enable-generic --disable-eoe
make -j$(nproc)
make -j$(nproc) modules          # required — otherwise ec_master missing
sudo make modules_install install
sudo depmod -a
```

### Bind a NIC and permissions

Pick the **EtherCAT** interface (`ip link`), not your LAN if you have two NICs:

```bash
ip -br link
ETH_IFACE="eno1"   # <-- replace with your EtherCAT NIC

sudo cp -n /etc/sysconfig/ethercat /etc/sysconfig/ethercat.bak
sudo sed -i "s/MASTER0_DEVICE=\"\"/MASTER0_DEVICE=\"$ETH_IFACE\"/" /etc/sysconfig/ethercat
sudo sed -i 's/DEVICE_MODULES=""/DEVICE_MODULES="generic"/' /etc/sysconfig/ethercat

sudo tee /etc/udev/rules.d/99-EtherCAT.rules <<'EOF'
KERNEL=="EtherCAT[0-9]*", MODE="0666"
EOF
sudo udevadm control --reload-rules
sudo udevadm trigger

sudo /etc/init.d/ethercat start
ls -l /dev/EtherCAT0    # want crw-rw-rw-
ethercat slaves
# 0  0:0  PREOP  +  SV660_1Axis_...
```

Identity check:

```bash
ethercat slaves -v | head -40
# Vendor Id:    0x00100000
# Product code: 0x000c010d
```

### Realtime privileges for `ros2_control` (FIFO)

Without this, launch may warn `Could not enable FIFO RT scheduling policy` and at higher rates spawners time out even though the drive reaches OP.

```bash
# Replace YOUR_USER with your Linux login name
sudo tee /etc/security/limits.d/99-realtime-ros.conf <<EOF
YOUR_USER       -       rtprio          99
YOUR_USER       -       nice            -20
YOUR_USER       -       memlock         unlimited
EOF
```

**Log out and back in** (new session). Then:

```bash
ulimit -r    # must be 99
```

**Do not** `setcap cap_sys_nice=ep` on `ros2_control_node` — that breaks `LD_LIBRARY_PATH` and the node exits 127.

### One NIC for both Internet and EtherCAT

When you need apt/Internet on the same port:

```bash
sudo /etc/init.d/ethercat stop
sudo rmmod ec_generic ec_master 2>/dev/null || true
sudo systemctl restart NetworkManager
```

Back to motor work:

```bash
sudo /etc/init.d/ethercat start
```

---

## 7. Workspace (stacker + Inovance configs)

Upstream ICube examples alone do **not** ship this desk’s Inovance slave YAML / `mode:=csp|csv|pp` launch. Use the **stacker** tree whose `3rd-party` holds the patched driver + `ethercat_motor_drive`.

```bash
export STACKER=/work/stacker   # or $HOME/stacker
export WS=$STACKER/codes/ros2_ws
cd "$WS"

# If 3rd-party clones are missing:
#   mkdir -p 3rd-party && cd 3rd-party
#   git clone https://github.com/ICube-Robotics/ethercat_driver_ros2.git
#   git clone https://github.com/ICube-Robotics/ethercat_driver_ros2_examples.git
# then ensure inovance_sv660_*.yaml + mode:= launch presets are present
# (stacker desk already has them under 3rd-party/...).

# Use system ROS Python
source /opt/ros/jazzy/setup.bash
which python3

cd "$WS"
rosdep install --from-paths 3rd-party --ignore-src -r -y
colcon build --symlink-install --base-paths 3rd-party
source "$WS/install/setup.bash"
```

Why these patches matter:

- Inovance PDO / mode YAML (`inovance_sv660_config.yaml`, `_csv`, `_pp`)
- Launch `mode:=csp|csv|pp`
- Safe Ctrl+C: disable CiA402 while still OP, then PREOP (avoids **EE081**)
- PP: control-word override during shutdown so ForwardCommandController cannot keep enable bits

Confirm scripts are executable:

```bash
ls "$WS/scripts"/spin_bare_motor_demo*.sh "$WS/scripts"/stop_motor_drive.sh
```

---

## 8. Every boot / every session checklist

```bash
# Brake 24 V ON (release click)
# Panel clear of E… / EE… (or cool + one H0d.01)

echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor   # performance

sudo /etc/init.d/ethercat status
# or: sudo /etc/init.d/ethercat start

bash "$WS/scripts/check_ethercat_link.sh"   # if present
ethercat slaves    # PREOP +
# Panel: _28ry

ulimit -r          # 99 — if 0, new login after limits.d
```

Stay at **100 Hz** control / Sync0 for beginners.

---

## 9. First enable (no motion yet)

**Terminal 1** (login shell with RT limits):

```bash
export STACKER=/work/stacker
export WS=$STACKER/codes/ros2_ws
ulimit -r
cd "$WS"
source /opt/ros/jazzy/setup.bash
source install/setup.bash

# If master already claimed:
# bash scripts/stop_motor_drive.sh

ros2 launch ethercat_motor_drive motor_drive.launch.py
# equivalent: mode:=csp
```

Expect log lines like Operation Enabled / controllers activated, and ideally:

```text
Successful set up FIFO RT scheduling policy with priority 50
```

**Checks:**

```bash
# other terminal
source /opt/ros/jazzy/setup.bash
source "$WS/install/setup.bash"
ethercat slaves                          # OP +
ethercat upload -p0 0x6061 0 --type int8 # 8
ethercat upload -p0 0x6041 0 --type uint16
ethercat upload -p0 0x603F 0 --type uint16  # 0
ros2 control list_controllers
ps -o pid,cls,rtprio,comm -C ros2_control_node   # CLS=FF, RTPRIO~50 preferred
```

Panel target: **`_88rn`**.

Optional pin to isolated CPUs (if you set `isolcpus=2,3`):

```bash
PID=$(pgrep -n ros2_control_node)
sudo taskset -cp 2,3 "$PID"
```

If OP but controllers never activate / no motion later: fix `ulimit -r` / re-login first; keep 100 Hz.

---

## 10. What CSP means (read before spinning)

**CSP (mode 8)** = every cycle the **master** sends a **target position** (`0x607A`). The drive **tracks**; it does **not** invent a trajectory.

```text
demo script ~100 Hz
  → /forward_position_controller/commands
  → RxPDO 0x607A (counts)
  → SV660 position loop
  → motor
```

Publishing **one** target far from actual is still “valid CSP” — the drive chases ASAP → whip / **E6200**. Always use a **streamed soft path** (the demo scripts).

Units: **encoder counts**. One revolution = **8388608** counts.

---

## 11. First smooth spin (CSP)

With launch still running and panel **`_88rn`**:

```bash
source /opt/ros/jazzy/setup.bash
source "$WS/install/setup.bash"

# Recommended first motion: smooth +360° quintic (no reverse)
bash "$WS/scripts/spin_bare_motor_demo3_smooth_360.sh"
```

Shaft should turn **continuously and smoothly**. If you hear stair-steps or trip **E6200** immediately:

1. Confirm **brake 24 V** is really on (most common miss).
2. Stop launch, cool, clear fault once, retry soft.

Other CSP scripts (after demo3 works):

```bash
bash "$WS/scripts/spin_bare_motor_demo2_smooth_profile_position.sh"
# demo1 is harsher — not for first spin
```

### Optional: CSV (velocity)

```bash
# stop CSP launch first (Ctrl+C), then:
ros2 launch ethercat_motor_drive motor_drive.launch.py mode:=csv
# panel ~ _89rn when enabled
bash "$WS/scripts/spin_bare_motor_demo4_csv.sh 5 1   # soft: 5 rpm × 1 s
```

### Optional: PP (profile position)

```bash
ros2 launch ethercat_motor_drive motor_drive.launch.py mode:=pp
# panel ~ _81rn
bash "$WS/scripts/spin_bare_motor_demo5_pp.sh 30   # +30° internal profile
```

PDO map is fixed at activate — **restart launch** to change mode.

---

## 12. Stop cleanly

In the launch terminal: **Ctrl+C**.

Or:

```bash
bash "$WS/scripts/stop_motor_drive.sh"
```

Expect: slave **PREOP**, panel ready-class **`_28ry`**, `0x603F=0`. Patched driver disables CiA402 **before** AL exit so **EE081** should not latch.

Avoid `kill -9` while enabled in OP.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Permission denied` on `/dev/EtherCAT0` | udev / perms | udev rule above; `ls -l` → `666`; restart master |
| `ec_master` not found | modules not built/installed | `make modules` + `modules_install` + `depmod` on **this** kernel |
| Mailbox / EoE weirdness | IgH built with EoE | Rebuild with `--disable-eoe` |
| PREOP OK, launch dies / no OP | Wrong vendor YAML, cable on OUT, WD/DC | Cable on **CN3 IN**; use Inovance YAML; read launch log |
| OP + enabled, no motion | FIFO denied / controllers not active | `ulimit -r=99`, re-login; `list_controllers` |
| Stairs sound + E6200 | **Brake 24 V missing** | Power BK+/BK−; verify release click |
| EE081 after stop | Hard kill / CW held in PP | Ctrl+C / stop script; cool; one H0d.01 |
| EE150 | Sync period bad | Stay 100 Hz; improve RT later |
| E6200 after “OK” move | I²t / hunting / prior heat | Cool ≥30–60 s; one reset; softer next move |
| Fault reset → shaft jumps | CSP catch-up (`607A≠6064`) | Realign / deactivate forward before reset; see CiA402 notes |
| `setcap` → exit 127 | Broken loader path | Remove setcap; use `limits.d` only |

### Manual fault clear

```text
Panel SET → H0d.01 = 1   (once, when cool)
```

ROS rising-edge reset (launch up, after cool) uses `reset_fault_controller` — only after you understand catch-up risk; prefer panel clear + relaunch for day one.

---

## 14. Appendix

### Glossary

#### EtherCAT / CoE

| Abbr | Expansion |
|---|---|
| **IgH** | IgH EtherCAT Master (this desk’s master stack; `/dev/EtherCAT0`, `ethercat` CLI) |
| **ESI** | EtherCAT Slave Information (XML describing the drive) |
| **AL** | Application Layer state: INIT → PREOP → SAFEOP → **OP** |
| **OP** | Operational — cyclic PDO running |
| **DC** | Distributed Clocks — shared time base for slaves |
| **Sync0** | DC latch / interrupt; rate at which cyclic PDO is taken |
| **SM / SM2** | Sync Manager; **SM2** = RxPDO channel (watchdog on SV660N) |
| **PDO** | Process Data Object — cyclic process data every Sync0 |
| **RxPDO** | Receive PDO — **master → drive** (commands) |
| **TxPDO** | Transmit PDO — **drive → master** (feedback) |
| **SDO** | Service Data Object — slow mailbox (config, fault code, mode) |
| **CoE** | CANopen over EtherCAT |
| **EoE** | Ethernet over EtherCAT (do **not** mix with CoE mailbox on SV660 — build IgH with `--disable-eoe`) |
| **WD** | Watchdog (SM2 expects cyclic RxPDO) |
| **WC** | Working counter (how many slaves answered the cyclic frame) |

#### CiA402 / servo

| Abbr | Expansion |
|---|---|
| **CiA402** | CANopen drive profile (state machine + `0x60xx` objects) |
| **CSP** | Cyclic Synchronous Position (mode **8**) — master streams `0x607A` |
| **CSV** | Cyclic Synchronous Velocity (mode **9**) |
| **CST** | Cyclic Synchronous Torque (mode **10**) |
| **PP** | Profile Position (mode **1**) — drive ramps to one target |
| **HM** | Homing mode |
| **CW / SW** | Controlword `0x6040` / Statusword `0x6041` |
| **I²t** | Accumulative thermal/current model (panel **E6200** = E620.0) |

Common objects on this axis: **`0x607A`** target position, **`0x6064`** actual position (encoder **counts**, MS1 ≈ **2²³** / rev), **`0x6060`/`0x6061`** mode, **`0x603F`** error code.

#### ROS 2 / this stack

| Abbr | Expansion |
|---|---|
| **CM** | `ros2_control` **controller_manager** (`ros2_control_node`) |
| **JTC** | `joint_trajectory_controller` |
| **FIFO / RT** | `SCHED_FIFO` realtime scheduling (kernel **PREEMPT_RT** ≠ process is FIFO) |
| **DDS** | ROS 2 middleware (topics; not the EtherCAT cycle) |

#### Panel

Keypad glyphs (`_88rn`, **E6200**, **EE081**, …) are summarized in [Panel literacy](#3-panel-literacy-enough-to-spin) above; full map: [SV660N keypad panel status codes](/posts/2026/08/sv660n-keypad-panel-status-codes/).

### CoE cheat sheet

| Object | Name |
|---|---|
| `0x6040` | Controlword |
| `0x6041` | Statusword |
| `0x6060` / `0x6061` | Mode / mode display |
| `0x607A` | Target position |
| `0x6064` | Position actual |
| `0x60FF` | Target velocity (CSV) |
| `0x603F` | Error code |
| `0x6077` | Torque actual (scaled) |

### Success checklist (print this)

1. Brake **24 V** on  
2. `uname -r` has **realtime**  
3. IgH **`--disable-eoe`**, `ethercat slaves` → PREOP  
4. `ulimit -r` → **99**  
5. Launch CSP → panel **`_88rn`**  
6. `demo3` smooth spin  
7. Ctrl+C → PREOP, **`0x603F=0`**

---

## Further reading (optional)

These are **not** required if you followed this post:

- [SV660N keypad panel status codes](/posts/2026/08/sv660n-keypad-panel-status-codes/)
- [Ubuntu 24.04 PREEMPT_RT install (dual-GPU notes)](/posts/2026/08/install-ubuntu-2404-realtime-kernel-preempt-rt-dual-gpu/)
