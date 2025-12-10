---
title: "Solving OpenGL/EGL Problems When Running ORB-SLAM3 in Docker Container on NVIDIA GPU Host"
date: 2025-12-10
permalink: /posts/2025/12/solve-opengl-egl-problems-orbslam3-docker-nvidia/
categories: tech
tags: [opengl, egl, orbslam3, docker, nvidia, gpu, containerization, computer-vision]
excerpt: "A guide to resolving OpenGL/EGL initialization and rendering issues when running ORB-SLAM3 in Docker containers on hosts with NVIDIA GPUs, covering proper GPU passthrough, EGL context setup, and common pitfalls."
---

Running ORB-SLAM3 (or other OpenGL-based computer vision applications) in Docker containers can be challenging, especially when dealing with GPU acceleration and EGL context initialization. This post documents problems and solutions encountered when running ORB-SLAM3 in Docker on a host with NVIDIA GPU.

* TOC
{:toc}

## Problem

ORB-SLAM3 requires OpenGL/EGL for visualization and rendering. When containerized, I got these issues:

```
MESA: error: ZINK: failed to choose pdev libEGL warning: egl: failed to create dri2 screen QStandardPaths: XDG_RUNTIME_DIR not set, defaulting to '/tmp/runtime-xf' Starting the Viewer MESA: error: Failed to attach to x11 shm
```

## Causation and Solution (for me)

NVIDIA_DRIVER_CAPABILITIES and base docker images are the two reason for my problem

### 1 NVIDIA_DRIVER_CAPABILITIES not correctly set
after this set correctly, glx problems are resolved (GLX works with NVIDIA GPU acceleration). But EGL do not work, so as the ORB-SLAM3's Map Viewer which depend on EGL (not on GLX)

#### docker compose 

(recommend)

```
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu, compute, utility, video, display] 
              # capabilities: [gpu, compute, utility] is not enough!!!

```

alternative: 

```
    environment:
      - NVIDIA_DRIVER_CAPABILITIES=all
      - NVIDIA_VISIBLE_DEVICES=all
    runtime: nvidia
```

These two way to inject NVIDIA drivers are equivalent

#### docker run

```bash
docker run --rm -it --gpus all -e DISPLAY -e NVIDIA_DRIVER_CAPABILITIES=all -v /tmp/.X11-unix:/tmp/.X11-unix nvidia/opengl:1.0-glvnd-devel bash
```

2. not using nvidia/opengl:1.0-glvnd-devel

I do not understand why use this base image is ok for EGL. I see 

```
COPY 10_nvidia.json /usr/share/glvnd/egl_vendor.d/10_nvidia.json # buildkit
```
in https://hub.docker.com/layers/nvidia/opengl/1.0-glvnd-devel/images/sha256-c030a21588ddb89c245c8a2a24d6e68772cfa5939d312bab19f0833b90e9620a

Maybe some one could extract this json file to work with non nvidia/opengl images like ubuntu 22.04. 

I just use nvidia/opengl:1.0-glvnd-devel


## How to check your container will work: vendor string has NVIDIA

### EGL (depended by OSB-SLAM3 Map Viewer) used by wayland
```
eglinfo -B
EGL vendor string: NVIDIA
```

### GLX (for X11)
```
glxinfo -B
OpenGL vendor string: NVIDIA Corporation
```

Gazebo Classic could only use GLX
Ignition Gazebo use GLX in  traditional X11 mode while EGL in Wayland mode

## Detailed Steps

### 0 Prerequisites

- Host system with NVIDIA GPU
- NVIDIA drivers installed on host
- Docker with NVIDIA Container Toolkit (nvidia-container-toolkit)
- ORB-SLAM3 source code or pre-built binaries

#### install NVIDIA Container Toolkit

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

### 1 start a container

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

GOOD! nvidia driver is ok in container.

### 2 test opengl programs

 Let's see if opengl programs runs normals. We use glxgears and glmark2. first install packages for them

```
# in container
# if you need mirror
sed -i 's|archive.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list \
    && sed -i 's|security.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list
apt update

apt install -y mesa-utils glmark2
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

### 3 check OpenGL state

```
# glxinfo -B
OpenGL renderer string: llvmpipe (LLVM 15.0.7, 256 bits)

