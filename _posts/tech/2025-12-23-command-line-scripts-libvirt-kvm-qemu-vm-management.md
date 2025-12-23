---
title: "Command-Line Scripts for Virtual Machine Management with Libvirt/KVM/QEMU"
date: 2025-12-23
permalink: /posts/2025/12/command-line-scripts-libvirt-kvm-qemu-vm-management/
categories: tech
tags: [libvirt, kvm, qemu, virtualization, command-line, scripts, vm-management, linux]
excerpt: "A collection of command-line scripts and tools for managing virtual machines using Libvirt, KVM, and QEMU, covering common VM operations, automation, and best practices."
---

This post provides command-line scripts and tools for managing virtual machines with Libvirt, KVM, and QEMU. These scripts help automate common VM operations and streamline virtualization workflows.

* TOC
{:toc}

## Overview

Libvirt provides a unified API for managing various virtualization technologies, including KVM/QEMU. This post covers:

- **VM lifecycle management**: create, start, stop, delete
- **Resource monitoring**: CPU, memory, disk usage
- **Network configuration**: bridges, NAT, host networking
- **Storage management**: disk images, snapshots, backups
- **Automation scripts**: batch operations, monitoring, maintenance

## A script for vm creation

```bash

#!/usr/bin/env bash

# Sample commands:
# ./setup_kvm.sh my-vm 16384 8 2048
# ./setup_kvm.sh my-vm 16384 8 2048 --force  # force to overwrite existing vm files/disk
# ./setup_kvm.sh my-vm 262144 64 4096  # 256GB RAM, 64 vCPUs (268435456 KiB = 262144 MB)
#
# Arguments:
#   $1: VM name
#   $2: RAM in MB
#   $3: vCPUs
#   $4: Disk size in GB (sparse qcow2)
#   $5: Optional --force or --clean flag

# sudo apt install -y qemu-kvm libvirt-bin virtinst cloud-image-utils
# sudo usermod -aG libvirt $USER
# newgrp libvirt  # or log out/in
# wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img

set -euo pipefail


# -----------------------------
# ARG PARSE
# -----------------------------
if [[ $# -lt 4 ]]; then
    echo "Usage: $0 <vm-name> <ram-mb> <vcpus> <disk-size-gb> [--force|--clean]"
    echo ""
    echo "Examples:"
    echo "  $0 my-vm 16384 8 2048"
    echo "  $0 my-vm 16384 8 2048 --force"
    echo "  $0 my-vm 262144 64 4096  # 256GB RAM, 64 vCPUs"
    exit 1
fi

VM_NAME="$1"
VM_RAM="$2"
VM_VCPUS="$3"
VM_DISK_SIZE="$4"          # GB (sparse qcow2)
FORCE=false

if [[ "${5:-}" == "--force" || "${5:-}" == "--clean" ]]; then
    FORCE=true
fi

# -----------------------------
# VALIDATE ARGUMENTS
# -----------------------------
if ! [[ "$VM_RAM" =~ ^[0-9]+$ ]]; then
    echo "Error: RAM must be a positive integer (got: $VM_RAM)"
    exit 1
fi

if ! [[ "$VM_VCPUS" =~ ^[0-9]+$ ]]; then
    echo "Error: vCPUs must be a positive integer (got: $VM_VCPUS)"
    exit 1
fi

if ! [[ "$VM_DISK_SIZE" =~ ^[0-9]+$ ]]; then
    echo "Error: Disk size must be a positive integer (got: $VM_DISK_SIZE)"
    exit 1
fi

# -----------------------------
# CONFIG
# -----------------------------
VM_DISK="${VM_NAME}.qcow2"
CLOUD_IMG="noble-server-cloudimg-amd64.img"
NETWORK="default"

SSH_PUBKEY="${HOME}/.ssh/id_rsa.pub"   # industrial standard
CLOUD_INIT_DIR="./cloud-init/${VM_NAME}"
SEED_ISO="${CLOUD_INIT_DIR}/seed.iso"

# -----------------------------
# PRECHECKS
# -----------------------------
for cmd in virt-install virsh cloud-localds qemu-img; do
    command -v "$cmd" >/dev/null || {
        echo "Missing $cmd"
        echo "Install: sudo apt install -y qemu-kvm libvirt-daemon-system virtinst cloud-image-utils"
        exit 1
    }
done

[[ -f "$CLOUD_IMG" ]] || { echo "Cloud image not found"; exit 1; }
[[ -f "$SSH_PUBKEY" ]] || { echo "SSH public key not found: $SSH_PUBKEY"; exit 1; }

# -----------------------------
# CLEANUP
# -----------------------------
if $FORCE; then
    virsh destroy "$VM_NAME" &>/dev/null || true
    virsh undefine "$VM_NAME" &>/dev/null || true
    rm -f "$VM_DISK"
    rm -rf "$CLOUD_INIT_DIR"
fi

if virsh dominfo "$VM_NAME" &>/dev/null; then
    echo "VM already exists. Use --force"
    exit 1
fi

# -----------------------------
# CLOUD-INIT
# -----------------------------
mkdir -p "$CLOUD_INIT_DIR"

cat > "${CLOUD_INIT_DIR}/meta-data" <<EOF
instance-id: ${VM_NAME}
local-hostname: ${VM_NAME}
EOF

cat > "${CLOUD_INIT_DIR}/user-data" <<EOF
#cloud-config
users:
  - name: ubuntu
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - $(cat "$SSH_PUBKEY")

ssh_pwauth: false
disable_root: true

package_update: true
packages:
  - python-is-python3
  - nfs-common

final_message: "Cloud-init finished. SSH ready."
EOF

cloud-localds "$SEED_ISO" \
    "${CLOUD_INIT_DIR}/user-data" \
    "${CLOUD_INIT_DIR}/meta-data"

# -----------------------------
# DISK
# -----------------------------
mkdir -p "$(dirname "$VM_DISK")"

qemu-img create \
    -f qcow2 \
    -b "$CLOUD_IMG" \
    -F qcow2 \
    "$VM_DISK" \
    "${VM_DISK_SIZE}G"

# -----------------------------
# VM CREATE
# -----------------------------
#   --os-variant ubuntu24.04 not supported by virt-install  1.5.1
virt-install \
  --name "$VM_NAME" \
  --memory "$VM_RAM" \
  --vcpus "$VM_VCPUS" \
  --disk path="$VM_DISK",bus=virtio,cache=none,io=native,discard=unmap \
  --disk path="$SEED_ISO",device=cdrom \
  --import \
  --network network="$NETWORK",model=virtio \
  --graphics none \
  --console pty,target_type=serial \
  --noautoconsole

echo
echo "========================================"
echo "VM CREATED SUCCESSFULLY"
echo "========================================"
echo "Get IP:"
echo "  virsh domifaddr $VM_NAME"
echo
echo "Login:"
echo "  ssh ubuntu@<VM_IP>"
echo
echo "Console (debug only):"
echo "  virsh console $VM_NAME"
echo "you should wait 3-5 minutes for the VM to set up for the first !!! Otherwise, you cannot access via ssh"


```

