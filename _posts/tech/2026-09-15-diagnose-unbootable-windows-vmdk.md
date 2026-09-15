---
title: "A VMDK Passed Its Integrity Check but Would Not Boot: Diagnosing Missing Disk Metadata"
date: 2026-09-15
permalink: /posts/2026/09/diagnose-unbootable-windows-vmdk/
categories: tech
tags: [vmware, windows, vmdk, qemu, ntfs, troubleshooting]
excerpt: "A read-only investigation found surviving Windows file records inside a structurally valid VMDK, but missing partition tables and damaged NTFS metadata explained why VMware could not boot it."
---

A Windows virtual disk would not boot in VMware. The obvious questions were whether the VMDK was corrupt, whether it actually contained Windows, and whether the VM simply used the wrong firmware or disk controller.

The investigation found **a structurally valid VMDK containing damaged disk contents**. VMware could open the image, and Windows file records survived, but the partition table was missing and an NTFS metadata copy was zeroed. A successful image integrity check did not mean the guest disk was healthy.

Image and VM filenames and working paths below are fictional examples; standard Windows directory names are unchanged. Numerical disk offsets are retained because they explain how the diagnosis was made. The inspection did not modify the source image or VM configuration.

* TOC
{:toc}

## Separate the Questions Before Choosing Tools

There are several layers between a host file and a running Windows installation:

| Layer | Question | Evidence used |
| --- | --- | --- |
| VMDK container | Can the image format be read consistently? | `qemu-img info` and `qemu-img check` |
| Virtual hardware | Does VMware open and attach the disk? | VM configuration and VMware log |
| Disk layout | Can firmware locate partitions? | Raw sectors, partition tools, allocation map |
| Filesystem | Is the NTFS volume readable? | Boot-sector fields, `ntfsinfo`, `ntfsls`, file records |
| Windows installation | Are the OS and boot files complete and usable? | Only partially investigated here |

Passing one layer does not establish that the next layer works. That distinction became the central finding.

## 1. Check the Container and VMware's View

With the VM powered off, I started with the equivalent of:

```bash
qemu-img info --output=json example-windows.vmdk
qemu-img check example-windows.vmdk
```

The image was a standalone `monolithicSparse` VMDK, with a virtual capacity of 256,060,555,264 bytes, approximately 238.47 GiB. Its host file occupied about 13 GB. That size difference alone is normal for a sparse image.

The integrity check returned:

```text
No errors were found on the image.
```

