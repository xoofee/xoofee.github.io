---
title: "Fix MATLAB R2020a Installer on Modern Ubuntu: GLib, Pango, and FreeType"
date: 2026-09-08
permalink: /posts/2026/09/fix-matlab-r2020a-installer-modern-ubuntu-glib/
categories: tech
tags: [matlab, ubuntu, glib, pango, freetype, installer, linux]
excerpt: "A local, reversible workaround for the MATLAB R2020a installer failing when its old bundled GLib is mixed with Ubuntu's current Pango stack."
---

MATLAB R2020a is old enough that its Linux installer can fail on a current Ubuntu release before the installer window appears:

```text
terminate called after throwing an instance of 'std::runtime_error'
what(): Unable to launch the MATLABWindow application
```

The useful error is visible by running the window program directly:

```bash
./bin/glnxa64/MATLABWindow -help
```

On this system it reported:

```text
symbol lookup error: /lib/x86_64-linux-gnu/libpango-1.0.so.0: \
undefined symbol: g_once_init_leave_pointer
```

* TOC
{:toc}

## Cause

R2020a bundles an old GLib 2.56-era runtime under:

```text
cefclient/sys/os/glnxa64/
```

but does not bundle Pango or Cairo. Therefore it loads Ubuntu's current Pango/Cairo libraries while its RPATH still selects the bundled `libglib-2.0.so.0` and `libgobject-2.0.so.0`.

Modern Pango requires `g_once_init_leave_pointer`, which the bundled GLib does not export. The system GLib does:

```bash
nm -D ./cefclient/sys/os/glnxa64/libglib-2.0.so.0.5600.1 \
  | grep g_once_init_leave_pointer

nm -D /lib/x86_64-linux-gnu/libglib-2.0.so.0 \
  | grep g_once_init_leave_pointer
```

The first command has no output; the second prints the exported symbol.

## Use a Writable Copy of the Installation Media

Do not change the mounted ISO. First copy its contents to a writable directory:

```bash
cp -a /path/to/mounted/MATHWORKS_R2020A /work/tools/matlab2020a/MATHWORKS_R2020A
cd /work/tools/matlab2020a/MATHWORKS_R2020A
```

If the copied directory still has read-only directory permissions, make only the runtime-library directory writable:

```bash
chmod u+w cefclient/sys/os/glnxa64
```

## Replace the GLib Family as a Consistent Set

Replace the SONAME entry points, not the versioned files. Every original is retained in the same directory with a `.matlab-r2020a-bundled` suffix, so the change is reversible.

```bash
cd /work/tools/matlab2020a/MATHWORKS_R2020A

for lib in \
  libglib-2.0.so.0 \
  libgobject-2.0.so.0 \
  libgio-2.0.so.0 \
  libgmodule-2.0.so.0
do
  mv "cefclient/sys/os/glnxa64/$lib" \
     "cefclient/sys/os/glnxa64/$lib.matlab-r2020a-bundled"
  ln -s "/lib/x86_64-linux-gnu/$lib" \
        "cefclient/sys/os/glnxa64/$lib"
done
```

`libglib` and `libgobject` fix the original Pango error. On this Ubuntu version, loading the modern system `libgio` was also necessary, followed by its matching `libgmodule`:

```text
libgdk_pixbuf-2.0.so.0: undefined symbol: g_task_set_static_name
libgio-2.0.so.0: undefined symbol: g_module_open_full
```

`libgthread-2.0.so.0` did not need replacement.

## Keep the FreeType Override

This installation also needed the system FreeType library. Keep the existing local override in `bin/glnxa64`:

```bash
cd /work/tools/matlab2020a/MATHWORKS_R2020A/bin/glnxa64
ln -s /lib/x86_64-linux-gnu/libfreetype.so.6 libfreetype.so.6
```

If `libfreetype.so.6` already exists, first move it aside with a descriptive backup name, as above. Do not overwrite it blindly.

## Verify and Run

The dynamic loader should now resolve the four GLib-family libraries through the local symlinks, which point to Ubuntu's versions:

```bash
LD_TRACE_LOADED_OBJECTS=1 ./bin/glnxa64/MATLABWindow 2>&1 \
  | grep -E 'lib(glib|gobject|gio|gmodule)-2.0.so.0'
```

Then launch the installer normally:

```bash
./install
```

Missing optional GTK modules such as `gail`, `atk-bridge`, or `canberra-gtk-module` may be printed as warnings. They are unrelated to the GLib symbol failure. No system packages or system library files need to be changed for this workaround.

## Restore the Bundled Libraries

To undo the GLib-family workaround, remove each symlink and move its backup back:

```bash
cd /work/tools/matlab2020a/MATHWORKS_R2020A

for lib in \
  libglib-2.0.so.0 \
  libgobject-2.0.so.0 \
  libgio-2.0.so.0 \
  libgmodule-2.0.so.0
do
  rm "cefclient/sys/os/glnxa64/$lib"
  mv "cefclient/sys/os/glnxa64/$lib.matlab-r2020a-bundled" \
     "cefclient/sys/os/glnxa64/$lib"
done
```

Restore the FreeType file from its own backup in the same way if needed.
