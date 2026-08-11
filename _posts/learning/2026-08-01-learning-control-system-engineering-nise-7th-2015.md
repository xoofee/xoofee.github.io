---
title: "Learning Notes: Control Systems Engineering (Nise 7th, 2015)"
date: 2026-08-01
permalink: /posts/2026/08/learning-control-system-engineering-nise-7th-2015/
categories: learning
tags: [control-systems, nise, matlab, feedback, notes]
excerpt: "Shared learning notes for Nise Control Systems Engineering 7th Edition — review questions with my answers and LLM answers side by side."
---

Shared notes while working through **Norman S. Nise, *Control Systems Engineering*, 7th Edition (2015)** — review questions, skill problems, and MATLAB experiments.

Human answers and LLM drafts live side by side under each question so either can be added or revised without rewriting the structure.

* TOC
{:toc}

## Conventions

Use one heading per question. Under it, keep at most two answer blocks:

| Label | Who writes it |
| --- | --- |
| **Me** | My own answer / intuition |
| **LLM** (`model`) | Draft from an LLM; name the model in backticks |

Copy this template when adding a new question:

```markdown
#### Qn. Question text here

**Me**

- point 1
- point 2

**LLM** (`gemini`)

- point 1
- point 2
```

Rules of thumb:

- Prefer short bullets over long prose.
- If not answered yet, leave `_todo_`.
- Do not overwrite the other author's block; append a note or a second revision instead.
- Hierarchy: `##` chapter → `###` section (e.g. Review Questions) → `####` question.

---

## Chapter 1 — Introduction

### Review Questions

#### Q1. Name three applications for feedback control systems.

**Me**

1. Blood sugar control
2. Room temperature control by air conditioner
3. Water level control by a valve and floating ball in a toilet

**LLM** (`gemini`)

1. **Automotive cruise control** — measures vehicle speed, compares it to the set speed, adjusts throttle for hills and wind.
2. **Building climate control (thermostat)** — senses room temperature, compares to the setpoint, switches heating/cooling to reduce error.
3. **Hard-disk head positioning** — senses head location relative to the track, drives the voice-coil motor to stay aligned.

#### Q2. Name three reasons for using feedback control systems and at least one reason for not using them.

**Me**

Reasons for using:

- Improve stability — without feedback, disturbances go unnoticed
- Control precision — without feedback, malfunctions go unnoticed
- `_todo_` (third reason)

Reasons for not using:

- When the job is pure amplification, and simplicity matters more than correction

**LLM** (`gemini`)

Reasons for using:

1. **Transient response improvement** — shape rise time, overshoot, and settling
2. **Disturbance rejection** — correct external inputs (wind, load changes)
3. **Sensitivity reduction** — reduce the effect of parameter drift and modeling error
4. **Noise / distortion reduction** — attenuate internal nonlinearities and noise

Reasons for not using:

1. **Cost and complexity** — sensors, wiring, and processing
2. **Risk of instability** — high gain or delay can make a stable open-loop plant oscillate
3. **Reduced open-loop gain** — feedback lowers overall gain; extra amplification may be needed

#### Q3. Give three examples of open-loop systems.

**Me**

1. Speed control by throttle on a traditional non-smart car (fixed pedal → speed drifts with hills/wind)
2. `_todo_`
3. `_todo_`

Note — the same car can be closed-loop if the driver is inside the system boundary (eyes + brain + foot as feedback).

**LLM** (`gemini`)

1. **Toaster** — fixed timer; no sensing of toast color
2. **Microwave oven** — fixed time/power; no food-temperature feedback
3. **Timer-based washing machine** — fixed wash/rinse/spin sequence; no cleanliness sensor

#### Q4. Functionally, how do closed-loop systems differ from open-loop systems?

**Me**

Closed-loop systems use feedback: they measure output, form an error, and adjust the control action from that error.

**LLM** (`gemini`)

A closed-loop system measures its output, compares it with the desired input to form an error, and continuously adjusts control to reduce that error and reject disturbances.

An open-loop system acts from the input alone, with no output measurement, so it cannot self-correct for disturbances or parameter changes.

#### Q5. State one condition under which the error signal of a feedback control system would not be the difference between the input and the output.

**Me**

_todo_

**LLM**

_todo_

#### Q6. If the error signal is not the difference between input and output, by what general name can we describe the error signal?

**Me**

_todo_

**LLM**

_todo_

#### Q7. Name two advantages of having a computer in the loop.

**Me**

_todo_

**LLM**

_todo_

#### Q8. Name the three major design criteria for control systems.

**Me**

_todo_

**LLM**

_todo_

#### Q9. Name the two parts of a system’s response.

**Me**

_todo_

**LLM**

_todo_

#### Q10. Physically, what happens to a system that is unstable?

**Me**

_todo_

**LLM**

_todo_

#### Q11. Instability is attributable to what part of the total response?

**Me**

_todo_

**LLM**

_todo_

#### Q12. Describe a typical control system analysis task.

**Me**

_todo_

**LLM**

_todo_

#### Q13. Describe a typical control system design task.

**Me**

_todo_

**LLM**

_todo_

#### Q14. Adjustments of the forward path gain can cause changes in the transient response. True or false?

**Me**

_todo_

**LLM**

_todo_

#### Q15. Name three approaches to the mathematical modeling of control systems.

**Me**

_todo_

**LLM**

_todo_

#### Q16. Briefly describe each of your answers to Question 15.

**Me**

_todo_

**LLM**

_todo_

---

## Chapter 2 — Modeling in the Frequency Domain

_Coming next. Add review questions with the same `#### Qn` / **Me** / **LLM** pattern._
