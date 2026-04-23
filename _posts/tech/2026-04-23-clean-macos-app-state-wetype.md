---
title: "macOS 下清理应用状态修复 WeType 简繁切换残留问题"
date: 2026-04-23
permalink: /posts/2026/04/clean_macos_app_state_wetype/
categories: tech
tags: [macos, wetype, input-method, troubleshooting]
---

macOS 下遇到一个 WeType 的奇怪问题：切换到繁体输入后，再切回简体输入，有些字仍然会按繁体输出，例如 `還`、`總`、`覆` 这类结果会残留在简体模式里。

这类问题不一定是 macOS 输入源本身坏了。很多 macOS 应用会把偏好设置、缓存、词库、学习数据放在应用包之外。应用界面里切换设置，甚至重新打开应用，都不一定能清掉这些状态。最后通过清理 WeType 的本地应用状态解决了这个问题。

* TOC
{:toc}

# 现象

输入法已经切回简体，但部分候选词或输出结果仍然像繁体模式下的结果。

这个现象有几个特点：

- 问题出现在切换到繁体之后
- 再切回简体后没有完全恢复
- 不是所有字都错，只有部分字词异常
- 异常结果很像来自缓存、用户词库、转换状态或学习数据

所以排查方向不是先改系统语言，而是先清理 WeType 自己保存的状态。

# 先停止应用进程

清理应用状态前，先停掉应用和相关 helper 进程。否则应用可能在退出或运行过程中把旧设置重新写回磁盘。

先查看 WeType 相关进程：

```bash
ps aux | grep -i wetype
```

当时能看到两个关键进程：

```text
/Library/Input Methods/WeType.app/Contents/MacOS/WeType
/Library/Input Methods/WeType.app/Contents/MacOS/WeTypeFeedback.app/Contents/MacOS/WeTypeFeedback
```

用 PID 结束它们：

```bash
kill <WeTypeFeedback-pid>
kill <WeType-pid>
```

再确认进程已经不存在：

```bash
ps aux | grep -i wetype
```

注意 `ps aux` 输出里第二列才是 PID。不要把内存占用或其他数字当成 PID 去 `kill`。

# 清理 Application Support

很多 macOS 应用的核心运行数据都放在 `~/Library/Application Support/`。WeType 的目录是：

```bash
~/Library/Application\ Support/WeType
```

里面能看到数据库、词库、引擎数据、更新数据和图片缓存等内容：

```text
appIcons
business
DataBase
DictUpdate
engine
mmkv
userDict
com.onevcat.Kingfisher.ImageCache.WeType
com.onevcat.Kingfisher.ImageCache.WeTypeFeedback
```

如果目标是完整重置 WeType 状态，可以清掉这个目录下的内容：

```bash
rm -rf ~/Library/Application\ Support/WeType/*
```

这个命令要谨慎执行。路径里有空格，需要转义或加引号；最好使用完整路径，确认目标确实是 WeType 的状态目录。

# 清理 Preferences

macOS 应用偏好设置通常在 `~/Library/Preferences/` 下，以 `.plist` 文件保存。WeType 相关文件包括：

```text
com.tencent.inputmethod.wetype.plist
com.tencent.WeTypeFeedback.plist
com.tencent.WeTypeSettings.plist
```

可以直接删除这些偏好设置：

```bash
rm ~/Library/Preferences/com.tencent.inputmethod.wetype.plist
rm ~/Library/Preferences/com.tencent.WeTypeFeedback.plist
rm ~/Library/Preferences/com.tencent.WeTypeSettings.plist
```

如果你确定这台机器上没有其他需要保留设置的腾讯应用，也可以先列出来再按需删除：

```bash
ls ~/Library/Preferences/com.tencent.*
```

不建议在不确认的情况下盲目删除所有 `com.tencent.*`，因为这可能影响其他腾讯应用。

# 清理 Caches

缓存目录在 `~/Library/Caches/`。这次能看到几个 WeType 相关目录：

```text
WeType
com.tencent.inputmethod.wetype
com.tencent.wetype.InstallerApp
com.tencent.WeTypeFeedback
```

至少清理主缓存目录：

```bash
rm -rf ~/Library/Caches/WeType
```

如果问题还在，可以继续清理其他 WeType 相关缓存：

```bash
rm -rf ~/Library/Caches/com.tencent.inputmethod.wetype
rm -rf ~/Library/Caches/com.tencent.wetype.InstallerApp
rm -rf ~/Library/Caches/com.tencent.WeTypeFeedback
```

# 其他可检查的位置

如果应用仍然像保存了旧状态，可以继续检查这些目录：

```bash
~/Library/Logs/
~/Library/Saved Application State/
~/Library/Containers/
~/Library/Group Containers/
```

这次 WeType 问题主要和 Application Support、Preferences、Caches 有关。日志目录通常不需要删除，除非日志特别大，或者应用明确会读取日志作为状态输入，这种情况比较少见。

# 重启并验证

清理完成后，重新启动 WeType。macOS 和应用会重新生成默认目录和新的 `.plist` 文件。

然后验证之前最小可复现的问题：

- 切到简体输入
- 输入之前异常的字词
- 确认 `还`、`总` 等字按简体模式输出
- 对于 `覆` 这种简繁场景里可能和词语语义相关的字，按具体词语确认是否符合预期
- 再切到繁体，然后切回简体
- 再次输入同一组字词

如果清理状态后问题消失，基本可以判断根因是 WeType 的本地状态残留，而不是 macOS 当前输入源设置本身。

# 通用方法

这个排查方式也适用于很多 macOS 应用：

1. 停止应用和 helper 进程。
2. 清理 `~/Library/Application Support/<AppName>/`。
3. 清理 `~/Library/Preferences/<bundle-id>.plist`。
4. 清理 `~/Library/Caches/` 下对应缓存。
5. 必要时再检查 Saved Application State、Containers 和 Group Containers。
6. 重启应用，用最小复现步骤验证问题是否消失。

关键点是不要随机删文件。先确认应用名和 bundle id，再只清理能对应到这个应用的状态文件。
