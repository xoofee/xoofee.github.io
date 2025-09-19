---
title: "Create a desktop entry for Cursor AppImage (with icon extraction)"
date: 2025-09-19
permalink: /posts/2025/09/cursor-appimage-desktop-entry/
categories: tech
tags: [linux, appimage, desktop, cursor]
---

Quick notes to make a Cursor AppImage launchable from your desktop menus and include a proper icon.

This example uses Cursor 1.6.27; adjust the paths/versions for your setup.

* TOC
{:toc}

# 1) Make the AppImage executable

```bash
chmod +x /home/<user_name>/apps/cursor/Cursor-1.6.27-x86_64.AppImage
```

# 2) Create the desktop file

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
EOF
chmod +x ~/.local/share/applications/cursor.desktop
```

# 3) Optional: extract an icon from the AppImage

Install an icon next to the AppImage so the `Icon=` line resolves:

```bash
# extract AppImage contents
/home/<user_name>/apps/cursor/Cursor-1.6.27-x86_64.AppImage --appimage-extract

# try to find a suitable icon inside the extracted tree
ICON_PATH=$(find squashfs-root -type f \( -iname '*cursor*.png' -o -iname '*cursor*.svg' \) | head -n1)

# if found, copy it to /home/<user_name>/apps/cursor/cursor.png
if [ -n "$ICON_PATH" ]; then
  cp "$ICON_PATH" /home/<user_name>/apps/cursor/cursor.png
else
  echo "No obvious icon found inside AppImage; you can set any png/svg at /home/<user_name>/apps/cursor/cursor.png"
fi

# clean up extracted tree
rm -rf squashfs-root
```

# 4) (Optional) Update desktop database / cache

Some environments pick up the new desktop entry immediately; others need a refresh:

```bash
# GNOME / Freedesktop
update-desktop-database ~/.local/share/applications 2>/dev/null || true

# KDE / icon cache (varies by distro)
xdg-desktop-menu forceupdate 2>/dev/null || true
```

# Notes

- Replace `<user_name>` with your actual username.
- If your distro restricts sandboxing, keep `--no-sandbox` as shown; otherwise remove it.
- You can place the icon anywhere; keeping it next to the AppImage is convenient.

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
