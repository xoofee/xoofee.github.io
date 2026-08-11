---
title: "GRUB's GRUB_DEFAULT and GRUB_SAVEDEFAULT: Flexible but Confusing Design"
date: 2026-08-11
permalink: /posts/2026/08/grub-default-savedefault-design/
categories: tech
tags: [grub, linux, bootloader, design, ux]
excerpt: "GRUB splits reading and writing the saved boot entry across GRUB_DEFAULT and GRUB_SAVEDEFAULT. That flexibility helps admins and automation, but it exposes mechanism instead of user intent."
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

However, it also introduces complexity by exposing multiple sources of boot state.

A cleaner design would either:

1. provide a single "remember last selection" option, or
2. use one authoritative saved entry as the only source of truth.

The current design prioritizes flexibility over simplicity.
