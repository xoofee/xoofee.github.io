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

## Tested Environment

This workaround was tested on:

```text
Ubuntu 24.04.1 LTS (Noble Numbat), x86_64
MATLAB R2020a (9.8.0)
```

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

## Reusable Repair Script

The following script accepts an explicit MATLAB root, so it works for either the writable installation-media copy or the installed MATLAB tree. It replaces SONAME entry points rather than versioned files, and retains every original beside it with a `.matlab-r2020a-bundled` suffix.

```bash
#!/usr/bin/env bash
# Repair MATLAB R2020a's bundled GLib/FreeType runtime on current Ubuntu.
# Usage: fix-matlab-r2020a-runtime.sh /path/to/MATLAB_R2020A

set -euo pipefail

backup_suffix='.matlab-r2020a-bundled'
system_lib_dir='/lib/x86_64-linux-gnu'

usage() {
    cat <<'EOF'
Usage: fix-matlab-r2020a-runtime.sh MATLAB_ROOT

Replace MATLAB R2020a's old bundled runtime entry points with compatible
system libraries. The original entry point for each changed library is kept
beside it with the suffix .matlab-r2020a-bundled.

Examples:
  fix-matlab-r2020a-runtime.sh /work/tools/matlab2020a/MATHWORKS_R2020A
  fix-matlab-r2020a-runtime.sh /work/app/matlab/2020a
EOF
}

fail() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

if [[ $# -ne 1 || $1 == '-h' || $1 == '--help' ]]; then
    usage
    [[ $# -eq 1 ]] && exit 0
    exit 2
fi

matlab_root=$(cd "$1" 2>/dev/null && pwd -P) \
    || fail "MATLAB root does not exist: $1"
bin_dir="$matlab_root/bin/glnxa64"
cef_dir="$matlab_root/cefclient/sys/os/glnxa64"

[[ -d $bin_dir ]] || fail "not an R2020a Linux runtime (missing $bin_dir)"
[[ -d $cef_dir ]] || fail "not an R2020a Linux runtime (missing $cef_dir)"
[[ -w $bin_dir ]] || fail "$bin_dir is not writable; copy the installation media first or run: chmod u+w '$bin_dir'"
[[ -w $cef_dir ]] || fail "$cef_dir is not writable; copy the installation media first or run: chmod u+w '$cef_dir'"

for lib in libfreetype.so.6 libglib-2.0.so.0 libgobject-2.0.so.0 libgio-2.0.so.0 libgmodule-2.0.so.0; do
    [[ -e "$system_lib_dir/$lib" ]] || fail "required system library is missing: $system_lib_dir/$lib"
done

nm -D "$system_lib_dir/libfreetype.so.6" 2>/dev/null \
    | awk '$NF == "FT_Get_Color_Glyph_Layer" { found = 1 } END { exit !found }' \
    || fail "system FreeType does not export FT_Get_Color_Glyph_Layer"

ensure_override() {
    local path=$1
    local system_lib=$2
    local backup="${path}${backup_suffix}"
    local resolved_path resolved_system

    [[ -e $path || -L $path ]] || fail "MATLAB library is missing: $path"
    resolved_path=$(readlink -f "$path")
    resolved_system=$(readlink -f "$system_lib")

    if [[ $resolved_path == "$resolved_system" ]]; then
        printf 'unchanged: %s already resolves to %s\n' "$path" "$resolved_system"
        return
    fi

    [[ ! -e $backup && ! -L $backup ]] \
        || fail "backup already exists; refusing to overwrite: $backup"

    mv "$path" "$backup"
    ln -s "$system_lib" "$path"
    printf 'updated: %s -> %s\n' "$path" "$system_lib"
    printf 'backup:  %s\n' "$backup"
}

ensure_override "$bin_dir/libfreetype.so.6" "$system_lib_dir/libfreetype.so.6"
ensure_override "$cef_dir/libglib-2.0.so.0" "$system_lib_dir/libglib-2.0.so.0"
ensure_override "$cef_dir/libgobject-2.0.so.0" "$system_lib_dir/libgobject-2.0.so.0"
ensure_override "$cef_dir/libgio-2.0.so.0" "$system_lib_dir/libgio-2.0.so.0"
ensure_override "$cef_dir/libgmodule-2.0.so.0" "$system_lib_dir/libgmodule-2.0.so.0"

cat <<EOF

Done. Verify the resolved libraries with:
  LD_TRACE_LOADED_OBJECTS=1 "$bin_dir/MATLABWindow" 2>&1 | grep -E 'lib(freetype|glib|gobject|gio|gmodule)-[^ ]*'

To restore an overridden library, remove its symlink and rename its backup:
  rm PATH_TO_LIBRARY
  mv PATH_TO_LIBRARY${backup_suffix} PATH_TO_LIBRARY
EOF
```

Save it as `fix-matlab-r2020a-runtime.sh` and make it executable:

```bash
chmod 755 fix-matlab-r2020a-runtime.sh
```

Run it against the writable installation-media copy before launching the installer:

```bash
./fix-matlab-r2020a-runtime.sh /work/tools/matlab2020a/MATHWORKS_R2020A
```

After installation, run the same script against the installed MATLAB root. This is necessary because the installer-media changes do not carry into the installed application:

```bash
./fix-matlab-r2020a-runtime.sh /work/app/matlab/2020a
```

`libglib` and `libgobject` fix the original Pango error. On this Ubuntu version, loading the modern system `libgio` was also necessary, followed by its matching `libgmodule`:

```text
libgdk_pixbuf-2.0.so.0: undefined symbol: g_task_set_static_name
libgio-2.0.so.0: undefined symbol: g_module_open_full
```

`libgthread-2.0.so.0` did not need replacement.

The script also uses system FreeType. This is needed for modern system HarfBuzz, which requires `FT_Get_Color_Glyph_Layer`; MATLAB's bundled FreeType does not export that symbol. It is the failure that appears when creating a new Simulink model:

```text
Bundle#59 start failed: /lib/x86_64-linux-gnu/libharfbuzz.so.0: \
undefined symbol: FT_Get_Color_Glyph_Layer
```

## Verify and Run

The dynamic loader should now resolve FreeType and the four GLib-family libraries through local symlinks, which point to Ubuntu's versions:

```bash
LD_TRACE_LOADED_OBJECTS=1 ./bin/glnxa64/MATLABWindow 2>&1 \
  | grep -E 'lib(freetype|glib|gobject|gio|gmodule)-[^ ]*'
```

Then launch the installer normally:

```bash
./install
```

Missing optional GTK modules such as `gail`, `atk-bridge`, or `canberra-gtk-module` may be printed as warnings. They are unrelated to the GLib symbol failure. No system packages or system library files need to be changed for this workaround.

## Restore the Bundled Libraries

To undo the workaround, remove each symlink and move its backup back. For example, for the GLib-family libraries:

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