## Prerequisites

```bash
# Install required packages (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virt-manager

# Verify installation
virsh list --all
```

## to mount folders front host

### server
/etc/exports
```
/work  192.168.122.0/24(rw,sync,no_subtree_check,no_root_squash)
/nfs  192.168.122.0/24(rw,sync,no_subtree_check,no_root_squash)
```

### client

/etc/fstab
```
192.168.122.1:/work  /work  nfs  rw,exec,_netdev,hard,intr,timeo=600,retrans=5  0  0
192.168.122.1:/nfs  /nfs  nfs  rw,exec,_netdev,hard,intr,timeo=600,retrans=5  0  0
```


## script for some app installation (skip if you do not want)

```bash
TZ=Asia/Shanghai
sudo ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ | sudo tee /etc/timezone

sudo sed -i 's|archive.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/ubuntu.sources \
    && sudo sed -i 's|security.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/ubuntu.sources \
    && sudo apt update

# ------------------------------------------------------------------- basic tools
sudo apt install -y git wget netcat-openbsd tmux curl

# ------------------------------------------------------------------- python
sudo apt install -y python3 python3-pip python3-virtualenv
sudo pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

export BIOPY=$HOME/pyenvs/bio
virtualenv $BIOPY
echo "source $HOME/pyenvs/bio/bin/activate" >> $HOME/.bashrc


# ------------------------------------------------------------------- jupyter
$BIOPY/bin/pip install jupyterlab jupyter-collaboration

export JUPYTER_CONFIG_DIR=$HOME/.jupyter
mkdir -p $JUPYTER_CONFIG_DIR

echo 'c.ServerApp.password = "......' >> $JUPYTER_CONFIG_DIR/jupyter_server_config.py

# ------------------------------------------------------------------- R core
sudo apt install -y r-base r-base-dev

# Speed up R compilation
echo "MAKEFLAGS=-j$(nproc)" | sudo tee -a /etc/R/Makeconf
export MAKEFLAGS="-j$(nproc)"  # Fixed: added export with $(nproc)

# the default repos sometimes cause download error, the tsinghua is very stable
R_VERSION=$(Rscript -e 'cat(paste0(R.version$major, ".", strsplit(R.version$minor, "[.]")[[1]][1]))') && \
    mkdir -p ~/R/x86_64-pc-linux-gnu-library/${R_VERSION} && \
    echo ".libPaths('~/R/x86_64-pc-linux-gnu-library/${R_VERSION}')" >> ~/.Rprofile

echo 'options(repos = c(CRAN = "https://mirrors.tuna.tsinghua.edu.cn/CRAN/"))' >> ~/.Rprofile

Rscript -e 'install.packages("IRkernel"); IRkernel::installspec(user = TRUE)'

# ------------------------------------------------------------------- R application
# required by Seurat (as the installation message hint)
sudo apt install -y libcurl4-openssl-dev libssl-dev
# Matrix is already bundled with R-base
Rscript -e 'install.packages("Seurat")'

Rscript -e 'install.packages(c("ggplot2", "data.table"))'

sudo apt install -y libudunits2-dev libssl-dev cmake libgdal-dev libgeos-dev libproj-dev libsqlite3-dev libudunits2-dev
Rscript -e 'install.packages("sf")'
Rscript -e 'install.packages("R.utils")'

# ------------------------------------------------------------------ docker
sudo apt-get install -y ca-certificates curl gnupg \
 && sudo install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/debian/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://mirrors.aliyun.com/docker-ce/linux/debian trixie stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null \
 && sudo apt-get update \
 && sudo apt install -y docker.io

 ```


