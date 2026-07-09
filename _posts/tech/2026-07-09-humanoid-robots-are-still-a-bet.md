---
title: "Humanoid Robots Are Still a Bet"
date: 2026-07-09
permalink: /posts/2026/07/humanoid_robots_are_still_a_bet/
categories: tech
tags: [ai, robotics, humanoid, engineering]
author: mainly ai
---

Current LLMs are already useful, but they still have several hard limits.

The important ones are not small inconveniences:

- real online learning is mostly missing
- long and complicated tasks are unstable
- vision and physical-world understanding lag behind language
- power consumption is high

These limits matter for coding agents. They matter even more for humanoid robots.

* TOC
{:toc}

# The fundamental missing piece

The deepest limitation is online learning.

A human expert changes through experience. A programmer who has worked on one codebase for years has a different brain from the day they joined the project. They remember failures, develop taste, learn local shortcuts, build a model of the system, and become less fragile.

An LLM-based agent does not learn like that during normal use.

It may have:

- a long context window
- memory
- retrieval
- tools
- logs
- a harness around it

But these are mostly external aids. The model weights usually do not become better after finishing a thousand tasks. The system may remember facts, but it has not deeply changed itself.

That is why a coding agent can be impressive on a bounded task and still fail to behave like a senior engineer on a large software project. It can edit files, run tests, and explain tradeoffs. But over a long chain of decisions it may lose the architecture, repeat old mistakes, undo previous fixes, or make local changes that do not fit the whole system.

This is not only a context length problem. It is an executive function problem.

# Long tasks expose the gap

Long-horizon work requires more than intelligence in one moment.

It requires:

- stable goals
- memory of previous decisions
- error correction
- taste
- attention to constraints
- a model of what matters and what does not

LLMs can imitate these things for a while. With a good harness, tests, tools, and review loops, they can become much more useful. But complicated work has thousands of small decisions. Small errors accumulate.

Robotics makes this worse.

In software, a wrong edit can often be rolled back. In the physical world, a wrong motion can drop a tool, break a part, injure a person, or stop a production line.

# Language is the easy world

Language is already digitized. The internet is full of text. Code is text. Documentation is text. A language model lives in a world that has already been turned into tokens.

Robots do not.

A robot must deal with:

- lighting
- depth
- occlusion
- friction
- deformation
- contact force
- object permanence
- uncertainty

Picking up a towel, opening a plastic bag, or inserting a slightly misaligned connector can be harder than answering a difficult question. The physical world has no clean API.

This is why humanoid robot demos can look both magical and suspicious. A video may show a robot completing a task, but the key questions are hidden:

- How many takes were needed?
- Was it teleoperated?
- How structured was the environment?
- What happens when the object is moved five centimeters?
- What happens when the lighting changes?
- How often does the robot fail?

The answer to those questions matters more than the demo itself.

# Why capital still flows into humanoids

The investment case is not that humanoid robots are already human-level workers.

The investment case is that the world is built for human bodies.

Factories, warehouses, homes, hospitals, hotels, and restaurants already contain:

- stairs
- doors
- shelves
- handles
- tools
- carts
- elevators
- workbenches

A fixed robot arm is usually more economical for a single repeated task. It is faster, more precise, more rigid, and easier to power. For welding, painting, pick-and-place, or a stable assembly cell, traditional automation wins.

But fixed automation has another cost: integration.

The robot arm is only one part. The factory also needs fixtures, feeders, cages, conveyors, deterministic scripts, and engineers to make the whole cell reliable. If the product changes, the automation may need to be redesigned.

Humanoid robots are a bet on the opposite economic model:

- keep the environment mostly unchanged
- use one general hardware platform
- add new behavior through software and data
- automate the messy tasks between existing machines

This is the "long tail" argument. A factory may already automate the central production steps, while humans still do all the awkward work around them: unpacking parts, moving bins, restocking feeders, checking labels, plugging cables, cleaning, inspecting, and recovering from small failures.

A humanoid robot does not need to beat an industrial arm at being an industrial arm. It needs to become cheap and reliable enough for the tasks that are not worth custom automation.

# Musk's scale argument

This is also how to read Elon Musk's large Optimus production claims, including reports about a Fremont line targeting very high annual volume.

The claim is not really "a million human experts." It is "a million physical workers for repetitive tasks, manufactured at automotive scale."

That matters because robotics economics changes with volume. If a company builds only a few thousand specialized robots, every actuator, sensor, gearbox, hand, and service process stays expensive. If it builds hundreds of thousands or millions of similar robots, it can attack the bill of materials like a car company or phone company.

The optimistic version is:

- standardized humanoid hardware
- large-scale actuator production
- cheaper components
- more deployed robots
- more real-world data
- better policies
- more useful robots

It is a powerful loop if it starts working.

The dangerous word is "if".

# The reasons for skepticism

Skepticism is not anti-technology here. It is the technically conservative position.

First, reliability is brutal.

A traditional industrial robot arm has a small number of joints and is bolted to the floor. A humanoid has many actuators, hands, sensors, batteries, thermal constraints, and balance problems. More moving parts mean more failure modes.

If a robot needs a human technician too often, the labor-saving story collapses.

Second, the AI is brittle.

Imitation learning can make a robot look capable inside the training distribution. But if the part is oily, the box is torn, the cable is tangled, or the bolt is tilted in an unfamiliar way, the robot may not adapt like a human.

Without real online learning, many failures become data collection and retraining problems. A human worker adjusts in seconds. A robot fleet may need a software cycle.

Third, energy is not free.

A fixed arm does not spend energy balancing a human-shaped body. A humanoid must carry its own battery, move its own mass, manage heat, and keep itself upright. The human brain uses around 20 watts. A robot body plus onboard compute is a much harder power problem.

Fourth, operations are underrated.

Deploying one impressive robot is different from maintaining a fleet. At scale, the hard questions become boring and decisive:

- Who repairs the hands?
- How often do actuators fail?
- How long does calibration take?
- How many spare parts are needed?
- What is the real uptime?
- How much human supervision remains?

Software investors may imagine software margins. Physical machines usually bring physical maintenance.

# What could work in the short term

Humanoid robots may still become useful without becoming general human replacements.

The short-term path is narrower:

- structured factories
- repetitive logistics
- controlled lighting
- limited task menus
- teleoperation fallback
- fleet learning from failures
- slow expansion from easy tasks to harder ones

This is not science fiction. It is also not a full human worker.

The first useful humanoids may be closer to mobile automation platforms with hands than to human-like agents. They may do one narrow job, then three, then ten. The success condition is not intelligence in the abstract. It is uptime, cost, safety, and repeatability.

# The current conclusion

Humanoid robots are not obviously fake. The economic thesis has logic: the world is built for humans, and many tasks are too awkward or variable for traditional fixed automation.

But they are also not obviously near.

The missing online learning problem is real. Long-horizon instability is real. Vision and manipulation are still hard. Power, reliability, and maintenance may be harder than the demos suggest.

So the sober view is:

Humanoid robots are a serious bet, not a solved product.

Capital is buying the chance that hardware scale, physical data, better control systems, and better AI will meet in the middle. Maybe that works. Maybe there is a humanoid winter first.

For now, the right attitude is neither hype nor dismissal.

It is to ask the boring questions:

- What task?
- What environment?
- What failure rate?
- What uptime?
- What supervision?
- What cost per useful hour?

If those numbers work, the robot is real.

If they do not, it is still a dancing show.
