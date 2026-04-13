---
title: "Good Software Rules"
date: 2026-04-13
permalink: /posts/2026/04/good_software_rules/
categories: tech
tags: [software, architecture, agents, engineering]
---

These are rules to reread, not slogans to admire.

They are meant to keep software small, understandable, and maintainable when a human works with agents.

* TOC
{:toc}

# The rules

## 1. No tool without a clear pain point

Do not introduce a tool because it is available, fashionable, or theoretically cleaner.

A tool should remove a real bottleneck:

- repeated confusion
- repeated mistakes
- slow feedback
- painful deployment
- hard-to-see system behavior

If the pain is vague, the tool is probably premature.

## 2. No abstraction without repeated use

Do not generalize from one example.

Wait until the same shape appears multiple times and the duplication is clearly the same thing, not merely similar words. A good abstraction removes repeated decisions. A bad abstraction hides differences that still matter.

Prefer copying a small piece twice over creating a shared layer too early. Duplication is cheaper than the wrong abstraction.

## 3. No automation without a repeated manual burden

Automation is a maintenance commitment.

If a task is not frequent, expensive, or error-prone, manual execution is often better. The first question is not "Can this be automated?" but "Will this save real effort repeatedly?"

Good candidates for automation:

- a task done often
- a task humans regularly forget
- a task where consistency matters
- a task where manual work is slow enough to interrupt flow

## 4. No structure that agents and humans will ignore

A structure that looks correct but is not actually used is waste.

This includes:

- directories nobody remembers
- documents nobody rereads
- processes nobody follows
- templates nobody fills in honestly
- abstractions nobody trusts

The test is not whether the structure is elegant. The test is whether it changes behavior in daily work.

# What these rules optimize for

These rules bias toward:

- directness over ceremony
- local clarity over speculative reuse
- habits that survive real work
- systems that both humans and agents can follow

They are intentionally conservative. Most software gets worse from adding the next thing too early, not from waiting a little longer.

# How to work with agents under these rules

Agents make it easier to create complexity at high speed. That makes restraint more important, not less.

When working with agents:

- ask for concrete changes before frameworks
- prefer file-local edits before cross-cutting redesign
- require a real reason for each new layer, tool, or workflow
- treat generated structure as suspicious until it proves useful
- keep instructions short enough that a human will still reread them

An agent can produce ten plausible abstractions in minutes. The human's job is to keep only what earns its place.

# A practical test

Before adding anything new, ask:

1. What specific pain does this solve?
2. Has this problem repeated enough to justify a general solution?
3. Will this save effort more than once?
4. Will people and agents actually use this structure next month?

If the answer is unclear, do less.

# Default direction

When uncertain:

- choose the simpler toolchain
- choose the more obvious code
- choose the manual step over fragile automation
- choose the duplicated code over premature indirection
- choose the note people will reread over the process people will ignore

Good software is often the result of refusing many reasonable-sounding additions.
