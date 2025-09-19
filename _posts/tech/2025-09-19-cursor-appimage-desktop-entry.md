---
title: "Cursor AppImage desktop entry on Linux"
date: 2025-09-19
permalink: /posts/2025/09/cursor_appimage_desktop_entry/
categories: tech
tags: [linux, appimage, desktop-entry, cursor]
---

Set up a desktop launcher for Cursor AppImage on Linux. This creates a `.desktop` file and optionally extracts an icon so it shows up in your app menu.

* TOC
{:toc}

# 1) Make the AppImage executable

```bash
chmod +x /home/<user_name>/apps/cursor/Cursor-1.6.27-x86_64.AppImage
```

# 2) Create the desktop entry

```bash
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/cursor.desktop <<'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=Cursor 1.6.27
Comment=Run Cursor AppImage
Exec=/home/<user_name>/apps/cursor/Cursor-1.6.27-x86_64.AppImage --no-sandbox %U
Icon=/home/<user_name>/apps/cursor/cursor.png
Terminal=false
Categories=Utility;Development;
StartupWMClass=Cursor
