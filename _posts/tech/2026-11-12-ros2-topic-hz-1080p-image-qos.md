---
title: "Why ros2 topic hz Under-Reports a 30 Hz 1080p Image Stream"
date: 2026-11-12
permalink: /posts/2026/11/ros2-topic-hz-1080p-image-qos/
categories: tech
tags: [ros2, qos, camera, debugging]
excerpt: "A low ros2 topic hz reading does not always mean the publisher is slow. Check recorded timestamps, subscription QoS, and what the monitor actually receives."
---

When measuring a 30 Hz camera topic with `ros2 topic hz`, it is tempting to treat the reported rate as the publisher's rate. That assumption can be wrong for large images: `ros2 topic hz` reports what its own subscription receives, and its QoS profile can affect that result.

This post walks through a reproducible example with 1920×1080 mono images. The main lesson is to check the bag timestamps and active QoS before blaming image decoding or the publisher.

* TOC
{:toc}

## Start with the recorded timestamps

A 1920×1080 mono image contains 2,073,600 pixel bytes before ROS message and transport overhead. At 30 frames per second, the pixel payload alone is about 62 MB/s. A large stream can stress middleware queues and subscribers even when the source data is correctly timestamped.

For a bag, first inspect its duration and message counts:

```bash
ros2 bag info /path/to/camera_bag
```

Then inspect the image intervals directly from message header timestamps or bag record timestamps. In the example used here, the bag held 1,816 images over about 60.86 seconds. The median image interval was 33.323 ms, or about 29.93 Hz. The header and bag record timestamps matched. The bag therefore contained a 30 Hz timeline, regardless of how quickly it had been created.

This distinction matters: decoding a video slowly while converting it into a bag can make conversion take longer, but it does not lower the bag's playback cadence if the converted messages retain their original timestamps.

## `ros2 topic hz` already uses raw messages in Jazzy

