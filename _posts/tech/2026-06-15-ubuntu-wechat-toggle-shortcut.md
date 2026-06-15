---
title: "Ubuntu 下给微信添加显示/隐藏快捷键"
date: 2026-06-15
permalink: /posts/2026/06/ubuntu-wechat-toggle-shortcut/
categories: tech
tags: [ubuntu, wechat, weixin, gnome, shortcut, xdotool, linux]
excerpt: "Linux 版微信在 Ubuntu 中没有内置的显示/隐藏窗口快捷键，可以用 xdotool 和 GNOME 自定义快捷键实现一个类似的切换功能。"
---

Linux 版微信可以从官方页面安装：

[https://linux.weixin.qq.com/](https://linux.weixin.qq.com/)

安装之后整体可用，但在 Ubuntu 桌面里有一个小问题：它没有像很多聊天软件那样提供一个内置快捷键，用来快速显示或隐藏主窗口。

我希望实现的效果很简单：

- 微信窗口显示时，按快捷键把它最小化
- 微信窗口隐藏时，按快捷键把它激活到前台
- 不需要额外写完整脚本，只用系统自定义快捷键即可

* TOC
{:toc}

## 安装 xdotool

先安装 `xdotool`：

```bash
sudo apt install xdotool
```

`xdotool` 可以在 X11/XWayland 环境下查找窗口、激活窗口、最小化窗口。Linux 版微信窗口可以通过窗口标题里的 `Weixin` 找到。

## 切换命令

我使用的命令如下：

```bash
sh -c 'WIN=$(xdotool search --onlyvisible --name "Weixin" | head -n 1); if xprop -id $WIN _NET_WM_STATE | grep -q HIDDEN; then xdotool windowactivate $WIN; else xdotool windowminimize $WIN; fi'
```

它的逻辑是：

- 用 `xdotool search --name "Weixin"` 找到微信窗口
- 用 `xprop` 读取窗口的 `_NET_WM_STATE`
- 如果窗口处于 `HIDDEN` 状态，就激活窗口
- 否则就最小化窗口

这里用 `head -n 1` 是为了只取第一个匹配到的窗口，避免同名窗口造成命令不确定。

## 添加自定义快捷键

在 Ubuntu 的 GNOME 设置里添加自定义快捷键：

1. 打开 Settings
2. 进入 Keyboard
3. 进入 View and Customize Shortcuts
4. 添加 Custom Shortcut
5. Name 填 `wechat`
6. Command 填上面的 `sh -c ...` 命令
7. Shortcut 设置为自己习惯的组合键

我这里设置的是 `Ctrl + Alt + W`。

![Ubuntu custom shortcut for WeChat](/images/posts/2026-06-15-ubuntu-wechat-toggle-shortcut.png)

## 使用效果

设置完成后，按 `Ctrl + Alt + W` 就可以切换微信窗口：

- 如果微信窗口在桌面上，就最小化
- 如果微信窗口已经隐藏，就重新激活

这样就不用每次都去 Dock 或任务栏里找微信窗口了。

## 注意事项

这个方法依赖窗口标题匹配，所以如果微信窗口名称变化，需要调整 `"Weixin"` 这个匹配字符串。

如果发现窗口最小化之后再按快捷键找不回来，可以尝试去掉 `--onlyvisible`：

```bash
sh -c 'WIN=$(xdotool search --name "Weixin" | head -n 1); if xprop -id $WIN _NET_WM_STATE | grep -q HIDDEN; then xdotool windowactivate $WIN; else xdotool windowminimize $WIN; fi'
```

另外，`xdotool` 主要面向 X11 窗口操作。在 Wayland 会话中，它通常只能操作 XWayland 应用窗口。当前 Linux 版微信在 Ubuntu 上可以用这个方式处理，但如果后续微信或桌面环境切换到更原生的 Wayland 行为，这个方法可能需要调整。

## 小结

Linux 版微信本身没有提供 Ubuntu 桌面下的显示/隐藏快捷键，但可以用系统自定义快捷键加 `xdotool` 补上这个功能。

核心就两个步骤：

```bash
sudo apt install xdotool
```

然后把窗口切换命令绑定到一个快捷键上。对我来说，`Ctrl + Alt + W` 刚好很顺手。
