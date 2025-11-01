---
title: 'HAL Across Domains: How Different Systems Define Hardware Abstraction Layers'
date: 2025-11-01
permalink: /posts/2025/11/hal-across-domains/
categories: tech
tags: [hal, hardware-abstraction, embedded-systems, robotics, autonomous-driving]
excerpt: "The term 'HAL' means different things in different domains—from kernel-level platform abstraction to application-level sensor control. Understanding these differences helps clarify domain-specific architecture choices."
---

Different domains define HAL differently based on their needs:

### 1. Autonomous Driving Domain Controllers

**HAL Purpose**: Abstract sensor and actuator hardware

**Typical HAL Structure**:
```c
// Example concepts (not actual code)
class SensorHAL {
    // LiDAR abstraction
    virtual PointCloud readLiDAR() = 0;
    
    // Camera abstraction
    virtual ImageFrame readCamera(int camera_id) = 0;
    
    // Radar abstraction
    virtual RadarData readRadar() = 0;
    
    // GPS/IMU abstraction
    virtual PoseData readPose() = 0;
};

class ActuatorHAL {
    // Steering control
    virtual void setSteeringAngle(float angle) = 0;
    
    // Throttle/brake control
    virtual void setThrottle(float value) = 0;
    virtual void setBrake(float value) = 0;
    
    // Transmission control
    virtual void setGear(int gear) = 0;
};
```

**Key Differences from LinuxCNC HAL**:
- Focuses on sensor fusion and vehicle control
- Higher-level APIs (images, point clouds, vehicle commands)
- Handles complex sensor calibration, synchronization
- Often event-driven + periodic processing
- Safety-critical with redundancy

### 2. Robotics Frameworks (ROS, etc.)

**HAL Purpose**: Abstract robot hardware (motors, sensors, grippers)

**Typical Structure**:
```c
// Example concepts
class RobotHAL {
    // Joint control
    virtual void setJointPosition(int joint_id, float position) = 0;
    virtual float getJointPosition(int joint_id) = 0;
    
    // Sensor access
    virtual SensorData readSensor(int sensor_id) = 0;
    
    // Actuator control
    virtual void setActuator(int actuator_id, float value) = 0;
};
```

**Key Features**:
- Joint space abstractions (similar to kinematics in LinuxCNC)
- Often uses middleware (ROS, DDS)
- Supports complex robots (humanoids, mobile bases, manipulators)

### 3. Embedded Systems (ARM Mbed, Arduino HAL)

**HAL Purpose**: Abstract microcontroller peripherals

**Typical Structure**:
```c
// Example
class GPIO_HAL {
    void pinMode(int pin, Mode mode);
    void digitalWrite(int pin, bool value);
    bool digitalRead(int pin);
};

class SPI_HAL {
    void begin();
    void transfer(uint8_t data);
};
```

**Key Features**:
- Low-level peripheral abstraction (GPIO, UART, SPI, I2C, ADC)
- Very close to hardware
- Minimal overhead

### 4. Operating System HAL (Windows, embedded Linux)

**HAL Purpose**: Abstract platform differences (CPU, interrupt controller, DMA)

**Functions** (like Windows HAL.dll):
- Interrupt management
- DMA operations
- Processor initialization
- Bus operations
- Timer access

**Key Features**:
- Very low-level (kernel mode)
- Platform-specific implementations
- OS-level abstraction

## Comparison Table

| Domain | HAL Level | Abstraction | Focus |
|--------|-----------|-------------|-------|
| **LinuxCNC** | Application (real-time) | Motion hardware, signals | Step/direction, encoders, PID loops |
| **Autonomous Driving** | Application | Sensors, vehicle actuators | LiDAR, cameras, steering/brake |
| **Robotics (ROS)** | Application/Middleware | Robot joints, sensors | Joint control, sensor fusion |
| **Embedded Systems** | Firmware | MCU peripherals | GPIO, UART, SPI, ADC |
| **OS (Windows)** | Kernel | Platform hardware | Interrupts, DMA, processors |

## Key Insight

The term "HAL" is generic, and each system defines it for its domain:

1. **What hardware** needs abstracting? (LinuxCNC: motion hardware, Autonomous: sensors/vehicle)
2. **What level** of abstraction? (LinuxCNC: signal routing, Embedded: register access)
3. **What operations** are needed? (LinuxCNC: real-time control loops, Autonomous: sensor reading/actuator control)

