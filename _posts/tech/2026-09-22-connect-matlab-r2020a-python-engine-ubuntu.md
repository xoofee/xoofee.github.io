---
title: "Connect MATLAB R2020a to Python on Ubuntu"
date: 2026-09-22
permalink: /posts/2026/09/connect-matlab-r2020a-python-engine-ubuntu/
categories: tech
tags: [matlab, python, ubuntu, linux, automation]
excerpt: "Use a compatible Python environment and MATLAB Engine API to connect Python to an existing MATLAB R2020a desktop session."
---

MATLAB can be controlled from Python without starting a new MATLAB process for every command. The MATLAB Engine API can attach Python to a shared MATLAB session, allowing a human to keep using the desktop while Python runs commands, scripts, and experiments.

This is especially useful for an older MATLAB release on a current Ubuntu system. MATLAB R2020a supports Python 2.7, 3.6, and 3.7 for its Engine API, while a modern Ubuntu installation may default to a much newer Python version.

* TOC
{:toc}

## The Target Setup

The final connection looks like this:

```text
MATLAB desktop session
        ↕
MATLAB Engine shared session
        ↕
Python client
```

The Python client connects to the existing MATLAB process. It does not call `start_matlab()`, which would create another MATLAB instance.

## Install Python 3.7

On Ubuntu 24.04, Python 3.7 is not normally available from the standard repositories. The Deadsnakes PPA provides older Python releases:

```bash
sudo apt update
sudo apt install -y software-properties-common

sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update

sudo apt install -y python3.7 python3.7-distutils virtualenv
```

Python 3.7 is end-of-life, so use it only in an isolated environment for this legacy MATLAB integration. Do not replace Ubuntu's system Python.

## Create an Isolated Environment

Create a dedicated environment with Python 3.7:

```bash
mkdir -p /path/to/pyenvs
virtualenv -p /usr/bin/python3.7 /path/to/pyenvs/matlab
source /path/to/pyenvs/matlab/bin/activate
```

Verify the interpreter:

```bash
python --version
which python
```

The interpreter should be Python 3.7, and the path should point into the new environment.

## Work Around the R2020a Packaging Metadata

MATLAB R2020a's Engine installer is an old `setup.py` package. Its metadata declares the version as `R2020a`, which is not a valid PEP 440 version for newer `setuptools` releases.

Without adjustment, installation can fail with:

```text
InvalidVersion: Invalid version: 'R2020a'
```

Pin `setuptools` to an older release inside the MATLAB-specific environment:

```bash
python -m pip install --force-reinstall "setuptools==59.6.0"
```

Do not downgrade `setuptools` in unrelated Python environments.

## Install the MATLAB Engine API

Install the Engine API shipped with the MATLAB installation. Replace the example MATLAB root with the actual installation directory:

```bash
python -m pip install \
  /opt/MATLAB/R2020a/extern/engines/python
```

If the pip-based installation still invokes incompatible modern packaging behavior, use the legacy installer after pinning `setuptools`:

```bash
cd /opt/MATLAB/R2020a/extern/engines/python
python setup.py install
```

The deprecation warnings emitted by `setup.py install` are expected for this old package. The installation is successful if the command finishes without an exception.

Test the import:

```bash
python -c "import matlab.engine; print('MATLAB Engine imported')"
```

## Share the Existing MATLAB Session

Open the MATLAB desktop and run this command in its Command Window:

```matlab
matlab.engine.shareEngine('my_matlab')
```

The name is arbitrary, but it must be used consistently by Python. MATLAB sessions are not shared by default.

## Connect from Python

With the virtual environment active, discover shared sessions:

```bash
python -c "import matlab.engine; print(matlab.engine.find_matlab())"
```

The result should contain the session name:

```text
('my_matlab',)
```

Connect to that existing session:

```python
import matlab.engine

eng = matlab.engine.connect_matlab("my_matlab")

print("Connected")
print("sqrt(16) =", eng.sqrt(16.0))
print("MATLAB folder =", eng.pwd())
```

`connect_matlab()` attaches to the desktop session. `start_matlab()` has different behavior: it launches a new MATLAB process.

## Run Commands and Scripts

MATLAB commands that do not return a value should specify `nargout=0`:

```python
eng.eval("xx = 1;", nargout=0)
print(eng.workspace["xx"])
```

Calling `eng.eval("xx=1")` without `nargout=0` can produce a MATLAB syntax error because the assignment statement is being requested as though it should return an output.

Run an `.m` file in the shared session:

```python
eng.cd("/path/to/project", nargout=0)
eng.run("analysis.m", nargout=0)
```

Retrieve a value from the MATLAB workspace:

```python
value = eng.eval("xx", nargout=1)
print(value)
```

You can also assign simple values directly:

```python
eng.workspace["gain"] = 2.5
print(eng.workspace["gain"])
```

Keep the Python process alive if it will issue multiple commands. Reusing the same `eng` object avoids MATLAB startup time. Avoid calling `start_matlab()` for each operation, and do not call `eng.quit()` unless closing the MATLAB session is intentional.

## Troubleshooting Checklist

- If the installer rejects Python 3.12, activate the Python 3.7 environment before installing the Engine API.
- If installation fails with `InvalidVersion: 'R2020a'`, pin `setuptools` to `59.6.0`.
- If `find_matlab()` returns an empty tuple, run `matlab.engine.shareEngine('my_matlab')` in the desktop MATLAB session.
- Run MATLAB and Python as the same operating-system user.
- Use `nargout=0` for assignments, scripts, and commands that do not return values.

The [MATLAB Engine API documentation](https://www.mathworks.com/help/matlab/matlab-engine-for-python.html) describes the supported Python versions, shared-session functions, workspace access, and MATLAB function calls.
