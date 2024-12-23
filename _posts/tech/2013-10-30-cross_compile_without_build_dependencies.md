---
title: 'ros2/arm免依赖交叉编译教程'
date: 2023-10-30
permalink: /posts/2023/10/cross_compile_without_build_dependencies
categories: tech
---

使用qemu运行arm docker模拟器，在模拟器中使用apt安装依赖后，将docker容器文件系统导出，作为cmake的sysroot，避免编译依赖。本文以ROS2为例，但方法并不限于ROS2

这个办法已过时，请参阅新方法：https://xoofee.github.io/posts/2024/12/cross_compile_in_ubuntu 

* TOC
{:toc}

# 1. 安装交叉编译工具
```bash
sudo apt install g++-aarch64-linux-gnu gcc-aarch64-linux-gnu
```

# 2. 配置qemu（仅需执行一次）
```bash
# 如果apt安装qemu有问题，可只安装后两个
sudo apt-get install qemu binfmt-support qemu-user-static

docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
# 可能某些情况下需要：
sudo update-binfmts --enable qemu-aarch64
sudo dpkg --add-architecture arm64
```

# 3. 下载并运行ros arm容器
```bash
sudo docker pull arm64v8/ros:humble
# 如拉取失败可以尝试增加platform参数 sudo docker pull --platform linux/arm64 arm64v8/ubuntu:24.04
sudo docker run -itd --privileged=true --net=host -v /work:/work --name arm_humble arm64v8/ros:humble bash

# 配置时区(可选)
echo "Asia/Shanghai" > /etc/timezone
dpkg-reconfigure -f noninteractive tzdata

```

# 4. 容器中安装所需要的依赖
```bash
sudo docker exec -it arm_humble /bin/bash
```

## 4.1. 配置国内源加速(仅需执行一次)
```bash
sed -i s@/ports.ubuntu.com/@/mirrors.aliyun.com/@g /etc/apt/sources.list
apt update

## 安装依赖
apt install -y ...
```

(可考虑将上述操作做成DOCKERFILE)

# 5. 导出docker容器文件系统
```bash
# 方式一（推荐）
mkdir -p /work/temp/arm_humble
sudo docker export arm_humble | tar xv -C /work/temp/arm_humble/

# 方式二，先存成tar文件，再解压
sudo docker export arm_humble --output /work/temp/arm_humble.tar
sudo tar xfv arm_humble.tar -C /work/temp/arm_humble/
```

以下步骤涉及到python的，请根据实际python版本修改。如交叉编译ROS，需要处理python问题。如与python/ros无关，则可忽略下文与python相关内容

# 6. 创建toolchain，并指定sysroot为docker文件系统

创建aarch64-linux-gnu.toolchain.cmake(仅操作一次)

```bash

    # aarch64-linux-gnu.toolchain.cmake
    set(CMAKE_C_COMPILER "aarch64-linux-gnu-gcc")
    set(CMAKE_CXX_COMPILER "aarch64-linux-gnu-g++")
    set(CMAKE_SYSROOT "/work/temp/arm_humble")

    set(PYTHON_SOABI cpython-310-aarch64-linux-gnu)
    set(PythonExtra_EXTENSION_SUFFIX cpython-310-aarch64-linux-gnu)    

    set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
    set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
    set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
```

# 7. 拷贝创建python3.10 (如果工程需要Python,如ROS)

```bash
sudo cp /work/temp/arm_humble/usr/lib/aarch64-linux-gnu/libpython3.10.so /usr/lib/aarch64-linux-gnu/libpython3.10.so
```

由于cmake的bug，/usr/lib/aarch64-linux-gnu/libpython3.10.so这个依赖没有做好sysroot下的映射，导致make时找不到这个文件，临时解决办法是拷贝到host中。

# 8. 编译时指定toolchain

```bash
# colcon
MAKEFLAGS=-j13 colcon build --cmake-args -DCMAKE_TOOLCHAIN_FILE=`pwd`/aarch64-linux-gnu.toolchain.cmake --packages-up-to all_in_ncu_launch 

# cmake
cmake .. -DCMAKE_TOOLCHAIN_FILE=`pwd`/aarch64-linux-gnu.toolchain.cmake -DCMAKE_BUILD_TYPE=Release
```

# 9. FAQ

## 9.1. 交叉编译时缺包

PC上编译通过，但交叉编译不行，可能是依赖包没有。需要在容器中安装后再导出来

例如：编译can_dbc_parser时，报
    /usr/lib/gcc-cross/aarch64-linux-gnu/11/../../../../aarch64-linux-gnu/bin/ld: /opt/ros/humble/lib/libcan_msgs__rosidl_typesupport_fastrtps_c.so: error adding symbols: file in wrong format

检查主机中有/opt/ros/humble/lib/libcan_msgs__rosidl_typesupport_fastrtps_c.so文件，但容器中没有

检查can_dbc_parser依赖（package.xml），发现依赖can_msgs包，容器中未安装，在容器中安装

```apt install ros-humble-can-msgs```

若导出后编译仍然报同样的错。**删除build install目录后，重新编译OK**。