This established that QEMU found no VMDK structural errors. It did **not** check the Windows filesystem or certify bootability. I used no repair option. The [QEMU image utility documentation](https://www.qemu.org/docs/master/tools/qemu-img.html) describes the image checking and allocation mapping commands.

I also inspected the VM configuration and searched its log:

```bash
rg -n 'firmware|nvme|sata|scsi|fileName' example-vm.vmx
rg -in 'DISK: OPEN|vmdk|nvme|SecureBootMode|error|fail' vmware.log
```

The VM used EFI firmware, Secure Boot was disabled, and the disk was attached through NVMe. The log showed that VMware successfully opened the VMDK and created the virtual disk device.

A missing host CD-ROM device also appeared in the log, but it concerned the optical drive. It did not explain the disk contents discovered next.

## 2. Expose the Guest Disk Without Copying It

Running `fdisk` directly on a sparse VMDK would examine the container rather than the decoded guest sectors. I needed a raw view of the virtual disk.

The host had QEMU's storage daemon and FUSE support. A read-only FUSE export provided that view without creating a 238 GiB raw copy or requiring a kernel NBD device. QEMU documents this approach in [Presenting guest images as raw image files with FUSE](https://www.qemu.org/2021/08/22/fuse-blkexport/).

A cleaned-up version of the commands is:

```bash
image_path="$(realpath example-windows.vmdk)"
inspect_dir="$(mktemp -d /tmp/vmdk-inspect.XXXXXX)"
touch "$inspect_dir/disk.raw"

qemu-storage-daemon \
  --blockdev "driver=file,node-name=src,filename=$image_path,read-only=on" \
  --blockdev driver=vmdk,node-name=disk,file=src,read-only=on \
  --export "type=fuse,id=inspect,node-name=disk,mountpoint=$inspect_dir/disk.raw,writable=off,allow-other=off" \
  --pidfile "$inspect_dir/disk.pid" \
  --daemonize
```

Both block nodes are read-only, and the export disallows writes. `allow-other=off` keeps access with the current user and avoids needing the `user_allow_other` setting in the host's FUSE configuration.

While the daemon runs, opening `disk.raw` returns decoded guest sectors. It is not a full raw copy saved to disk.

## 3. Find Out Why No Partitions Appear

I inspected the raw view:

```bash
fdisk -l "$inspect_dir/disk.raw"
sgdisk -v "$inspect_dir/disk.raw"
xxd -l 512 "$inspect_dir/disk.raw"
```

`fdisk` reported disk geometry but listed no partitions. The first 512 bytes were entirely zero: there was no MBR partition table or boot signature. The next sector, where a primary GPT header would normally reside on this disk, was also zero.

One potentially misleading result was `sgdisk` reporting:

```text
Creating new GPT entries in memory.

No problems found.
```

In context, this was not confirmation of an existing healthy GPT. It had created an empty layout **in memory** after finding no usable table. No write operation was requested.

The allocation map made the extent of the missing data clearer:

```bash
qemu-img map --output=json example-windows.vmdk > "$inspect_dir/map.json"
```

Its first extent was:

```json
{
  "start": 0,
  "length": 3222274048,
  "present": false,
  "zero": true,
  "data": false
}
```

The first **3,222,274,048 virtual bytes** were unallocated and read as zeros. This includes the initial partition metadata and the space where early boot partitions would commonly be located. The final sector at the capacity reported by `qemu-img info` was also zero.

There is a small tooling detail here: the FUSE file's reported size was rounded slightly upward. I used the VMDK's declared virtual capacity when checking its last sector, rather than treating that rounded file length as the authoritative disk boundary.

## 4. Search Surviving Data for Filesystem Signatures

No partition table does not mean no filesystem data survives. I scanned all allocated extents for sector-aligned signatures, including:

- `EFI PART` at the beginning of a sector.
- `NTFS    ` at byte 3 of a candidate boot sector.
- FAT16 and FAT32 identifiers at their expected boot-sector offsets.

The allocation map let the scan skip ranges already known to return zeros. For this uncompressed image, mapped data extents had backing-file offsets, so the scanner read those physical ranges and translated matches back into virtual disk offsets. This optimization should not be applied blindly to compressed images or other mapping layouts.

A signature is only a candidate. Embedded disk images or arbitrary file contents can contain the same bytes. I checked sector alignment, the `55 aa` boot signature, and the fields describing sector size, cluster size, volume length, and metadata locations.

No sector-aligned GPT header or FAT16/FAT32 boot-sector signature was found. This supported the missing-boot-metadata diagnosis; a signature scan alone is not a complete filesystem recovery analysis.

The significant NTFS candidates were:

| Virtual byte offset | Interpretation |
| --- | --- |
| 214,749,412,864 | Consistent with the backup boot sector of an earlier 200 GiB NTFS volume |
| 214,749,413,376 | Start of a surviving NTFS volume of about 38.38 GiB |

The earlier candidate's size and starting-sector fields fit an ending sector at its observed position. Its expected primary boot sector lay in the zeroed region.

There were also tiny NTFS candidates inside the surviving data. I did not treat every signature as another top-level partition.

## 5. Inspect the Surviving NTFS Volume

The later boot sector supplied these values:

| Field | Value |
| --- | --- |
| Actual starting LBA, using 512-byte sectors | 419,432,448 |
| Bytes per sector | 512 |
| Sectors per cluster | 8 |
| Main MFT cluster | 786,432 |
| MFT mirror cluster | 16 |
| Hidden-sectors field | 419,434,496 |

The hidden-sectors field differed from the observed starting LBA by 2,048 sectors, or 1 MiB. I recorded this as another inconsistency. It did not establish how the image had been created or which recovery layout would be correct.

To inspect this volume without a partition table, I created another read-only export with a raw node selecting its byte range:

```bash
touch "$inspect_dir/volume.raw"

qemu-storage-daemon \
  --blockdev "driver=file,node-name=src,filename=$image_path,read-only=on" \
  --blockdev driver=vmdk,node-name=disk,file=src,read-only=on \
  --blockdev driver=raw,node-name=part,file=disk,offset=214749413376,size=41204842496,read-only=on \
  --export "type=fuse,id=volume,node-name=part,mountpoint=$inspect_dir/volume.raw,writable=off,allow-other=off" \
  --pidfile "$inspect_dir/volume.pid" \
  --daemonize

ntfsinfo -m "$inspect_dir/volume.raw"
ntfsls -l "$inspect_dir/volume.raw"
```

These offsets belong to this particular image; they are not values to reuse for another disk.

Both NTFS tools failed with errors including:

```text
Record 0 has no FILE magic (0x0)
NTFS is inconsistent.
```

Repeating the inspection with their `-f` option did not make the volume readable. I did not run a filesystem repair.

## 6. Confirm Windows Records and Locate the Metadata Damage

The MFT, or Master File Table, contains NTFS file records. Its mirror stores a small backup of critical initial records; it is not a backup of every file.

The boot-sector values gave a cluster size of:

```text
512 × 8 = 4,096 bytes
```

The main MFT should therefore begin at:

```text
214,749,413,376 + 786,432 × 4,096
= 217,970,638,848
```

That location contained records beginning with `FILE`, the expected record signature. The mirror should begin at:

```text
214,749,413,376 + 16 × 4,096
= 214,749,478,912
```

The mirror location was zeroed. This supplied direct evidence of missing filesystem metadata alongside the tool failures. The error message by itself would not have told me which metadata copy was missing.

Since normal filesystem access failed, I used a small Python parser to inspect surviving MFT records directly. It read a 32 MiB region beginning at the main MFT, applied each record's update-sequence fixups, walked its attributes, and decoded resident `FILE_NAME` attributes and parent record references. Those fixups restore the sector-ending bytes used by NTFS to detect incomplete record writes.

The parsed records included:

```text
Root
├── Program Files
├── Users
└── Windows
    ├── Boot
    └── System32
```

The parent references mattered: this was stronger evidence than finding the string `Windows` somewhere in the image.

However, it was still a partial metadata inspection. I did not reconstruct the entire MFT, verify all file contents, validate Windows boot configuration, or successfully boot a recovered copy. **Windows directory records surviving does not prove that a complete Windows installation survives.**

After inspection, the temporary exports were stopped:

```bash
kill "$(cat "$inspect_dir/volume.pid")"
kill "$(cat "$inspect_dir/disk.pid")"
```

## What the Evidence Supports

The conclusion follows from several independent observations:

1. QEMU could read the VMDK structure, and its integrity check passed.
2. VMware opened and attached the virtual disk successfully.
3. Essential partition-table sectors were zero, and no usable partition layout was detected.
4. NTFS structures and Windows directory records survived later in the disk.
5. The surviving volume's MFT mirror was zeroed, and NTFS inspection failed.

Together, these explain why the image could look valid to VMware while failing to provide a bootable Windows disk. Changing EFI to BIOS or selecting another controller would not restore those missing bytes.

The pattern is **consistent with an incomplete or damaged disk capture or conversion**, but the source operation was not observed. I could not distinguish that possibility from earlier damage or deliberate removal of metadata based on this image alone.

If the original disk is available, the practical next step is to recreate the image from the complete disk, including partition and boot metadata. If this is the only copy, recovery should be investigated on a separate working copy. This inspection diagnosed the failure; it did not establish or test a repair procedure.

The reusable lesson is to ask what each check actually validates. **A valid container, recognizable Windows records, and a bootable Windows disk are three different findings.**
