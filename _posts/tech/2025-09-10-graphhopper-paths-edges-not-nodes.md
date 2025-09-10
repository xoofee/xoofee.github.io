---
title: "GraphHopper paths are edges, not nodes"
date: 2025-09-10
permalink: /posts/2025/09/graphhopper-paths-edges-not-nodes
categories: tech
tags: [graphhopper, routing, graphs, algorithms, java, edge-based, navigation]
---

GraphHopper makes a deliberate design choice: paths are represented by edges, not nodes. This matters for correctness (turn restrictions/costs), fidelity (multiple parallel edges between the same nodes), and efficiency (edge properties drive routing).

* TOC
{:toc}

# TL;DR

The `Path` object stores a sequence of edge IDs and only the endpoints as nodes. Nodes are reconstructed from the edge sequence. This preserves which exact streets (edges) were taken and supports edge-based algorithms that handle turn restrictions and costs.

# Evidence in the codebase

## `Path` stores edge IDs (not a node list)

```java
public class Path {
    // ... other fields ...
    private IntArrayList edgeIds = new IntArrayList();  // Path stores edge IDs
    private int fromNode = -1;                          // Start node
    private int endNode = -1;                           // End node
}
```

## Nodes are derived from edges during reconstruction

```java
public IntIndexedContainer calcNodes() {
    final IntArrayList nodes = new IntArrayList(edgeIds.size() + 1);
    int tmpNode = getFromNode();
    nodes.add(tmpNode);
    forEveryEdge(new EdgeVisitor() {
        @Override
        public void next(EdgeIteratorState eb, int index, int prevEdgeId) {
            nodes.add(eb.getAdjNode());  // Nodes are derived from edges
        }
    });
    return nodes;
}
```

## Path extraction follows edges and accumulates edge properties

```java
private void onEdge(int edge, int adjNode, int prevEdge) {
    EdgeIteratorState edgeState = graph.getEdgeIteratorState(edge, adjNode);
    path.addDistance(edgeState.getDistance());
    path.addTime(GHUtility.calcMillisWithTurnMillis(weighting, edgeState, false, prevEdge));
    path.addEdge(edge);  // Edges define the path
}
```

# Why edges instead of nodes?

## 1) Edge-based routing enables turn restrictions and turn costs

Many real-world constraints are turn-based: “no left turn”, “left turn adds 5 seconds”, “no U‑turn across a median”. Representing the path as edges lets the routing algorithm reason about the transition from one edge to the next, which is where these constraints live.

## 2) Multiple edges can connect the same node pair

Between the same two intersections there might be parallel roads, slip lanes, service roads, or different directions of a divided highway. A node sequence like `A → B` loses which specific street was taken. An edge sequence preserves it (e.g., “Main St eastbound” vs “Service Rd”).

## 3) Edge properties determine cost and feasibility

Routing decisions depend on distance, speed, access permissions (car/bike/foot), surface, elevation, one‑way flags, and more. These live on edges. Keeping the edge sequence in the `Path` keeps all the context necessary for accurate distance/time/energy calculations and for post‑processing (instructions, GPX, elevation charts).

## 4) Efficient and unambiguous reconstruction

Given edges, deriving nodes is trivial and unambiguous. The reverse is not: a node sequence might map to multiple possible edge sequences. Storing edges avoids ambiguity and extra lookups.

# Practical implications

- Turn‑aware algorithms: Edge sequences let GraphHopper cleanly support turn restrictions/costs and complex junctions.
- Accurate instructions: Generating “turn left onto Main St” depends on edge names and attributes.
- Post‑hoc analysis: Distances, times, and speed profiles are aggregated edge by edge.
- Interop: Export formats like GPX can be generated from the edge path by sampling geometry stored with edges.

# What about nodes?

Nodes still matter—they anchor the path (start/end and intermediate junctions). But edges carry the semantics. GraphHopper therefore stores the edge sequence as the source of truth and derives the node sequence on demand.

# Takeaway

Representing paths by edges preserves routing context, enables correct handling of turns and restrictions, and makes reconstruction efficient. Nodes are important landmarks, but edges are what actually define the path.