- jupyter service

```

mkdir -p ~/.config/systemd/user/
vi ~/.config/systemd/user/jupyter.service

[Unit]
Description=Jupyter Notebook

[Service]
Type=simple
ExecStart=/home/ubuntu/pyenvs/bio/bin/jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --notebook-dir=/ --collaborative
WorkingDirectory=/home/ubuntu

[Install]
WantedBy=default.target

# setup
loginctl enable-linger 
systemctl --user enable jupyter
systemctl --user start jupyter


```


## Basic VM Operations

### List All VMs

```bash
# List all VMs (running and stopped)
virsh list --all

# List only running VMs
virsh list

# List with more details
virsh list --all --details
```

### Start/Stop/Restart VMs

```bash
# Start a VM
virsh start <vm-name>

# Stop a VM (graceful shutdown)
virsh shutdown <vm-name>

# Force stop a VM
virsh destroy <vm-name>

# Restart a VM
virsh reboot <vm-name>
```

### VM Information

```bash
# Get VM details
virsh dominfo <vm-name>

# Get VM configuration
virsh dumpxml <vm-name>

# Get VM statistics
virsh domstats <vm-name>
```

## Script Examples

### Script 1: VM Status Checker

```bash
#!/bin/bash
# vm-status.sh - Check status of all VMs

echo "=== Virtual Machine Status ==="
echo ""

virsh list --all | tail -n +3 | while read line; do
    if [ -n "$line" ]; then
        vm_name=$(echo $line | awk '{print $2}')
        state=$(echo $line | awk '{print $3}')
        echo "VM: $vm_name - State: $state"
    fi
done
```

