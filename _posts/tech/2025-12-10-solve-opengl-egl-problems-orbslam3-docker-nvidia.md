---
title: "Solving OpenGL/EGL Problems When Running ORB-SLAM3 in Docker Container on NVIDIA GPU Host"
date: 2025-12-10
permalink: /posts/2025/12/solve-opengl-egl-problems-orbslam3-docker-nvidia/
categories: tech
tags: [opengl, egl, orbslam3, docker, nvidia, gpu, containerization, computer-vision]
excerpt: "A guide to resolving OpenGL/EGL initialization and rendering issues when running ORB-SLAM3 in Docker containers on hosts with NVIDIA GPUs, covering proper GPU passthrough, EGL context setup, and common pitfalls."
---

Running ORB-SLAM3 (or other OpenGL-based computer vision applications) in Docker containers can be challenging, especially when dealing with GPU acceleration and EGL context initialization. This post documents solutions for common OpenGL/EGL problems encountered when running ORB-SLAM3 in Docker on a host with NVIDIA GPU.

* TOC
{:toc}

## Overview

ORB-SLAM3 requires OpenGL/EGL for visualization and rendering. When containerized, I got these issues:

```
MESA: error: ZINK: failed to choose pdev libEGL warning: egl: failed to create dri2 screen QStandardPaths: XDG_RUNTIME_DIR not set, defaulting to '/tmp/runtime-xf' Starting the Viewer MESA: error: Failed to attach to x11 shm
```

## Prerequisites

- Host system with NVIDIA GPU
- NVIDIA drivers installed on host
- Docker with NVIDIA Container Toolkit (nvidia-docker2)
- ORB-SLAM3 source code or pre-built binaries

## Solution 1: Proper NVIDIA Container Runtime Setup

### Install NVIDIA Container Toolkit

```bash
# Add NVIDIA package repositories
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

# Install nvidia-container-toolkit
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Restart Docker daemon
sudo systemctl restart docker
```

### Docker Run Command with GPU Access

OK, let's start a container

```bash
xhost +local:
docker run --rm -it --gpus all -e DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix ubuntu:22.04 bash
```

see if nvidia driver mount

```
# in container
root@cf20e34c36e2:/# nvidia-smi
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.76                 Driver Version: 550.76         CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  NVIDIA GeForce GTX 1080 Ti     Off |   00000000:06:00.0  On |                  N/A |
| 29%   49C    P8             15W /  250W |     303MiB /  11264MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+
```

GOOD! nvidia driver is ok in container. Let's see if opengl programs runs normals. We use glxgears and glmark2. first install packages for them

```
# in container
# if you need mirror
sed -i 's|archive.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list \
    && sed -i 's|security.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list
apt update

sudo apt install mesa-utils glmark2
```

Run it

```
glxgears

root@cf20e34c36e2:/x/temp# glmark2
** GLX does not support GLX_EXT_swap_control or GLX_MESA_swap_control!
** Failed to set swap interval. Results may be bounded above by refresh rate.
=======================================================
    glmark2 2021.02
=======================================================
    OpenGL Information
    GL_VENDOR:     Mesa
    GL_RENDERER:   llvmpipe (LLVM 15.0.7, 256 bits)
    GL_VERSION:    4.5 (Compatibility Profile) Mesa 23.2.1-1ubuntu3.1~22.04.3
=======================================================
** GLX does not support GLX_EXT_swap_control or GLX_MESA_swap_control!
** Failed to set swap interval. Results may be bounded above by refresh rate.
[build] use-vbo=false: FPS: 560 FrameTime: 1.786 ms
```

Wait, they are running on llvmpipe, no hardware acceleration/GPU !!!

```
# glxinfo -B
OpenGL renderer string: llvmpipe (LLVM 15.0.7, 256 bits)

# eglinfo -B
X11 platform:
EGL vendor string: Mesa Project
```



## Solution 2: Dockerfile Configuration

### Base Dockerfile Structure

```dockerfile
FROM nvidia/cuda:11.8.0-devel-ubuntu22.04

# Install OpenGL and EGL libraries
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libgl1-mesa-dri \
    libegl1-mesa \
    libgles2-mesa \
    libglu1-mesa \
    libx11-dev \
    libxext-dev \
    libxrender-dev \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install ORB-SLAM3 dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    git \
    libeigen3-dev \
    libopencv-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Build ORB-SLAM3
WORKDIR /workspace
RUN git clone https://github.com/UZ-SLAMLab/ORB_SLAM3.git
WORKDIR /workspace/ORB_SLAM3
RUN chmod +x build.sh && ./build.sh

# Set environment variables for EGL
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility
ENV __GLX_VENDOR_LIBRARY_NAME=nvidia
ENV EGL_PLATFORM=device
```

## Solution 3: EGL Device Platform Configuration

### For Headless Rendering (No X11)

When running without a display, use EGL device platform:

