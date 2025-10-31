---
title: 'Why LinuxCNC Drivers Are HAL Components: Understanding a Domain-Specific Architecture'
date: 2025-10-31
permalink: /posts/2025/10/linuxcnc-hal-design/
categories: tech
tags: ['linuxcnc']
---

When first exploring LinuxCNC's codebase, something curious stands out: drivers are located in src/hal/drivers/. This seems backwards at first—in traditional operating systems, drivers sit below the Hardware Abstraction Layer (HAL), not inside it. But this apparent inversion reveals a fundamental difference in how LinuxCNC approaches system architecture compared to general-purpose operating systems.

* TOC
{:toc}

# summary

“The HAL is not necessarily a module — it’s a boundary of responsibility between hardware-dependent and hardware-independent code.”

In other words:
even if you don’t call it HAL, every robust system has a HAL-shaped interface somewhere.

## Two Different Models

### Traditional OS Model

In a traditional operating system, the architecture follows a clear hierarchical structure:

```
Hardware
  ↓
Kernel Drivers (/drivers/) 
  ↓
Kernel API (/sys/, /dev/, ioctl)
  ↓
HAL (Hardware Abstraction Layer)
  ↓
Applications
```

In this model, drivers are kernel modules that directly interface with hardware. They expose their functionality through kernel interfaces like `/dev/` device files, `/sys/` sysfs, and `ioctl()` calls. The HAL sits above this, providing a standardized API that abstracts away the differences between hardware implementations. Applications then use the HAL to access hardware without needing to know the specifics of each driver.

This design provides clear separation of concerns: drivers handle hardware-specific details, the kernel provides a consistent interface, and the HAL provides portability across different hardware platforms.

### LinuxCNC Model

LinuxCNC takes a fundamentally different approach:

```
Hardware
  ↓
HAL Components (including drivers in src/hal/drivers/)
  ↓
LinuxCNC Motion Control (connects via HAL pins)
```

In LinuxCNC, drivers *are* HAL components. They don't sit below the HAL—they're part of it. Instead of kernel APIs, everything communicates through HAL pins and parameters.

## Why This Design Exists

Looking at the HAL documentation, we find this explanation:

> "The HAL is a very modular approach to the low level parts of a motion control system. The goal of the HAL is to allow a systems integrator to connect a group of software components together to meet whatever I/O requirements he (or she) needs."

This reveals the key insight: **HAL in LinuxCNC isn't just an abstraction layer—it's a real-time component framework.**

### Drivers as HAL Components

In LinuxCNC, drivers are HAL components because:

1. **Unified Interface**: Everything exposes HAL pins—drivers, PID loops, filters, step generators, and motion control modules. There's no separate "driver API" and "application API"—everything uses the same mechanism.

2. **Component Model**: Think of it like electronic components on a circuit board. Each component has pins that can be connected to other components. The Mesa FPGA driver is essentially a "chip" that exports pins for step generators, encoders, digital I/O, and so on. Users wire these pins together based on their specific machine configuration.

3. **Real-time Wiring**: HAL wiring is done in real-time threads with minimal overhead. There's no kernel syscall overhead when reading a pin or writing to a pin. Components are loaded into the real-time kernel module (rtapi), and pin connections happen at the real-time level.

## The Trade-off

### Traditional Design Advantages

- **Clear Separation**: Drivers → Kernel → HAL → Application creates a well-defined layering
- **Multiple Abstraction Levels**: Hardware can be abstracted at different levels (kernel drivers, device classes, HAL APIs)
- **Portability**: Drivers written for the kernel API could potentially work outside LinuxCNC

### LinuxCNC Design Advantages

- **Simplicity**: One framework for everything—no need to understand multiple API layers
- **Direct Realtime Access**: No kernel syscall overhead when accessing hardware from real-time threads
- **Flexibility**: Users wire components themselves, creating exactly the configuration they need
- **Self-contained**: Everything uses the same HAL mechanism, making the system easier to understand and modify

### LinuxCNC Design Disadvantages

- **Tight Coupling**: Drivers are HAL-specific and can't be used outside the HAL framework
- **Less Portable**: Drivers written for LinuxCNC's HAL won't work in other contexts
- **Different from Traditional OS Design**: This can be confusing for developers coming from traditional OS backgrounds

## Why It Works for LinuxCNC

The critical factor is that **LinuxCNC is a domain-specific system for CNC (Computer Numerical Control), not a general-purpose operating system**.

For a CNC machine, you need:
- Extremely low latency (microsecond-level timing)
- Deterministic real-time behavior
- Direct access to motion control hardware
- Ability to wire together specialized components (step generators, encoders, PID loops)

The traditional OS model adds layers that introduce latency and complexity that aren't needed in this domain. LinuxCNC's design prioritizes:

1. **Performance**: Direct real-time access without kernel overhead
2. **Simplicity**: One framework instead of multiple abstraction layers
3. **Flexibility**: Users can wire components to match their specific machine

The directory `src/hal/drivers/` is essentially a naming/organizational choice. These could be called "hardware HAL components" to better reflect that they're HAL components that interface with hardware, rather than traditional OS drivers that sit below a HAL.

## Should It Be Different?

Could LinuxCNC use a more traditional design? Possibly, but it would require:

1. Creating a separate driver layer that interfaces with hardware
2. Building HAL on top of that driver layer
3. Adding abstraction layers that would introduce latency

For a real-time CNC system, this would add complexity and latency without providing meaningful benefits. The current design makes sense for the domain.

## Difference with General-purpose OS

General-purpose OS:
- Many applications must run
- Hardware must be abstracted for portability
- Security/sandboxing requires boundaries
- Layered architecture fits

Domain-specific control systems (LinuxCNC, ROS, PLCs):
- Single-purpose: control a machine
- Real-time constraints: minimal layers/overhead
- User configurability: operators wire components
- Tight coupling is acceptable

LinuxCNC’s style is common in:
- Real-time control systems
- Robotics frameworks
- Industrial automation
- Embedded motion control

It’s uncommon in:
- General-purpose operating systems
- Multi-application platforms
- Systems needing strong hardware abstraction

## Conclusion

LinuxCNC's architecture challenges our assumptions about how operating systems should be structured. By making drivers first-class HAL components rather than a separate layer below the HAL, LinuxCNC prioritizes:

- Real-time performance over traditional OS abstractions
- Simplicity and consistency over layered complexity
- Domain-specific needs over general-purpose design

This isn't a "wrong" design—it's a design optimized for a specific domain with specific requirements. When microseconds matter and you need deterministic real-time behavior, the traditional OS abstraction layers become obstacles rather than aids.

Understanding this design helps explain why LinuxCNC can achieve the real-time performance needed for precise motion control, and why developers might find the architecture confusing if they expect traditional OS patterns. It's a reminder that optimal architecture depends on the problem domain, and sometimes the "standard" approach isn't the best fit.

