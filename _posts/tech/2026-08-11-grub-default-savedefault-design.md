---
title: "GRUB's GRUB_DEFAULT and GRUB_SAVEDEFAULT: Flexible but Confusing Design"
date: 2026-08-11
permalink: /posts/2026/08/grub-default-savedefault-design/
categories: tech
tags: [grub, linux, bootloader, design, ux]
excerpt: "GRUB splits reading and writing the saved boot entry across GRUB_DEFAULT and GRUB_SAVEDEFAULT. That flexibility helps admins and automation, but it exposes mechanism instead of user intent—and nested configfile menus can silently break remember-last-selection."
---

While configuring GRUB, I found the relationship between `GRUB_DEFAULT` and `GRUB_SAVEDEFAULT` surprisingly confusing.

The common user expectation is simple:

> "I want GRUB to remember the last menu entry I selected."

However, GRUB requires understanding two separate options:

```bash
GRUB_DEFAULT=saved
```

and:

```bash
GRUB_SAVEDEFAULT=true
```

This design exposes the internal mechanism rather than the user's intent.

* TOC
{:toc}

## How the current design works

GRUB separates reading and writing the saved boot entry.

### `GRUB_DEFAULT`

This controls **where GRUB gets the default entry**.

Examples:

```bash
GRUB_DEFAULT=0
```

means:

> Always boot the first menu entry.

Or:

```bash
GRUB_DEFAULT=saved
```

means:

> Use the saved entry stored in the GRUB environment block.

### `GRUB_SAVEDEFAULT`

This controls whether GRUB automatically saves a user's menu selection.

Example:

```bash
GRUB_SAVEDEFAULT=true
```

means:

> When the user selects an entry, update the saved entry.

It only has an effect together with:

```bash
GRUB_DEFAULT=saved
```

## Why does GRUB separate them?

The separation allows a third use case:

```bash
GRUB_DEFAULT=saved
```

without:

```bash
GRUB_SAVEDEFAULT=true
```

In this mode, the saved entry is controlled manually:

```bash
grub-set-default "Windows Boot Manager"
```

The next boot uses Windows.

If the user manually selects another entry once, that does not permanently change the saved default.

The advantage is that tools or administrators can change the next boot target without modifying `/etc/default/grub` or regenerating `grub.cfg`.

For example:

```text
Kernel update system:
    install new kernel
          |
          v
    grub-set-default new kernel
          |
          v
    reboot
```

No GRUB configuration regeneration is required.

## However, this design creates two sources of truth

The current model has two possible places that influence the boot entry:

Static configuration:

```bash
GRUB_DEFAULT=0
```

and runtime state:

```text
saved_entry=Ubuntu
```

You can inspect that runtime state directly:

```bash
grub-editenv /boot/grub/grubenv list
```

Example output:

```text
saved_entry=gnulinux-advanced-731f9edc-9ac5-4b58-84dd-a9c3d61c7b3f>gnulinux-6.8.0-134-generic-advanced-731f9edc-9ac5-4b58-84dd-a9c3d61c7b3f
```

The value is the menu path GRUB saved (`submenu-id>entry-id`), not a friendly label. That makes the second source of truth more visible—and a bit harder to read by hand.

The user has to understand the relationship between them.

Conceptually:

```text
/etc/default/grub
        |
        v
   GRUB_DEFAULT
        |
        |
        +----------------+
                         |
                         v

                 generated grub.cfg


/boot/grub/grubenv
        |
        v
   saved_entry
```

This is powerful, but it is not very intuitive.

## A simpler design could be possible

A user-oriented design could be:

```bash
GRUB_DEFAULT=0
GRUB_REMEMBER_LAST_SELECTION=true
```

The meaning would be immediately clear:

* `GRUB_DEFAULT` defines the fallback/default entry.
* `GRUB_REMEMBER_LAST_SELECTION=true` enables remembering the last user choice.

The internal implementation could still use a saved environment block, but users would not need to know about it.

## An even simpler design: one source of truth

Another possible design is to eliminate `GRUB_DEFAULT` entirely and make the saved entry the only source of truth:

```bash
grub-set-default Ubuntu
```

stores:

```text
saved_entry=Ubuntu
```

and GRUB always boots that.

The model becomes:

```text
grub-set-default
        |
        v
 saved_entry
        |
        v
 GRUB boots it
```

This avoids having both:

* a static default in `grub.cfg`
* a dynamic saved entry in `grubenv`

which can confuse users.

## Pitfall: nested `configfile` breaks saved defaults

Even with both options set correctly, "remember last selection" can still fail if you chain menus with `configfile`.

A common custom ESP setup looks like this:

```text
firmware
    |
    v
\EFI\boot\bootx64.efi          (outer menu: ubuntu / PE / rescue)
    |
    |  configfile /EFI/ubuntu/grub.cfg
    v
Ubuntu /boot/grub/grub.cfg     (inner menu: kernels, advanced, memtest)
```

`update-grub` only regenerates the inner `grub.cfg`. The outer `/EFI/boot/grub.cfg` is hand-maintained and often looks like:

```grub
menuentry 'ubuntu' {
	configfile /EFI/ubuntu/grub.cfg
}
```

When you pick an entry in the **inner** menu, `savedefault` writes `${chosen}` into `grubenv`. With that nesting, the saved path can pick up the outer menuentry title as a prefix:

```text
saved_entry=ubuntu>gnulinux-simple-731f9edc-9ac5-4b58-84dd-a9c3d61c7b3f
```

On the next boot, the inner config does:

```grub
set default="${saved_entry}"
```

and looks up that path **only in its own menu**. There is no entry or submenu named `ubuntu` there—only ids like `gnulinux-simple-...`. The lookup fails, so GRUB falls back to the first entry every time.

Symptoms that match this:

* `/etc/default/grub` has `GRUB_DEFAULT=saved` and `GRUB_SAVEDEFAULT=true`
* `update-grub` did put `set default="${saved_entry}"` and `savedefault` into `/boot/grub/grub.cfg`
* selecting a different inner entry has no lasting effect
* `grub-editenv list` shows a leading `ubuntu>` (or whatever the outer menuentry title is)

A submenu path **inside the same** `grub.cfg` (for example `gnulinux-advanced-...>`…) is fine. The broken case is a prefix from a **parent menu that used `configfile`**, which the child menu cannot resolve.

### Fix: `chainloader` instead of `configfile`

Start Ubuntu's GRUB as its own bootloader instance so `${chosen}` is not nested under the outer entry:

```grub
menuentry 'ubuntu' {
	chainloader /EFI/ubuntu/grubx64.efi
}
```

(Use `shimx64.efi` instead if Secure Boot requires it.)

After that, a normal top-level save looks like:

```text
saved_entry=gnulinux-simple-731f9edc-9ac5-4b58-84dd-a9c3d61c7b3f
```

which matches an `--id` in the inner menu, so the highlight sticks.

To clear a bad value while testing:

```bash
sudo grub-editenv /boot/grub/grubenv set saved_entry=gnulinux-simple-731f9edc-9ac5-4b58-84dd-a9c3d61c7b3f
```

(or set the advanced-kernel path you actually want). If the outer menu keeps using `configfile`, the next interactive selection may write the bad `ubuntu>...` prefix again.

## Why does GRUB keep the current design?

The current design is optimized for flexibility:

* static defaults for simple or stateless systems;
* runtime boot control for administrators;
* scripts and automation can change boot targets without regenerating configuration.

This is valuable for servers and system management tools.

However, for typical desktop users, the design exposes too much internal mechanism.

A simpler interface based on user intent:

> "Always boot this entry"
> "Remember my last selection"

would likely be easier to understand.

## Conclusion

GRUB's current design is powerful but reflects its history as an administrative bootloader.

The separation between:

* `GRUB_DEFAULT` (read default source)
* `GRUB_SAVEDEFAULT` (write saved state)

provides flexibility, especially for `grub-set-default` and automation.

However, it also introduces complexity by exposing multiple sources of boot state—and when menus are nested with `configfile`, the saved path can become invalid in the menu that has to resolve it.

A cleaner design would either:

1. provide a single "remember last selection" option, or
2. use one authoritative saved entry as the only source of truth.

The current design prioritizes flexibility over simplicity. If you use a custom outer GRUB menu, prefer `chainloader` into distro GRUB when you care about `GRUB_SAVEDEFAULT`.