```dockerfile
# In Dockerfile, add:
ENV EGL_PLATFORM=device
ENV __EGL_VENDOR_LIBRARY_FILENAMES=/usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.0
```

### Runtime Environment Variables

```bash
docker run --gpus all \
  -e NVIDIA_VISIBLE_DEVICES=all \
  -e NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility \
  -e EGL_PLATFORM=device \
  -e __EGL_VENDOR_LIBRARY_FILENAMES=/usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.0 \
  your-image
```

## Solution 4: Docker Compose Configuration

```yaml
version: "3.9"

services:
  orbslam3:
    build:
      context: .
      dockerfile: Dockerfile
    image: orbslam3:latest
    container_name: orbslam3-container
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility
      - EGL_PLATFORM=device
      - DISPLAY=${DISPLAY}
    volumes:
      - /tmp/.X11-unix:/tmp/.X11-unix:rw
      - ./data:/workspace/data
    devices:
      - /dev/dri:/dev/dri
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

## Solution 5: Common Error Fixes

### Error: "EGL: Failed to create display"

**Solution**: Ensure NVIDIA drivers are properly exposed:

```bash
docker run --gpus all \
  --device=/dev/dri \
  -e NVIDIA_VISIBLE_DEVICES=all \
  -e NVIDIA_DRIVER_CAPABILITIES=graphics \
  your-image
```

### Error: "libEGL.so.1: cannot open shared object file"

**Solution**: Install EGL libraries and link NVIDIA's EGL:

```dockerfile
RUN apt-get install -y libegl1 libegl1-mesa libegl-nvidia0
```

### Error: "No available GPUs" or "CUDA not found"

**Solution**: Verify GPU access:

```bash
# Test GPU visibility in container
docker run --gpus all --rm nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### Error: "X11 display not found" (for GUI applications)

**Solution**: Forward X11 display or use headless rendering:

```bash
# Option 1: X11 forwarding
xhost +local:docker
docker run -e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix your-image

# Option 2: Headless with EGL device platform
docker run -e EGL_PLATFORM=device your-image
```

## Solution 6: Verify EGL Setup

### Test EGL in Container

Create a test script to verify EGL initialization:

```cpp
// test_egl.cpp
#include <EGL/egl.h>
#include <iostream>

int main() {
    EGLDisplay display = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    if (display == EGL_NO_DISPLAY) {
        std::cerr << "Failed to get EGL display" << std::endl;
        return 1;
    }
    
    EGLint major, minor;
    if (!eglInitialize(display, &major, &minor)) {
        std::cerr << "Failed to initialize EGL" << std::endl;
        return 1;
    }
    
    std::cout << "EGL initialized successfully" << std::endl;
    std::cout << "EGL version: " << major << "." << minor << std::endl;
    
    eglTerminate(display);
    return 0;
}
```

Compile and run:

```bash
g++ -o test_egl test_egl.cpp -lEGL
./test_egl
```

## Best Practices

1. **Always use `--gpus all`** or `runtime: nvidia` for GPU access
2. **Set `NVIDIA_DRIVER_CAPABILITIES`** to include `graphics` for OpenGL/EGL
3. **Use EGL device platform** for headless rendering when possible
4. **Mount `/dev/dri`** device for direct rendering infrastructure access
5. **Verify GPU visibility** with `nvidia-smi` inside container before debugging OpenGL issues

## Troubleshooting Checklist

- [ ] NVIDIA Container Toolkit installed and Docker restarted
- [ ] `nvidia-smi` works inside container
- [ ] EGL libraries installed (`libegl1`, `libegl-nvidia0`)
- [ ] Environment variables set (`NVIDIA_VISIBLE_DEVICES`, `NVIDIA_DRIVER_CAPABILITIES`)
- [ ] `/dev/dri` devices accessible in container
- [ ] EGL platform set correctly (`EGL_PLATFORM=device` for headless)
- [ ] X11 forwarding configured if GUI needed

## Summary

Running ORB-SLAM3 in Docker with NVIDIA GPU requires:

1. Proper NVIDIA Container Toolkit setup
2. Correct environment variables for GPU and graphics capabilities
3. EGL libraries and NVIDIA EGL drivers
4. Appropriate device mounts (`/dev/dri`)
5. EGL platform configuration for headless or display-based rendering

Following these solutions should resolve most OpenGL/EGL initialization problems when running ORB-SLAM3 in Docker containers on NVIDIA GPU hosts.

## References

- [NVIDIA Container Toolkit Documentation](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)
- [ORB-SLAM3 GitHub Repository](https://github.com/UZ-SLAMLab/ORB_SLAM3)
- [EGL Specification](https://www.khronos.org/egl/)

## some notes

Note:/dev/dri is only for integrated graphics card, not for nvidia:

```
# do not use this with nvidia gpu when running docker
--device=/dev/dri:/dev/dri \
```