---
title: "Setting Up Jupyter Terminal Keyboard Shortcut"
date: 2025-11-04
permalink: /posts/2025/11/jupyter-terminal-shortcut/
categories: tech
tags: [jupyter, terminal, keyboard-shortcut, productivity]
---

Learn how to quickly create a new terminal in Jupyter using a custom keyboard shortcut. This is especially useful for developers who frequently need to run shell commands while working in Jupyter notebooks.

* TOC
{:toc}

## Why Set Up a Terminal Shortcut?

Jupyter notebooks are powerful for data analysis and interactive coding, but sometimes you need to run shell commands or scripts. Instead of navigating through menus every time, you can set up a keyboard shortcut to instantly open a new terminal.

## Setting Up the Shortcut

Follow these steps to configure a keyboard shortcut for creating a new terminal in Jupyter:

### Step 1: Open Settings

1. Go to **Settings** in your Jupyter interface

### Step 2: Access Advanced Settings Editor

2. Click on **JSON Settings Editor** (located in the top right corner)
3. This will open the **Advanced Settings Editor** → **Keyboard Shortcuts**

### Step 3: Add User Preferences

4. Add the following configuration in **User Preferences**:

```json
{
  "shortcuts": [
    {
      "command": "terminal:create-new",
      "keys": ["Ctrl Alt T"],
      "selector": "body"
    }
  ]
}
```

## Usage

Once configured, you can press **Ctrl+Alt+T** (or **Cmd+Alt+T** on macOS) to instantly create a new terminal in Jupyter. This works from anywhere in the Jupyter interface.

## Customization

You can customize the keyboard shortcut by changing the `keys` array. For example:

- **Windows/Linux**: `["Ctrl Alt T"]` (as shown above)
- **macOS**: `["Cmd Alt T"]` or `["Cmd Shift T"]`
- **Alternative**: `["Ctrl Shift T"]` for a different combination

Just make sure the key combination doesn't conflict with existing shortcuts in your system or browser.

