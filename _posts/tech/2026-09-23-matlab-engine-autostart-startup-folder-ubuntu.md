---
title: "Automatically Share MATLAB Engine and Set Its Startup Folder on Ubuntu"
date: 2026-09-23
permalink: /posts/2026/09/matlab-engine-autostart-startup-folder-ubuntu/
categories: tech
tags: [matlab, python, ubuntu, linux, automation]
excerpt: "Automatically share a MATLAB desktop session for Python and configure its Ubuntu launcher to open in a chosen project directory."
---

The MATLAB Engine API can connect Python to an already-running MATLAB desktop
session. Two small pieces of configuration make this workflow convenient:

1. MATLAB shares itself automatically when it starts.
2. The Ubuntu application launcher opens MATLAB in the project directory.

The important detail is that the MATLAB and Python sides use different
functions:

```text
MATLAB:  matlab.engine.shareEngine('matlab')
Python:  matlab.engine.connect_matlab('matlab')
```

`shareEngine` publishes the current MATLAB process. `connect_matlab` is a
Python Engine API function that attaches a Python process to that published
session. Calling the Python function from MATLAB startup is an error.

* TOC
{:toc}

## The target workflow

After configuration, the workflow looks like this:

```text
Ubuntu application launcher
            |
            v
    MATLAB desktop session
            |
            | startup.m calls shareEngine
            v
     Shared Engine session: matlab
            ^
            |
 Python calls connect_matlab("matlab")
```

The Python process reuses the desktop MATLAB process. It does not start a
second MATLAB instance with `start_matlab()`.

## Automatically share MATLAB at startup

MATLAB executes a file named `startup.m` during startup if it can find the file
on its MATLAB path. A common per-user location on Ubuntu is:

```text
~/Documents/MATLAB/startup.m
```

Create the file if it does not exist and add:

```matlab
if ~matlab.engine.isEngineShared
    matlab.engine.shareEngine('matlab');
end
```

The `isEngineShared` check makes the command safe if startup logic is run more
than once in the same MATLAB process. The name `matlab` is just a shared-session
name; Python must use the same name when connecting.

### Do not call `connect_matlab` from MATLAB

This is the wrong startup file content:

```matlab
matlab.engine.connect_matlab('matlab')
```

`connect_matlab` belongs in Python, not MATLAB. Using it in `startup.m` causes
an error such as:

```text
Unable to resolve the name matlab.engine.connect_matlab.
```

The correct MATLAB-side function is `shareEngine`.

### Avoid sharing the same session twice

If this command is entered twice:

```matlab
matlab.engine.shareEngine('matlab')
```

the first invocation shares the session and the second invocation reports that
the current MATLAB session is already shared. The `isEngineShared` guard avoids
that error during normal startup.

## Set the startup working directory in Ubuntu

The MATLAB desktop launcher is usually a per-user `.desktop` file under:

```text
~/.local/share/applications/
```

Open the MATLAB launcher for editing. Its existing `Exec` entry may look like
this:

```ini
Exec="/opt/MATLAB/R2020a/bin/matlab" -desktop
Path=/opt/MATLAB/R2020a
```

Use MATLAB's `-sd` option to select the startup directory, and set the desktop
entry's `Path` to the same directory:

```ini
Exec="/opt/MATLAB/R2020a/bin/matlab" -desktop -sd /path/to/project
Path=/path/to/project
```

Replace both example paths with the actual MATLAB installation and project
directory. The `-sd` option controls MATLAB's startup folder. The `Path` entry
sets the Linux process working directory, so keeping both values aligned avoids
confusion when MATLAB is launched from the application menu.

For example, a complete per-user entry can contain:

```ini
[Desktop Entry]
Version=1.0
Type=Application
Name=MATLAB R2020a
Exec="/opt/MATLAB/R2020a/bin/matlab" -desktop -sd /path/to/project
TryExec=/opt/MATLAB/R2020a/bin/matlab
Path=/path/to/project
Terminal=false
Categories=Science;Math;Engineering;
```

After saving the file, launch MATLAB from the application menu and verify the
folder in the Command Window:

```matlab
pwd
```

The result should be the project directory.

## Connect from Python

Activate the Python environment containing the MATLAB Engine API and connect
to the shared desktop session:

```python
import matlab.engine

eng = matlab.engine.connect_matlab("matlab")
print("MATLAB folder:", eng.pwd())
```

From a shell, a compact connectivity check is:

```bash
python -c "import matlab.engine; e=matlab.engine.connect_matlab('matlab'); print(e.eval('pwd')); del e"
```

If the connection fails, check that:

- MATLAB is still running.
- `startup.m` contains `shareEngine`, not `connect_matlab`.
- Python imports `matlab.engine` from the intended environment.
- Both sides use the exact same session name, such as `matlab`.
- MATLAB and Python run as the same operating-system user.

## Summary

The configuration is small but the API boundary matters:

```text
startup.m  -> matlab.engine.shareEngine('matlab')
Python     -> matlab.engine.connect_matlab('matlab')
launcher   -> -sd /path/to/project
```

With these settings, MATLAB starts in the desired project directory, shares
its desktop session automatically, and can be reused by Python without paying
the startup cost of another MATLAB process.

For the Python Engine installation and version compatibility details, see
[Connect MATLAB R2020a to Python on Ubuntu](/posts/2026/09/connect-matlab-r2020a-python-engine-ubuntu/).
