---
title: "SSH into a VMware Windows Guest Without Giving It Internet Access"
date: 2026-09-17
permalink: /posts/2026/09/ssh-vmware-windows-host-only-network/
categories: tech
tags: [vmware, windows, ubuntu, ssh, networking]
excerpt: "Use VMware Host-only networking to SSH from Ubuntu into a Windows 10 guest, with an optional NAT adapter that stays disconnected when Internet access is unnecessary."
---

I wanted to SSH from my Ubuntu host into a Windows 10 guest in VMware Workstation while keeping the guest disconnected from the Internet. **Adding a Host-only network adapter gave the VM a private connection to Ubuntu.** The existing NAT adapter could stay available for occasional Internet access, but disconnected during normal use.

The distinction is simple: Host-only provides host-to-guest communication without providing Internet access by itself. NAT provides a route out through the host. With separate adapters, I can control those connections independently.

* TOC
{:toc}

## Why the Existing Addresses Did Not Match

Ubuntu already had VMware's Host-only interface:

```text
vmnet1
172.16.70.1/24
```

However, the Windows VM had only one VMware network adapter, configured as **NAT**. Windows received this address on that connection:

```text
192.168.209.128
```

That address belonged to the NAT network, `vmnet8`, in this setup. Having `vmnet1` on Ubuntu did not automatically connect the guest to it; the VM needed an adapter attached to that network.

Windows also showed:

```text
vEthernet (Default Switch)
172.26.32.1
```

This was a Hyper-V virtual adapter inside Windows. It was unrelated to VMware's `vmnet1` and was not the address to use for the intended Host-only connection.

These subnets describe this machine's configuration. Other VMware installations may use different address ranges.

## Add a Host-only Adapter

With Windows shut down, open:

**VMware Workstation → VM Settings → Add... → Network Adapter**

Configure the new adapter as **Host-only**, connected to `vmnet1` in this setup. Keep the existing NAT adapter if occasional Internet access is useful.

Because NAT was the original adapter, the configuration will typically look like this:

```text
Network Adapter
    NAT → vmnet8

Network Adapter 2
    Host-only → vmnet1
```

The adapter numbers are not important. What matters is that one connects to the Host-only network and the other, if retained, connects to NAT.

Leave the Host-only adapter connected and enable **Connect at power on** for it. For the NAT adapter, clear **Connect at power on** and make sure it is disconnected when the guest should be offline.

The resulting topology is:

```text
                         ┌── NAT ────────→ Internet
                         │   192.168.209.x  (when connected)
Windows VM ──────────────┤
                         │
                         └── Host-only ──→ Ubuntu host
                             172.16.70.x
```

## Connect from Ubuntu

Start Windows and run `ipconfig` to find the address assigned to the new Host-only adapter. For example:

```text
Ubuntu host:    172.16.70.1
Windows guest:  172.16.70.128
```

From Ubuntu, connect to the guest's Host-only address:

```bash
ssh xfusb@172.16.70.128
```

Replace the username and address with those for your guest. This assumes Windows already has an SSH server installed and running, and that its firewall permits inbound SSH on the Host-only connection. Adding a network adapter provides connectivity; it does not enable the SSH service.

If the connection fails, check the guest's current IP address, the Host-only adapter's connection state, the SSH service, and the Windows firewall rule for that interface's network profile.

## Keep SSH Available While Internet Access Is Off

Host-only networking allows communication between:

- The host and the guest, in either direction.
- Guests attached to the same Host-only network.

It does not provide Internet access by itself. With the NAT adapter disconnected, SSH can continue over `vmnet1`:

```text
Ubuntu host                 Windows guest
172.16.70.1 ─── vmnet1 ─── 172.16.70.128
```

**Adding Host-only does not disable an existing NAT connection.** To keep this VM offline, disconnect NAT and any other adapter that provides Internet access. This also assumes the host has not been configured to route or share Internet access onto the Host-only network.

When Windows needs Internet access, reconnect NAT temporarily. Disconnect it again afterward, leaving Host-only connected for SSH and management.

## Why Port 22 Does Not Conflict

VMware Host-only networking is different from Docker's `network_mode: host`. The Windows guest has its own network stack and IP address, so Ubuntu and Windows can both run SSH on port 22:

```text
Ubuntu:   172.16.70.1:22
Windows:  172.16.70.128:22
```

These are separate endpoints. No host port forwarding is needed for Ubuntu to reach the guest's Host-only address.

With Docker host networking on Linux, a container shares the host's network namespace, so services compete for ports within that shared namespace. VMware's Host-only network does not merge the host and guest network stacks.

## The Final Configuration

For this Windows VM, the normal configuration is:

```text
Windows VM
│
├── Host-only → vmnet1 → 172.16.70.x
│   └── Connected: SSH and host communication
│
└── NAT → vmnet8 → 192.168.209.x
    └── Disconnected: reconnect only when Internet access is needed
```

The missing step was **VM Settings → Add... → Network Adapter → Host-only**. Keeping NAT disconnected then lets the guest stay accessible from Ubuntu without an Internet connection through VMware NAT.