### Script 2: Batch VM Operations

```bash
#!/bin/bash
# batch-vm-ops.sh - Perform operations on multiple VMs

ACTION=$1
VM_LIST=("vm1" "vm2" "vm3")

if [ -z "$ACTION" ]; then
    echo "Usage: $0 <start|stop|restart|status>"
    exit 1
fi

for vm in "${VM_LIST[@]}"; do
    echo "Processing $vm..."
    case $ACTION in
        start)
            virsh start $vm
            ;;
        stop)
            virsh shutdown $vm
            ;;
        restart)
            virsh reboot $vm
            ;;
        status)
            virsh dominfo $vm | grep "State:"
            ;;
    esac
done
```

### Script 3: VM Resource Monitor

```bash
#!/bin/bash
# vm-monitor.sh - Monitor VM resource usage

VM_NAME=$1

if [ -z "$VM_NAME" ]; then
    echo "Usage: $0 <vm-name>"
    exit 1
fi

while true; do
    clear
    echo "=== Resource Monitor for $VM_NAME ==="
    echo ""
    
    # CPU usage
    echo "CPU Usage:"
    virsh domstats $VM_NAME --cpu | grep -E "cpu.time|cpu.usage"
    
    # Memory usage
    echo ""
    echo "Memory Usage:"
    virsh domstats $VM_NAME --balloon | grep -E "balloon.current|balloon.maximum"
    
    # Disk I/O
    echo ""
    echo "Disk I/O:"
    virsh domstats $VM_NAME --block | grep -E "block.*rd.bytes|block.*wr.bytes"
    
    sleep 2
done
```

## Advanced Operations



### Snapshot Management

```bash
# Create snapshot
virsh snapshot-create-as <vm-name> --name snapshot1 --description "Before update"

# List snapshots
virsh snapshot-list <vm-name>

# Revert to snapshot
virsh snapshot-revert <vm-name> snapshot1

# Delete snapshot
virsh snapshot-delete <vm-name> snapshot1
```

### Network Configuration

```bash
# List networks
virsh net-list --all

# Network information
virsh net-info default

# Start/stop network
virsh net-start default
virsh net-destroy default
```

## Best Practices

1. **Backup VM configurations**: Regularly export VM XML configurations
2. **Monitor resources**: Set up alerts for CPU, memory, and disk usage
3. **Use snapshots**: Create snapshots before major changes
4. **Network isolation**: Use separate networks for different VM groups
5. **Storage management**: Monitor disk space and implement cleanup policies

## Troubleshooting

### Common Issues

```bash
# Check libvirt service status
sudo systemctl status libvirtd

# Restart libvirt service
sudo systemctl restart libvirtd

# Check VM logs
virsh console <vm-name>

# View VM errors
virsh dominfo <vm-name> | grep -i error
```

## Summary

These command-line scripts and tools provide a foundation for managing virtual machines with Libvirt/KVM/QEMU. They can be extended and customized based on specific requirements and environments.

## References

- [Libvirt Documentation](https://libvirt.org/docs.html)
- [QEMU Documentation](https://www.qemu.org/documentation/)
- [KVM Documentation](https://www.linux-kvm.org/page/Documents)