One plausible explanation for a low image rate is Python spending too long constructing a full `sensor_msgs/Image` object. That was not the explanation in this Jazzy case. The [Jazzy `ros2 topic hz` implementation](https://github.com/ros2/ros2cli/blob/jazzy/ros2topic/ros2topic/verb/hz.py) subscribes with `raw=True` when no `--filter` expression is provided, so it receives serialized message data rather than deserializing the full image into Python fields.

The implementation still measures the arrival rate at its own subscription. The ROS 2 CLI help also warns that the result can be affected by platform resources and QoS. A monitor's rate is not automatically the publisher's rate or the bag's timestamp rate.

## Inspect the QoS on both ends

In Jazzy, `ros2 topic hz` uses the sensor-data QoS profile by default: `KEEP_LAST` history with depth 5, `BEST_EFFORT` reliability, and `VOLATILE` durability. The [ROS 2 QoS design](https://design.ros2.org/articles/qos.html) explains that the sensor-data profile favors fresh measurements over retrying every sample. That is useful for many live sensor streams, but it also means a subscriber can miss samples if it or the middleware cannot keep up.

Check the publisher and subscriber actually matched on the topic:

```bash
ros2 topic info -v /camera/image_raw
```

In the example, the bag player offered `RELIABLE` QoS. A raw subscriber using reliable QoS with depth 10 received the expected image rate during 0.25× playback: 7.482 Hz, close to the expected 7.48 Hz. A raw subscriber using the sensor-data profile received about 2.58 Hz in a separate run. These runs changed both reliability and queue depth, so they show that the measurement was QoS-sensitive; they do not isolate which policy caused the difference.

## A small raw-rate monitor

For a clearer comparison, this standalone Python tool follows `ros2 topic hz`'s raw-subscription approach and lets you select a reliable, depth-10 QoS profile. It discovers the topic type automatically, then measures callback arrival intervals with a monotonic clock. It does not deserialize image payloads. Save it as `ros2topic_hz.py` in a ROS 2 Python environment and run it after sourcing that environment:

```python
#!/usr/bin/env python3
"""Measure a ROS 2 topic's receive rate without deserializing message payloads.

By default this follows ``ros2 topic hz`` and uses sensor-data QoS. Use
``--reliable`` to compare against a reliable, depth-10 subscription.

Examples:
    ros2topic_hz.py /cam0/image_raw
    ros2topic_hz.py /cam0/image_raw --reliable
"""

from __future__ import annotations

import argparse
import math
import statistics
import sys
import time
from collections import deque

import rclpy
from rclpy.node import Node
from rclpy.qos import (
    DurabilityPolicy,
    HistoryPolicy,
    QoSProfile,
    ReliabilityPolicy,
    qos_profile_sensor_data,
)
from rosidl_runtime_py.utilities import get_message


def find_topic_type(node: Node, topic: str) -> tuple[str, str] | None:
    """Return the resolved topic name and its unique type, if discovered."""
    resolved = node.resolve_topic_name(topic)
    matches = [types for name, types in node.get_topic_names_and_types() if name == resolved]
    if not matches:
        return None
    types = matches[0]
    if len(types) != 1:
        raise ValueError(f"Topic {resolved} has ambiguous types: {', '.join(types)}")
    return resolved, types[0]


def positive_int(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("must be a positive integer") from exc
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("topic", help="ROS 2 topic name, such as /cam0/image_raw")
    parser.add_argument(
        "--window", "-w", type=positive_int, default=10000,
        help="number of message intervals to average (default: 10000)",
    )
    parser.add_argument(
        "--reliable", action="store_true",
        help="use reliable, keep-last depth-10 QoS instead of sensor-data QoS",
    )
    args = parser.parse_args()

    rclpy.init()
    node = rclpy.create_node("ros2topic_hz_raw")
    try:
        topic_info = None
        while rclpy.ok() and topic_info is None:
            topic_info = find_topic_type(node, args.topic)
            if topic_info is None:
                rclpy.spin_once(node, timeout_sec=0.1)
        if topic_info is None:
            return 0

        topic, type_name = topic_info
        message_type = get_message(type_name)
        if args.reliable:
            qos = QoSProfile(
                history=HistoryPolicy.KEEP_LAST,
                depth=10,
                reliability=ReliabilityPolicy.RELIABLE,
                durability=DurabilityPolicy.VOLATILE,
            )
            print(f"Subscribing raw to {topic} [{type_name}] with reliable QoS (depth 10).")
        else:
            qos = qos_profile_sensor_data
            print(f"Subscribing raw to {topic} [{type_name}] with sensor-data QoS.")

        intervals: deque[float] = deque(maxlen=args.window)
        last_message_time: float | None = None
        sample_count = 0

        def on_message(_serialized_message: bytes) -> None:
            nonlocal last_message_time, sample_count
            current = time.monotonic()
            sample_count += 1
            if last_message_time is not None:
                intervals.append(current - last_message_time)
            last_message_time = current

        node.create_subscription(message_type, topic, on_message, qos, raw=True)
        print("Waiting for messages... (Ctrl+C to stop)", flush=True)
        last_print_time = time.monotonic()
        last_printed_count = 0
        while rclpy.ok():
            rclpy.spin_once(node, timeout_sec=0.1)
            current = time.monotonic()
            if current - last_print_time < 1.0 or sample_count == last_printed_count:
                continue
            if intervals:
                mean = statistics.fmean(intervals)
                stddev = math.sqrt(statistics.fmean((x - mean) ** 2 for x in intervals))
                print(
                    f"average rate: {1.0 / mean if mean else 0.0:.3f}\n"
                    f"\tmin: {min(intervals):.3f}s max: {max(intervals):.3f}s "
                    f"std dev: {stddev:.5f}s window: {len(intervals)}",
                    flush=True,
                )
            last_print_time = current
            last_printed_count = sample_count
        return 0
    except KeyboardInterrupt:
        return 0
    except (ImportError, ValueError) as exc:
        print(f"ros2topic_hz.py: {exc}", file=sys.stderr)
        return 2
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    raise SystemExit(main())
```

With playback at normal speed, the reliable subscription reported about 29.94 Hz:

```text
python3 ros2topic_hz.py /cam0/image_raw --reliable
Subscribing raw to /cam0/image_raw [sensor_msgs/msg/Image] with reliable QoS (depth 10).
Waiting for messages... (Ctrl+C to stop)
average rate: 29.970
        min: 0.023s max: 0.044s std dev: 0.00274s window: 30
average rate: 29.950
        min: 0.023s max: 0.044s std dev: 0.00368s window: 60
average rate: 29.942
```

At 0.25× playback, it reported about 7.48 Hz, as expected from a 30 Hz source played at one quarter speed:

```text
python3 ros2topic_hz.py /cam0/image_raw --reliable
Subscribing raw to /cam0/image_raw [sensor_msgs/msg/Image] with reliable QoS (depth 10).
Waiting for messages... (Ctrl+C to stop)
average rate: 7.497
        min: 0.123s max: 0.143s std dev: 0.00753s window: 7
average rate: 7.486
        min: 0.123s max: 0.145s std dev: 0.00728s window: 15
average rate: 7.482
```

Use `--reliable` only when the publisher offers compatible reliable QoS. A reliable subscriber will not match a best-effort publisher. The monitor measures received callback timing; use bag timestamps to assess the source timeline and a message count over a known interval to quantify losses.

The same bag was also replayed at 1× with a best-effort publisher override. `ros2 topic hz` reported windowed rates between about 13.8 and 27.2 Hz, with substantial jitter, rather than a stable 30 Hz. This confirms that changing the publisher to best effort did not make the CLI measurement reliable in that setup. It does not, by itself, identify whether the losses occurred in the publisher, transport, middleware queues, or subscriber scheduling.

## Override playback QoS when testing a specific match

`ros2 bag play` accepts QoS overrides through a YAML file. For example:

```yaml
/camera/image_raw:
  history: keep_last
  depth: 50
  reliability: best_effort
  durability: volatile
```

Play the bag with the override:

```bash
ros2 bag play /path/to/camera_bag \
  --qos-profile-overrides-path qos_override.yaml
```

Confirm the offered profile with `ros2 topic info -v`; do not assume the override took effect just because playback started. A best-effort publisher only matches subscribers whose requested reliability is best effort. If a subscriber requests reliable delivery, changing the publisher to best effort makes the QoS incompatible and the subscriber will not receive the topic.

## A practical measurement sequence

1. Inspect bag duration, message counts, and recorded timestamp intervals.
2. Start `ros2 topic hz` before playback, so it measures the active stream.
3. Inspect runtime publisher and subscriber QoS with `ros2 topic info -v`.
4. Compare a raw subscriber under sensor-data QoS with one using a deeper reliable profile. Keep the changed policies explicit.
5. Count received messages over a known interval when you need to establish loss; a windowed rate alone does not reveal the exact number of missing frames.

## Takeaway

A low `ros2 topic hz` reading on a large image stream is evidence about that subscription's observed arrivals. It is not enough to conclude that the bag contains a low-rate stream, that video decoding throttled the stored data, or that Python image deserialization is the bottleneck. Compare timestamps, inspect QoS, and measure received counts before assigning a cause.
