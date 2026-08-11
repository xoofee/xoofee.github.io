---
title: "Why ROS 2 Demands System Python (And How to Fix Virtual Environment Conflicts)"
date: 2026-08-11
permalink: /posts/2026/08/ros2-system-python-venv/
categories: tech
tags: [ros2, python, venv, colcon, ubuntu]
excerpt: "Standard Python virtual environments hide ROS 2 apt packages from colcon. Use --system-site-packages so pip stays isolated while builds can still import em, catkin_pkg, and friends."
---

If you have ever run `colcon build` inside an active Python virtual environment (`venv`, `conda`, or `virtualenv`) and hit a cryptic error like `ModuleNotFoundError: No module named 'em'` or `No module named 'catkin_pkg'`, you are not alone.

Here is why ROS 2 heavily relies on **system Python**, why standard virtual environments break builds, and how to configure a virtual environment correctly for ROS 2.

* TOC
{:toc}

## ROS 2 core infrastructure is packaged via apt

When you install ROS 2 on Ubuntu (e.g., `sudo apt install ros-jazzy-desktop`), Debian packages place critical Python tools—such as `rosidl_adapter`, `ament_cmake`, `empy`, and `catkin_pkg`—directly into the system Python directory:

```text
/usr/lib/python3.12/site-packages/  (or dist-packages)
```

When you create and activate a standard virtual environment, your shell points `PATH` and `PYTHONPATH` to an isolated folder (e.g., `~/pyenvs/cv/bin/python3`). That environment **does not contain ROS 2's system packages**, so imports inside code generators fail.

## CMake caches the Python interpreter path

Even running `deactivate` in your terminal might **not fix the build immediately**.

During an initial `colcon build`, CMake detects the active virtual environment Python executable (`~/pyenvs/cv/bin/python3`) and writes it into `build/CMakeCache.txt`. Subsequent build commands keep invoking that interpreter until you purge the `build/`, `install/`, and `log/` directories.

## The solution: use `--system-site-packages`

If you need a virtual environment to install custom PyPI dependencies (like OpenCV, PyTorch, or custom utilities) without touching system files, create it with the `--system-site-packages` flag:

```bash
python3 -m venv --system-site-packages my_ros_env
source my_ros_env/bin/activate
```

### How `--system-site-packages` works

- **`pip install` stays isolated:** Running `pip install <package>` installs files into `my_ros_env/lib/python3.x/site-packages/`. It does **not** write to system folders and does not require `sudo`.
- **Inherits ROS 2 dependencies:** Read access is granted to `/usr/lib/python3/dist-packages/`, so `colcon build` can import `em`, `catkin_pkg`, and `rclpy`.
- **Saves storage and build time:** Large libraries already installed on the OS (for example `numpy`, `scipy`, or OpenCV) are reused instead of being re-downloaded or compiled again.
- **Overrides when needed:** Running `pip install --upgrade <package>` installs the requested version into `my_ros_env/`, which takes priority over the system version while the environment is active.

## Summary checklist for ROS 2 workspace builds

1. **Option A (system Python):** Run `deactivate`, purge old build artifacts (`rm -rf build/ install/ log/`), source ROS 2 (`source /opt/ros/jazzy/setup.bash`), and run `colcon build`.
2. **Option B (virtual environment):** Create your environment with `python3 -m venv --system-site-packages <env_name>`, activate it, source ROS 2, and build.
