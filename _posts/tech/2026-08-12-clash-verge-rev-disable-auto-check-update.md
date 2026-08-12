---
title: "Disable Clash Verge Rev Auto Check Update on Ubuntu"
date: 2026-08-12
permalink: /posts/2026/08/clash-verge-rev-disable-auto-check-update/
categories: tech
tags: [ubuntu, linux, clash-verge, clash-verge-rev, config]
excerpt: "Turn off Clash Verge Rev update checks by setting auto_check_update: false in verge.yaml — a setting the GUI does not expose."
---

Clash Verge Rev checks for updates in the background. On Ubuntu, that toggle is not available in the GUI, but you can turn it off in the config file.

* TOC
{:toc}

## Config file

Edit:

```text
~/.local/share/io.github.clash-verge-rev.clash-verge-rev/verge.yaml
```

Set:

```yaml
auto_check_update: false
```

If the key is missing, add it at the top level of `verge.yaml` (same indent level as the other root keys).

## Apply

Restart Clash Verge Rev so it reloads the config. After that, it should stop polling for updates on its own.

The GUI still lets you check for updates manually if you want them; this only disables the automatic check.
