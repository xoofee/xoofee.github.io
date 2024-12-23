---
title: 'install arm64 package in x86 ubuntu for cross compile'
date: 2024-12-23
permalink: /posts/2024/12/install_arm64_package_in_x86_ubuntu_for_cross_compile/ 
categories: tech
---

Install arm64 package directly in x86 ubuntu for cross compile.

this is a replacement for [cross_compile_without_build_dependencies](https://xoofee.github.io/posts/2023/10/cross_compile_without_build_dependencies)

* TOC
{:toc}

# 1. Add arm64 sources (example in ubuntu 24.04 noble)

/etc/apt/sources.list.d/ubuntu.sources

```bash
/etc/apt/sources.list.d$ cat ubuntu.sources
Types: deb
URIs: http://mirrors.aliyun.com/ubuntu/
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Architectures: amd64
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://security.ubuntu.com/ubuntu/
Suites: noble-security
Components: main restricted universe multiverse
Architectures: amd64
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

/etc/apt/sources.list.d/arm64.sources

```
Types: deb
URIs: http://mirrors.aliyun.com/ubuntu-ports/
Suites: noble noble-updates noble-backports
Components: main universe restricted multiverse
Architectures: arm64
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

## Ubuntu security updates. Aside from URIs and Suites,
## this should mirror your choices in the previous section.
Types: deb
URIs: http://mirrors.aliyun.com/ubuntu-ports/
Suites: noble-security
Components: main universe restricted multiverse
Architectures: arm64
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

you could check to see that the arm64 package is available in the website: http://mirrors.aliyun.com/ubuntu-ports/dists/noble/
```
Parent directory/	-	-
Contents-arm64.gz	48.8 MB	2024-04-24 14:39
Contents-armhf.gz	45.3 MB	2024-04-24 17:53
Contents-ppc64el.gz	46.8 MB	2024-04-24 19:50
Contents-riscv64.gz	45.4 MB	2024-04-24 21:09
Contents-s390x.gz	45.4 MB	2024-04-24 22:24
```


# 2. add arm64 architecture for apt
```bash
sudo dpkg --add-architecture arm64
sudo apt update
```

# 3. install dependencies
example we want to built nano, which depends on ncurses
```
sudo apt install libncurses-dev:arm64
```
this will install to /usr/aarch64-linux-gnu

# 4. compile nano
```bash
wget https://www.nano-editor.org/dist/v6/nano-6.2.tar.xz
tar zxvf nano-6.2.tar.xz
cd nano-6.2
#  CFLAGS="-static-libgcc -static" CXXFLAGS="-static-libgcc -static-libstdc++ -static" LDFLAGS="-static" could be removed if you don't want to build static binary
CC=aarch64-linux-gnu-gcc CXX=aarch64-linux-gnu-g++ CFLAGS="-static-libgcc -static" CXXFLAGS="-static-libgcc -static-libstdc++ -static" LDFLAGS="-static" ./configure --host=aarch64-linux-gnu --build=x86_64-pc-linux-gnu
make
# check the binary
ls src/nano
```