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
