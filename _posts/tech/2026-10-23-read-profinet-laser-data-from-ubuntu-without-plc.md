---
title: "Reading PROFINET Laser Data from Ubuntu Without a PLC"
date: 2026-10-23
permalink: /posts/2026/10/read-profinet-laser-data-from-ubuntu-without-plc/
categories: tech
tags: [profinet, ethercat, ubuntu, linux, ros2, industrial-automation]
excerpt: "A practical survey of TCP/IP and PROFINET IO options for reading a Hinson PHR-080200 distance sensor from an Ubuntu real-time computer without an intervening PLC."
---

An Ubuntu computer can read data from an industrial distance sensor without a separate PLC. The key is choosing the right interface and, for PROFINET, providing the **IO Controller** role in software.

This article uses the Hinson PHR-080200 as a concrete example. It compares the sensor's TCP/IP and PROFINET interfaces, describes Linux controller options, and lays out a bench-validation plan. It does not assume that a protocol's advertised rate is the rate an application will receive, or that a working connection is already qualified for motion control.

* TOC
{:toc}

## The device and the actual question

Hinson lists the PHR-080200 as a phase-measuring distance sensor with an 80 m measurement range, 0.01 mm resolution, ±2 mm absolute accuracy, ±1 mm repeatability, and a measurement frequency up to 3 kHz. Its listed communication interfaces include TCP/IP, PROFINET and CANopen. These are manufacturer specifications, not measurements of end-to-end host performance. [Hinson PHR-080200 product page](https://en.hinson-xs.com/products_detail/205.html)

The practical question is not simply whether Ubuntu has Ethernet. It is:

> Can this computer establish the right protocol role, obtain valid measurement data, detect stale or faulty data, and deliver it at a verified rate to the application?

For PROFINET IO, the sensor is an **IO Device** and the Ubuntu host must act as an **IO Controller**. A standard NIC provides the physical Ethernet interface; the controller stack provides discovery, configuration, connection management and cyclic IO exchange. [PROFINET Controller and Device roles](https://us.profinet.com/profinet-controller-vs-device/)

## Three possible data paths

| Path | What Ubuntu needs | Main advantage | Main uncertainty |
| --- | --- | --- | --- |
| TCP/IP | Hinson's TCP protocol and a normal socket client | Often the smallest software footprint | “TCP/IP supported” does not say whether data streams or must be polled, or what the payload means |
| PROFINET IO | An IO Controller stack, the sensor's GSDML, and a compatible network interface | Standard device configuration, cyclic process data and diagnostics | Controller software integration, supported OS/NIC combination and actual update timing |
| CANopen | CAN interface hardware and a CANopen master stack | A common embedded fieldbus path | Requires a CAN adapter and the PHR device profile/object mapping |

TCP/IP and PROFINET are not interchangeable labels for the same interface. PROFINET IO uses Ethernet, but its cyclic IO relationship is configured and managed using PROFINET-specific services. The sensor's TCP/IP capability may offer a simpler direct read path, but the public product page does not document its application protocol.

## Is EtherCAT another option?

The PHR-080200 product page does not list EtherCAT, so the sensor cannot be connected as an EtherCAT slave using its listed interfaces. EtherCAT can still be used for servo drives while the sensor uses a separate TCP/IP or PROFINET network interface.

EtherCAT is comparatively accessible on Linux because established master software is available. The IgH EtherCAT Master supports Linux real-time extensions and provides C/C++ application interfaces. That does not make it a PROFINET Controller, nor does it convert a PROFINET sensor into an EtherCAT device. [IgH EtherCAT Master](https://etherlab.org/en_GB/ethercat/) [IgH manual](https://docs.etherlab.org/ethercat/1.5/pdf/ethercat_doc.pdf)

For a mixed system, keeping the servo bus and sensor acquisition on distinct network interfaces is a straightforward starting topology. It avoids accidental network sharing and makes traffic, driver behavior and timing easier to inspect. The chosen hardware and final workload still need testing.

## PROFINET Controller options on Linux

### Siemens PROFINET Driver, Linux Native

Siemens documents a Linux Native PROFINET Driver variant that supports the Controller role. Its quick start describes Debian 12 with a real-time-patched Linux kernel and says a standard Ethernet adapter can be used when it has a working Linux driver. It also says the interface used for PROFINET should not be used for other purposes, because sharing it may affect real-time performance. [Linux Native quick start](https://docs.industrial-operations-x.siemens.cloud/r/en-us/v3.2.0/profinet-driver/quick-start/runtime-variants/quick-start-for-linux-native) [Supported sample implementations](https://docs.industrial-operations-x.siemens.cloud/r/en-us/v3.2.0/profinet-driver/how-to-port/system-overview/overview-of-sample-pn-driver-implementations)

This is a concrete C/C++ integration route to investigate, not a plug-and-play ROS driver. The documentation baseline does not by itself establish compatibility with every Ubuntu release, kernel, NIC, or real-time configuration. The target system must be checked against the exact driver package, sample application, supported kernel configuration and license terms.

The general integration shape is:

```text
PHR-080200 (PROFINET IO Device)
              |
              | cyclic PROFINET IO
              v
Dedicated Ethernet NIC + Linux PROFINET IO Controller
              |
              | validated distance, status, timestamp
              v
        C++ acquisition layer
              |
              v
     ROS 2 node / control application
```

The sensor's GSDML file describes its PROFINET device identity and available modules. The controller configuration uses that description to select the expected IO layout. The process bytes must then be decoded according to Hinson's manual, including units, signedness, byte order, validity and diagnostic information.

### Python controller library for experiments

The `profinet-py` project describes itself as a PROFINET IO Controller library. Its README lists Linux raw-Ethernet support, device discovery, DCP configuration, cyclic IO using a GSDML file, diagnostics and a command-line monitor. Its example cyclic monitor defaults to a 32 ms cycle. [Project README](https://github.com/f0rw4rd/profinet-py)

That makes it a possible **bench experiment**, not evidence of production readiness or PHR-080200 interoperability. At the sensor's stated maximum target speed of 12 m/s, a 32 ms interval corresponds to 384 mm of travel between host updates. The sensor may measure internally much faster, but that does not mean the host receives each internal sample. Measure the actual IO period and end-to-end data age before deciding whether this route suits the application.

The project is dual-licensed under GPL-3.0 and a commercial license. Review the terms before embedding or distributing it in a closed-source product. [License information](https://github.com/f0rw4rd/profinet-py/blob/main/LICENSE-COMMERCIAL.md)

### Avoid using an IO Device stack as the Controller

Several easily found PROFINET projects implement the **IO Device** role, which is the role the sensor already plays. For example, RT-Labs `p-net` explicitly says it does not support the IO Controller/master/PLC side. [p-net README](https://github.com/rtlabs-com/p-net/blob/public/README.md)

The PI Community Stack is a protocol foundation for integration, not an automatically configured controller application. PI's current overview describes the available demo as primarily an IO Device demonstration and notes that users must adapt the hardware-abstraction and application layers. [PI Community Stack overview](https://www.profinet.com/profinet-explained/community-stack)

The role matters: installing an IO Device library on Ubuntu does not make Ubuntu able to configure and read the PHR sensor.

## What does real-time Linux guarantee?

A PREEMPT_RT kernel can reduce scheduling latency and make application timing more predictable. It does not by itself supply a PROFINET stack, guarantee that the NIC and its driver meet deadlines, or prove that the distance value is fresh.

The PHR's specified 3 kHz measurement frequency is approximately one internal measurement every 0.333 ms. At 12 m/s, a target moves about 4 mm in that time. That calculation is useful context, but it is not a guaranteed host update rate. The controller may exchange data at a slower period, the device may apply filtering, and the host may add scheduling and processing delay.

For any motion-related use, measure and record at least:

- Actual cyclic IO or TCP update interval, including median, high-percentile and maximum intervals.
- End-to-end data age, using a sensor capture timestamp if available or a defensible age bound if it is not.
- Validity and diagnostic behavior for signal loss, out-of-range readings, reflection problems and device restart.
- Stale-data detection, disconnect handling and recovery under realistic CPU and network load.
- The exact sensor revision, firmware, GSDML/manual versions, NIC, driver, kernel and controller software.

A received value is not necessarily a fresh value. A stationary distance also cannot prove that the sensor is still updating; sequence, timestamp or other update evidence is needed.

## A practical evaluation sequence

1. **Get the device documents.** Ask Hinson for the PHR-080200 manual, GSDML, process-data map, firmware compatibility information and TCP/IP protocol details. For TCP/IP, clarify whether the device streams or requires polling, the port and message format, supported update period, and diagnostic fields.
2. **Choose the smallest test path.** If Hinson supplies a documented TCP protocol and its behavior meets the requirement, first build a read-only socket client. If PROFINET IO is required, choose an actual Linux IO Controller implementation before writing sensor-specific code.
3. **Use a dedicated wired NIC.** Connect only the test host and sensor, or use an isolated switch. Configure the interface according to the selected controller and Hinson instructions. Avoid sharing it with EtherCAT or general network traffic during timing tests.
4. **Prove basic communication.** For PROFINET, discover and identify the sensor, configure its station name and IO modules from the GSDML, establish cyclic data exchange, then verify the decoded value against the sensor display or a controlled reference. For TCP/IP, verify framing, units, status and reconnection behavior.
5. **Measure before integrating.** Capture raw data and host timestamps first. Check update rate, jitter, maximum gaps, faults and recovery. Do not treat the sensor's 3 kHz measurement frequency as proof of a 3 kHz application feed.
6. **Add the application interface.** A C++ acquisition component can expose a stable sample structure; a ROS 2 node can publish the distance, validity, diagnostics and timestamp. Keep network reads out of a time-critical control callback if the Controller API can block; pass validated latest samples through a bounded, well-defined handoff.

## Recommendation

Reading the PHR-080200 from Ubuntu without a PLC is technically possible. The most practical route depends on the documentation Hinson provides:

- **Start with TCP/IP** if Hinson provides a clear measurement protocol and it satisfies the measured latency and freshness requirement. This is usually the least complex software path.
- **Use PROFINET IO** if the application needs its standardized cyclic IO configuration and diagnostics, or if testing shows TCP/IP is unsuitable. A Linux IO Controller stack is still required; the NIC alone is not enough.
- **Keep EtherCAT for devices that actually support EtherCAT.** It is a strong Linux fieldbus option, but it is not an interface offered for this sensor.

The first decision should be based on the PHR-specific TCP protocol and GSDML/process-data map. The next should be a hardware bench test that proves end-to-end update timing and failure behavior. Protocol labels and nominal rates are not substitutes for those measurements.
