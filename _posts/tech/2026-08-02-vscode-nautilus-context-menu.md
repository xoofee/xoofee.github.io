---
title: "Add VS Code to the Nautilus Context Menu on Ubuntu"
date: 2026-08-02
permalink: /posts/2026/08/vscode-nautilus-context-menu/
categories: tech
tags: [ubuntu, gnome, nautilus, vscode, context-menu, python, linux]
excerpt: "Use a Nautilus Python extension to put Open in VS Code on right-click for files, folders, and empty folder backgrounds."
---

On Ubuntu with GNOME Files (Nautilus), I wanted a right-click entry that opens the current selection in Visual Studio Code:

- selected files
- selected folders
- empty area inside a folder (open that folder)

Putting a shell script under `~/.local/share/nautilus/scripts/` is not enough. Those entries live under a **Scripts** submenu, and they do not cover blank background clicks well. A small Nautilus Python extension does.

* TOC
{:toc}

## Prerequisites

On Ubuntu 24.04 with Nautilus 46, install the Python bindings if they are missing:

```bash
sudo apt install python3-nautilus gir1.2-nautilus-4.0
```

Confirm `code` is on your `PATH`:

```bash
command -v code
```

## Installer Script

Save this as `install-vscode-nautilus.sh` and run it:

```bash
#!/usr/bin/env bash
# install-vscode-nautilus.sh - add "Open in VS Code" to Nautilus context menus
set -euo pipefail

CODE_BIN="$(command -v code || true)"
if [[ -z "$CODE_BIN" ]]; then
  echo "error: 'code' not found in PATH" >&2
  exit 1
fi

EXT_DIR="${HOME}/.local/share/nautilus-python/extensions"
mkdir -p "$EXT_DIR"

cat > "${EXT_DIR}/open-in-vscode.py" <<EOF
# Nautilus extension: Open in VS Code
from gi.repository import Nautilus, GObject
import subprocess

CODE = "${CODE_BIN}"

class OpenInVSCode(GObject.GObject, Nautilus.MenuProvider):
    def _paths(self, files):
        paths = []
        for f in files:
            if f.get_uri_scheme() != "file":
                continue
            path = f.get_location().get_path()
            if path:
                paths.append(path)
        return paths

    def _make_item(self, name, label, tip, paths):
        item = Nautilus.MenuItem(name=name, label=label, tip=tip)
        item.connect("activate", self._open, paths)
        return item

    def _open(self, _menu, paths):
        if not paths:
            return
        subprocess.Popen([CODE, "--"] + paths)

    def get_file_items(self, *args):
        files = args[-1]
        paths = self._paths(files)
        if not paths:
            return []

        if len(paths) == 1:
            label = "Open in VS Code"
            tip = "Open selected item in Visual Studio Code"
        else:
            label = f"Open {len(paths)} items in VS Code"
            tip = "Open selected items in Visual Studio Code"

        return [
            self._make_item(
                "OpenInVSCode::FileItems",
                label,
                tip,
                paths,
            )
        ]

    def get_background_items(self, *args):
        folder = args[-1]
        if folder.get_uri_scheme() != "file" or not folder.is_directory():
            return []

        path = folder.get_location().get_path()
        if not path:
            return []

        return [
            self._make_item(
                "OpenInVSCode::Background",
                "Open in VS Code",
                "Open this folder in Visual Studio Code",
                [path],
            )
        ]
EOF

nautilus -q || true
echo "Installed: ${EXT_DIR}/open-in-vscode.py"
echo "Reopen Files (Nautilus). Right-click a file, folder, or empty area -> Open in VS Code"
```

Then:

```bash
chmod +x install-vscode-nautilus.sh
./install-vscode-nautilus.sh
```

Reopen Nautilus. Right-click a file, a folder, or empty space in a folder — you should see **Open in VS Code**.

## How It Works

The extension implements `Nautilus.MenuProvider`:

| Hook | When it runs |
| --- | --- |
| `get_file_items` | Right-click on selected files/folders |
| `get_background_items` | Right-click on empty area in a directory |

Both create a `Nautilus.MenuItem` that launches:

```bash
code -- <paths...>
```

Only local `file://` URIs are handled. Remote locations such as `sftp://` are skipped.

The extension file ends up here:

```text
~/.local/share/nautilus-python/extensions/open-in-vscode.py
```

## Heredoc Pitfall

If you paste the installer into a file and the comment wraps, bash can break in two ways:

1. A wrapped word such as `menus` becomes a bare command and fails with `menus: command not found`.
2. An indented closing `EOF` does not terminate the heredoc, so you get `warning: here-document ... delimited by end-of-file`.

Keep the installer comment on one line, and make sure the closing `EOF` starts at column 0 with no leading spaces.

## Uninstall

```bash
rm ~/.local/share/nautilus-python/extensions/open-in-vscode.py
nautilus -q
```

## Checklist

1. Install `python3-nautilus` and `gir1.2-nautilus-4.0`
2. Confirm `code` is available
3. Run the installer (or write the extension file by hand)
4. Restart Nautilus with `nautilus -q`
5. Test file, folder, and empty-area right-clicks
