---
title: "Building a Bioinformatics Docker Environment with Python, R, and Jupyter Lab"
date: 2025-11-02
permalink: /posts/2025/11/bioinformatics-docker-environment/
categories: tech
tags: [docker, bioinformatics, python, r, jupyter, seurat, containerization]
excerpt: "A comprehensive Docker setup for bioinformatics work, featuring non-root user configuration, Python virtual environments, R with Seurat, and Jupyter Lab with multi-profile docker-compose support."
---

This post documents a Docker-based development environment tailored for bioinformatics research, combining Python, R (with Seurat for single-cell analysis), and Jupyter Lab in a single container with proper non-root user setup.

* TOC
{:toc}

## Overview

The setup provides:
- **Non-root user** configuration for better security and file permissions
- **Python 3** with virtual environments and Jupyter Lab
- **R** with Seurat, ggplot2, data.table, and sf packages
- **Chinese mirror sources** (Tsinghua University) for faster package downloads
- **Docker Compose profiles** for development and release environments
- **Host network mode** for seamless port access

## Dockerfile 

```
# docker build --build-arg UID=$(id -u) --build-arg GID=$(id -g) --build-arg USERNAME=biouser -t ubuntu-nonroot .

# FROM ubuntu:jammy
FROM ubuntu:25.04

# Install common packages
# Replace Ubuntu mirrors with Tsinghua
# ubuntu:jammy: /etc/apt/sources.list
RUN sed -i 's|archive.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/ubuntu.sources \
    && sed -i 's|security.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/ubuntu.sources \
    && apt update

# passwd is for delluser and delgroup
RUN apt install -y sudo adduser

# Create a non-root user
ARG USERNAME=biouser
ARG UID=1000
ARG GID=1000

# --remove-home ubuntu requires perl, so skip
RUN deluser ubuntu || true \
    && delgroup ubuntu || true \
    && groupadd -g 1000 biouser \
    && useradd -m -u 1000 -g biouser -s /bin/bash biouser \
    && echo "biouser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# RUN groupadd -g $GID $USERNAME \
#     && useradd -m -u $UID -g $USERNAME -s /bin/bash $USERNAME \
#     && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to the new user
USER $USERNAME
WORKDIR /home/$USERNAME
ENV HOME=/home/$USERNAME

# need relogin and apt update to populate the database
RUN sudo apt install -y command-not-found
RUN sudo apt update

# to avoid tzdata require input in the following apt installation
ENV TZ=Asia/Shanghai
RUN sudo ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ | sudo tee /etc/timezone

RUN sudo apt install \
    nano vim \
    build-essential cmake \
    -y

# ------------------------------------------------------------------- python
RUN sudo apt install -y python3 python3-pip python3-virtualenv

# RUN pip config set global.index-url https://mirrors.cloud.tencent.com/pypi/simple
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# pip install some binaries to .local/bin folder
ENV PATH=$HOME/pyenvs/bio/bin:$HOME/.local/bin:$PATH

ENV BIOPY=$HOME/pyenvs/bio
RUN virtualenv $BIOPY
RUN echo "source $HOME/pyenvs/bio/bin/activate" >> $HOME/.bashrc

# ------------------------------------------------------------------- jupyter
RUN $BIOPY/bin/pip install jupyterlab

ENV JUPYTER_CONFIG_DIR=$HOME/.jupyter
RUN mkdir -p $JUPYTER_CONFIG_DIR

# Set hashed password
RUN echo '{ \
  "IdentityProvider": { \
    "hashed_password": "<replace with password genreation by jupyter server password>" \
  } \
}' > $JUPYTER_CONFIG_DIR/jupyter_server_config.json

# ------------------------------------------------------------------- R core
RUN sudo apt install -y r-base r-base-dev

# Speed up R compilation
RUN echo "MAKEFLAGS=-j$(nproc)" | sudo tee -a /etc/R/Makeconf
ENV MAKEFLAGS="-j8"

# the default repos sometimes cause download error, the tsinghua is very stable
RUN R_VERSION=$(Rscript -e 'cat(paste0(R.version$major, ".", strsplit(R.version$minor, "[.]")[[1]][1]))') && \
    mkdir -p ~/R/x86_64-pc-linux-gnu-library/${R_VERSION} && \
    echo ".libPaths('~/R/x86_64-pc-linux-gnu-library/${R_VERSION}')" >> ~/.Rprofile

RUN echo 'options(repos = c(CRAN = "https://mirrors.tuna.tsinghua.edu.cn/CRAN/"))' >> ~/.Rprofile

RUN Rscript -e 'install.packages("IRkernel"); IRkernel::installspec(user = TRUE)'

# ------------------------------------------------------------------- R application
# required by Seurat (as the installation message hint)
RUN sudo apt install -y libcurl4-openssl-dev libssl-dev
# Matrix is already bundled with R-base
RUN Rscript -e 'install.packages("Seurat")'

RUN Rscript -e 'install.packages(c("ggplot2", "data.table"))'

RUN sudo apt install -y libudunits2-dev libssl-dev cmake libgdal-dev libgeos-dev libproj-dev libsqlite3-dev libudunits2-dev
RUN Rscript -e 'install.packages("sf")'

# ------------------------------------------------------------------- jupyter service

ENV JUPYTER_PORT=8889
# set SHELL and -l (login shell) to make the terminal in jupyter with normal prompt
ENV SHELL=/bin/bash
CMD ["bash", "-lc", "jupyter lab --ip=0.0.0.0 --port=$JUPYTER_PORT --no-browser --notebook-dir=/"]

# Keep container alive for background dev
# CMD ["sleep", "infinity"]

```