# eglinfo -B
X11 platform:
EGL vendor string: Mesa Project
```

If glxinfo and eglinfo does not show NVIDIA, the ORB-SLAM3 cannot show its map using OPENGL/EGL

### 4 GL problem in ORB-SLAM3

Run a sample of ORB-SLAM3 (after installing all the dependencies and building)

```bash
./Examples/Monocular-Inertial/mono_inertial_tum_vi \
    Vocabulary/ORBvoc.txt \
    Examples/Monocular-Inertial/TUM-VI.yaml \
    /dataset/tum/tumvi/exported/euroc/512_16/dataset-room1_512_16/mav0/cam0/data \
    Examples/Monocular-Inertial/TUM_TimeStamps/dataset-room1_512.txt \
    Examples/Monocular-Inertial/TUM_IMU/dataset-room1_512.txt
```

the ORB feature points images shows, but the MapViewer is black, and continues to print

MESA: error: Failed to attach to x11 shm

### 5 check nvidia .so files

```
# ls -l /usr/lib/x86_64-linux-gnu/*nvidia* | awk '{print $9, $10, $11}'
/usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.0 -> libEGL_nvidia.so.550.76
/usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.550.76  
/usr/lib/x86_64-linux-gnu/libGLESv1_CM_nvidia.so.1 -> libGLESv1_CM_nvidia.so.550.76
/usr/lib/x86_64-linux-gnu/libGLESv1_CM_nvidia.so.550.76  
/usr/lib/x86_64-linux-gnu/libGLESv2_nvidia.so.2 -> libGLESv2_nvidia.so.550.76
/usr/lib/x86_64-linux-gnu/libGLESv2_nvidia.so.550.76  
/usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0 -> libGLX_nvidia.so.550.76
/usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-cfg.so.1 -> libnvidia-cfg.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-cfg.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-eglcore.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-fbc.so.1 -> libnvidia-fbc.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-fbc.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-glcore.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-glsi.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-glvkspirv.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-ml.so.1 -> libnvidia-ml.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-ml.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-rtcore.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-tls.so.550.76
```

## Try 1: use nvidia/opengl

```bash
docker run --rm -it --gpus all -e DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix nvidia/opengl:1.0-glvnd-devel bash
```

glxgears cannot render, glmark2 crash

## Try 2 (final): add NVIDIA_DRIVER_CAPABILITIES


```bash
docker run --rm -it --gpus all -e DISPLAY -e NVIDIA_DRIVER_CAPABILITIES=all -v /tmp/.X11-unix:/tmp/.X11-unix nvidia/opengl:1.0-glvnd-devel bash
```

```
glmark2
=======================================================
    glmark2 2021.02
=======================================================
    OpenGL Information
    GL_VENDOR:     NVIDIA Corporation
    GL_RENDERER:   NVIDIA GeForce GTX 1080 Ti/PCIe/SSE2
    GL_VERSION:    4.6.0 NVIDIA 550.76
=======================================================
[build] use-vbo=false: FPS: 9481 FrameTime: 0.105 ms
[build] use-vbo=true: FPS: 20894 FrameTime: 0.048 ms
=======================================================
                                  glmark2 Score: 15187 
```

GOOD: FPS much larger (than 560 with llvmpipe)

```
glxinfo -B
name of display: :1
display: :1  screen: 0
direct rendering: Yes
Memory info (GL_NVX_gpu_memory_info):
    Dedicated video memory: 11264 MB
    Total available memory: 11264 MB
    Currently available dedicated video memory: 10808 MB
OpenGL vendor string: NVIDIA Corporation
```

eglinfo -B
EGL vendor string: NVIDIA

### check the nvidia .so files

```
# ls -l /usr/lib/x86_64-linux-gnu/*nvidia* | awk '{print $9, $10, $11}'
/usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.0 -> libEGL_nvidia.so.550.76
/usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.550.76  
/usr/lib/x86_64-linux-gnu/libGLESv1_CM_nvidia.so.1 -> libGLESv1_CM_nvidia.so.550.76
/usr/lib/x86_64-linux-gnu/libGLESv1_CM_nvidia.so.550.76  
/usr/lib/x86_64-linux-gnu/libGLESv2_nvidia.so.2 -> libGLESv2_nvidia.so.550.76
/usr/lib/x86_64-linux-gnu/libGLESv2_nvidia.so.550.76  
/usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0 -> libGLX_nvidia.so.550.76
/usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-allocator.so.1 -> libnvidia-allocator.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-allocator.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-cfg.so.1 -> libnvidia-cfg.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-cfg.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-eglcore.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-encode.so.1 -> libnvidia-encode.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-encode.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-fbc.so.1 -> libnvidia-fbc.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-fbc.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-glcore.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-glsi.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-glvkspirv.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-gpucomp.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-ml.so.1 -> libnvidia-ml.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-ml.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-ngx.so.1 -> libnvidia-ngx.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-ngx.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-nvvm.so.4 -> libnvidia-nvvm.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-nvvm.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-opencl.so.1 -> libnvidia-opencl.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-opencl.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-opticalflow.so -> libnvidia-opticalflow.so.1
/usr/lib/x86_64-linux-gnu/libnvidia-opticalflow.so.1 -> libnvidia-opticalflow.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-opticalflow.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-pkcs11-openssl3.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-pkcs11.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so.1 -> libnvidia-ptxjitcompiler.so.550.76
/usr/lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-rtcore.so.550.76  
/usr/lib/x86_64-linux-gnu/libnvidia-tls.so.550.76  
/usr/lib/x86_64-linux-gnu/libvdpau_nvidia.so.1 -> libvdpau_nvidia.so.550.76
/usr/lib/x86_64-linux-gnu/libvdpau_nvidia.so.550.76 
```

So, the NVIDIA_DRIVER_CAPABILITIES have critical effect on the .so files.

some important files like libnvidia-gpucomp.so.550.76 is not mounted without NVIDIA_DRIVER_CAPABILITIES

## Test: what if ubuntu:22.04 + NVIDIA_DRIVER_CAPABILITIES

```
docker run --rm -it --gpus all -e DISPLAY -e NVIDIA_DRIVER_CAPABILITIES=all -v /tmp/.X11-unix:/tmp/.X11-unix ubuntu:22.04 bash
```

result: glxinfo and glmark2  ok (with hardware render)
eglinfo: still Mesa (not NVIDIA)

This result in ORB-SLAM3 Map Viewer problem






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


## some notes

### note 1:/dev/dri is only for integrated graphics card, not for nvidia:

```
# do not use this with nvidia gpu when running docker
--device=/dev/dri:/dev/dri \
```

### note 2: unnecessary manual injection of nvidia drivers

```
      # for f in /usr/lib/x86_64-linux-gnu/*nvidia*.so*; do
      #   echo "- $f:$f:ro"
      # done      
      # - /usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.0:/usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.0:ro
      # - /usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.550.76:/usr/lib/x86_64-linux-gnu/libEGL_nvidia.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libGLESv1_CM_nvidia.so.1:/usr/lib/x86_64-linux-gnu/libGLESv1_CM_nvidia.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libGLESv1_CM_nvidia.so.550.76:/usr/lib/x86_64-linux-gnu/libGLESv1_CM_nvidia.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libGLESv2_nvidia.so.2:/usr/lib/x86_64-linux-gnu/libGLESv2_nvidia.so.2:ro
      # - /usr/lib/x86_64-linux-gnu/libGLESv2_nvidia.so.550.76:/usr/lib/x86_64-linux-gnu/libGLESv2_nvidia.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0:/usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.0:ro
      # - /usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.550.76:/usr/lib/x86_64-linux-gnu/libGLX_nvidia.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-allocator.so:/usr/lib/x86_64-linux-gnu/libnvidia-allocator.so:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-allocator.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-allocator.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-allocator.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-allocator.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-api.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-api.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-cfg.so:/usr/lib/x86_64-linux-gnu/libnvidia-cfg.so:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-cfg.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-cfg.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-cfg.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-cfg.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-container-go.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-container-go.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-container-go.so.1.13.5:/usr/lib/x86_64-linux-gnu/libnvidia-container-go.so.1.13.5:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-container.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-container.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-container.so.1.13.5:/usr/lib/x86_64-linux-gnu/libnvidia-container.so.1.13.5:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-eglcore.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-eglcore.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-egl-gbm.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-egl-gbm.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-egl-gbm.so.1.1.1:/usr/lib/x86_64-linux-gnu/libnvidia-egl-gbm.so.1.1.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-egl-wayland.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-egl-wayland.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-egl-wayland.so.1.1.13:/usr/lib/x86_64-linux-gnu/libnvidia-egl-wayland.so.1.1.13:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-encode.so:/usr/lib/x86_64-linux-gnu/libnvidia-encode.so:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-encode.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-encode.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-encode.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-encode.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-fbc.so:/usr/lib/x86_64-linux-gnu/libnvidia-fbc.so:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-fbc.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-fbc.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-fbc.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-fbc.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-glcore.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-glcore.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-glsi.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-glsi.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-glvkspirv.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-glvkspirv.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-gpucomp.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-gpucomp.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-gtk2.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-gtk2.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-gtk3.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-gtk3.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-ml.so:/usr/lib/x86_64-linux-gnu/libnvidia-ml.so:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-ml.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-ml.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-ml.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-ml.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-ngx.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-ngx.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-ngx.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-ngx.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-nvvm.so:/usr/lib/x86_64-linux-gnu/libnvidia-nvvm.so:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-nvvm.so.4:/usr/lib/x86_64-linux-gnu/libnvidia-nvvm.so.4:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-nvvm.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-nvvm.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-opencl.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-opencl.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-opencl.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-opencl.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-opticalflow.so:/usr/lib/x86_64-linux-gnu/libnvidia-opticalflow.so:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-opticalflow.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-opticalflow.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-opticalflow.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-opticalflow.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-pkcs11-openssl3.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-pkcs11-openssl3.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-pkcs11.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-pkcs11.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so:/usr/lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so.1:/usr/lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so.1:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-rtcore.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-rtcore.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-tls.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-tls.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libnvidia-wayland-client.so.550.76:/usr/lib/x86_64-linux-gnu/libnvidia-wayland-client.so.550.76:ro
      # - /usr/lib/x86_64-linux-gnu/libvdpau_nvidia.so:/usr/lib/x86_64-linux-gnu/libvdpau_nvidia.so:ro