Key R packages:
- **Seurat**: Single-cell RNA-seq analysis
- **ggplot2**: Data visualization
- **data.table**: Fast data manipulation
- **sf**: Spatial data handling

## Docker Compose Configuration

```

version: "3.9"

services:
  # =========================================================
  # Development profile: full rebuilds, uses local Dockerfile
  # =========================================================
  biodev:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        UID: ${UID:-1000}
        GID: ${GID:-1000}
        USERNAME: biouser
    image: bio:dev
    container_name: bio-dev
    hostname: docker-dev
    profiles: ["dev"]
    environment:
      - JUPYTER_PORT=8887
    extra_hosts:
      - "docker-dev:127.0.0.1"
    volumes:
      - /work:/work
    working_dir: /work
    tty: true
    network_mode: host
    shm_size: "2g"

  # =========================================================
  # Release profile: use prebuilt stable image
  # =========================================================
  biorelease:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        UID: ${UID:-1000}
        GID: ${GID:-1000}
        USERNAME: biouser  
    image: bio:release
    container_name: bio-release
    hostname: docker
    profiles: ["release"]
    restart: unless-stopped
    environment:
      - JUPYTER_PORT=8889
    extra_hosts:
      - "docker:127.0.0.1"
    volumes:
      - /work:/work
    working_dir: /work
    tty: true
    network_mode: host
    shm_size: "2g"

```

### Key Features

1. **Profiles**: Separate `dev` and `release` profiles for different use cases
2. **Host network mode**: Direct access to ports on the host
3. **Volume mounts**: Mounts `/nfs`, `/media`, and `/work` directories
4. **Shared memory**: 2GB `shm_size` for applications that need it (e.g., R)
5. **TTY**: Interactive terminal support

## Usage

### Build and Run Development Container

```bash
# Build and start development container
sudo docker compose -f docker-compose.yml --profile dev up -d --build

# Clean up unused images after build
docker image prune -f
```

### Run Pre-built Release Container

```bash
# Start release container (no rebuild)
sudo docker compose -f docker-compose.yml --profile release up -d

# Or build and run release
sudo docker compose --profile release -f docker-compose.yml up --pull never --build -d && docker image prune -f
```

### Access Jupyter Lab

After starting the container, access Jupyter Lab at:
- **Development**: `http://localhost:8887`
- **Release**: `http://localhost:8889`

The password is configured in the Dockerfile (you'll need to set your own hash for production).

### Access Container Shell

```bash
# Development container
sudo docker exec -it bio-dev bash

# Release container
sudo docker exec -it bio-release bash
```

## Build Arguments

When building, you can customize the user:

```bash
docker build --build-arg UID=$(id -u) --build-arg GID=$(id -g) --build-arg USERNAME=biouser -t ubuntu-nonroot .
```

This ensures the container user matches your host user ID/GID for seamless file permissions.

## Configuration Notes

### Timezone

The Dockerfile sets the timezone to `Asia/Shanghai`:

```dockerfile
ENV TZ=Asia/Shanghai
RUN sudo ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ | sudo tee /etc/timezone
```

### Command Default

The container runs Jupyter Lab by default:

```dockerfile
ENV SHELL=/bin/bash
CMD ["bash", "-lc", "jupyter lab --ip=0.0.0.0 --port=$JUPYTER_PORT --no-browser --notebook-dir=/"]
```

## Best Practices

1. **User IDs**: Match container UID/GID with host user for volume mounts
2. **Password Security**: Replace the hardcoded Jupyter password hash with your own
3. **Mirror Selection**: Adjust package mirrors based on your geographic location
4. **Resource Limits**: Consider adding memory/CPU limits in docker-compose for production
5. **Volume Permissions**: Ensure mounted directories have appropriate permissions

## Summary

This Docker setup provides a complete bioinformatics environment with:
- Secure non-root user execution
- Python and R ecosystems
- Jupyter Lab for interactive analysis
- Optimized package installation via Chinese mirrors
- Flexible deployment via Docker Compose profiles

Perfect for single-cell RNA-seq analysis with Seurat, general data science work, and reproducible research environments.