```



### note4: OpenGL, GLVND, GLX/EGL


| Component  | Role                                                                           |
| ---------- | ------------------------------------------------------------------------------ |
| **OpenGL** | The actual rendering API (glDraw*, etc.).                                      |
| **GLX**    | X11-specific binding that creates OpenGL contexts and windows.                 |
| **EGL**    | Cross-platform context/surface creation API for OpenGL, OpenGL ES, and Vulkan. |
| **GLVND**  | Vendor-neutral dispatcher for OpenGL, GLX, and EGL.                            |



```
                ┌───────────────────┐
                │       Your App    │
                └──────────┬────────┘
                           │
           OpenGL API Calls│
───────────────────────────▼────────────────────────
                ┌───────────────────┐
                │       GLVND       │ (libGL, libEGL, libGLX)
                └──────────┬────────┘
                           │dispatch
───────────────────────────▼────────────────────────
     ┌──────────────────────────┬─────────────────────────┐
     │                          │                         │
┌────▼────┐               ┌─────▼─────┐             ┌────▼─────┐
│ GLX ICD │               │ EGL ICD   │             │ GL ICD    │
│ (Nvidia │               │ (Nvidia   │             │ (Nvidia   │
│ /Mesa)  │               │ /Mesa)    │             │ /Mesa)    │
└────┬────┘               └─────┬─────┘             └────┬─────┘
     │                           │                         │
─────────────── Different mechanisms to create OpenGL context ───────────────
     │                           │                         │
┌────▼────┐               ┌──────▼──────┐           ┌──────▼──────┐
│ X11     │               │ Wayland     │           │ FBDev/DRM    │
│ Window  │               │ Surface     │           │ (Headless)   │
└─────────┘               └─────────────┘           └──────────────┘


```