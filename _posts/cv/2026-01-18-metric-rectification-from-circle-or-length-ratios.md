---
title: "Metric Rectification: Two Constraints from a Circle or Length Ratios"
date: 2026-01-18
permalink: /posts/2026/01/metric-rectification-from-circle-or-length-ratios/
categories: math
tags: [computer-vision, projective-geometry, rectification, homography]
excerpt: "Why a circle becomes an ellipse after affine distortion, and how that ellipse (or two known length ratios) provides the two constraints needed for metric rectification."
---

After **projective** rectification of a plane (removing perspective), we often do **affine** rectification next (recovering parallelism / the vanishing line). But an affinely-rectified plane is still not “Euclidean”: **angles and true length ratios are still wrong** because there is a remaining unknown \\(2\times 2\\) linear distortion.

**Metric rectification** is the final upgrade: recover a transform that makes the plane Euclidean again (up to an overall similarity: rotation + translation + uniform scale).

This post summarizes a clean geometric fact:

- A **single imaged circle** (which appears as an ellipse after affine distortion), or
- **two known length-ratio constraints**

each provide exactly the **two independent constraints** you need to perform metric rectification.

---

## 1. What is still unknown after affine rectification?

After affine rectification, the plane coordinates are correct up to an unknown \\(2\times 2\\) linear map \\(A\\) (shear + non-uniform scale). In these coordinates, squared lengths are measured by an unknown **metric tensor**

$$
G \;=\; A^{-T}A^{-1}
$$

Equivalently, metric rectification is finding a \\(2\times 2\\) matrix \\(T\\) such that

$$
G = T^T T
$$

where the rectified coordinates are \\(x_m = T x_a\\) (subscripts: \\(a\\)=affine, \\(m\\)=metric).

Because \\(G\\) is symmetric \\(2\times2\\), it has 3 parameters, but overall scale does not matter for metric rectification. So it has **2 degrees of freedom** → you need **two independent constraints**.

---

## 2. Circular points and why they matter

In the Euclidean plane, the two **circular points at infinity** are

$$
I=(1,i,0)^T,\qquad J=(1,-i,0)^T
$$

They lie on the **line at infinity** \\(l_\infty\\) (in homogeneous coordinates \\(X=(x,y,w)^T\\), that line is \\(w=0\\)).

Two key facts:

- **Every Euclidean circle passes through \\(I\\) and \\(J\\)** (in the projective extension).
- \\(I,J\\) encode metric structure (angles / orthogonality) that gets destroyed by affine distortion.

An affine transform maps points at infinity to points at infinity, so \\(I,J\\) become some \\(I',J'\\) still on \\(l_\infty\\) — but no longer the canonical circular points. That loss is exactly why **circles become ellipses** and **angles are not preserved**.

---

## 3. “Ellipse \\(\cap l_\infty\\)” (why the book can say this)

A conic is defined projectively by

$$
X^T C X = 0
$$

Intersecting the conic with \\(l_\infty\\) just means solving

$$
X^T C X=0,\qquad w=0.
$$

Those intersection points can be **complex**, so they are not visible as pixels — but they are still well-defined projectively.

### Example: a standard ellipse meets \\(l_\infty\\) in complex points

Start from

$$
\frac{x^2}{a^2}+\frac{y^2}{b^2}=1.
$$

Homogeneous form:

$$
b^2 x^2 + a^2 y^2 - a^2 b^2 w^2 = 0.
$$

On \\(l_\infty\\) we set \\(w=0\\), giving

$$
b^2 x^2 + a^2 y^2 = 0
\;\Rightarrow\;
\left(\frac{x}{y}\right)^2 = -\frac{a^2}{b^2}
\;\Rightarrow\;
\frac{x}{y}=\pm i\frac{a}{b}.
$$

So the ellipse intersects \\(l_\infty\\) in two complex points. For a *circle*, those two points are exactly \\(I\\) and \\(J\\); for an *affinely distorted circle* (an ellipse), the two points are the transformed \\(I',J'\\).

If you have already **affinely rectified the plane**, then \\(l_\infty\\) is known, so the ellipse (image of a real circle) provides the remaining two constraints needed for metric rectification.

---

## 4. Practical circle method (don’t compute complex points)

In practice you usually do **not** compute complex intersections explicitly. Instead:

1. In the **affinely rectified** image, fit the ellipse that comes from a known circle on the plane.
2. Extract the ellipse’s \\(2\times2\\) quadratic form \\(Q\\) (the part that controls shape).
3. Factor \\(Q\\) to get \\(T\\), then build a homography.

### Ellipse quadratic form

Write the ellipse as

$$
(x-c)^T\,Q\,(x-c)=1,
$$

where \\(x=[u,v]^T\\), \\(c=[c_x,c_y]^T\\), and \\(Q\\) is symmetric positive definite.

From ellipse axes \\(a,b\\) and rotation \\(\theta\\), one convenient parameterization is

$$
Q = R^T
\begin{bmatrix}
1/a^2 & 0\\
0 & 1/b^2
\end{bmatrix}
R,
\qquad
R=
\begin{bmatrix}
\cos\theta & -\sin\theta\\
\sin\theta & \cos\theta
\end{bmatrix}.
$$

### Metric rectification from \\(Q\\)

For a true circle, in metric coordinates the quadratic form is proportional to the identity. Under affine distortion, that becomes an ellipse, and its \\(Q\\) equals the unknown metric tensor (up to scale):

$$
Q \propto G = T^T T.
$$

So you can obtain \\(T\\) by a symmetric factorization, e.g. Cholesky:

$$
T = \mathrm{chol}(Q).
$$

Then the plane-upgrade homography is

$$
H =
\begin{bmatrix}
T & 0\\
0 & 1
\end{bmatrix},
$$

and you warp the affinely rectified image by \\(H\\) (or \\(H^{-1}\\), depending on your warp convention).

---

## 5. Two known length ratios (linear constraints in \\(G\\))

If you don’t have a circle, you can use **known ratios of lengths on the plane**.

Suppose in the real world you know

$$
\frac{\|P_1P_2\|}{\|P_3P_4\|}=r.
$$

In the affinely rectified image, form displacement vectors

$$
v = x_2-x_1,\qquad u = x_4-x_3.
$$

In the unknown metric, squared lengths are proportional to

$$
\|P_1P_2\|^2 \propto v^T G v,\qquad \|P_3P_4\|^2 \propto u^T G u.
$$

So the ratio constraint becomes

$$
v^T G v \;-\; r^2\, u^T G u \;=\; 0,
$$

which is **linear** in the entries of

$$
G=
\begin{bmatrix}
g_{11}&g_{12}\\
g_{12}&g_{22}
\end{bmatrix}.
$$

Two independent ratios give two independent linear equations. Solve for \\((g_{11},g_{12},g_{22})\\) up to scale (nullspace/SVD), then factor \\(G=T^T T\\) and build the same homography \\(H\\).

---

## 6. Takeaway

- After affine rectification, the remaining unknown metric has **2 DOF**, so you need **two constraints**.
- A **single circle** on the plane (ellipse after affine distortion) provides exactly those two constraints (geometrically via the imaged circular points on \\(l_\infty\\), computationally via the ellipse quadratic form \\(Q\\)).
- Alternatively, **two known length ratios** give two linear constraints in the symmetric metric tensor \\(G\\), solved the same way and factored to obtain the metric-rectifying homography.


<!--
to understand

the two constraints required for metric rectification may be obtained from
an imaged circle or two known length ratios. In the case of a circle, the image conic
is an ellipse in the affinely rectified image, and the intersection of this ellipse with the
(known) l∞ directly determines the imaged circular points.

read all these texts, and summary it and write an essay in 2026.1.18

when writing equation, using the jekly style, may refer to other posts in math


some q/a:

---

## 1. What are the circular points ( I, J )?

In the **Euclidean plane**, the two *circular points at infinity* are

[
I = (1,; i,; 0)^T, \qquad
J = (1,; -i,; 0)^T
]

Key facts:

* They lie on the **line at infinity** (l_\infty: z=0)
* They are **fixed by all Euclidean similarities** (rotation, translation, uniform scale)
* They encode **metric information** (angles, orthogonality)
* Any **circle** passes through both (I) and (J)

---

## 2. The affine / camera transform form

You wrote the transform as

[
H =
\begin{bmatrix}
K s R & t \
0 & 1
\end{bmatrix}
]

For **points at infinity**, the translation (t) does **nothing**.

So we only care about the **top-left 2×2 block**:

[
A = KsR
]

This is a **general affine transform**:

* (R): rotation
* (s): scale
* (K): shear / non-uniform scaling

---

## 3. How an affine transform acts on circular points

Apply (H) to (I):

[
I' = H I
= \begin{bmatrix}
A & t \
0 & 1
\end{bmatrix}
\begin{bmatrix}
1 \ i \ 0
\end{bmatrix}
=============

\begin{bmatrix}
A \begin{pmatrix}1 \ i\end{pmatrix} \
0
\end{bmatrix}
]

Similarly for (J):

[
J' =
\begin{bmatrix}
A \begin{pmatrix}1 \ -i\end{pmatrix} \
0
\end{bmatrix}
]

### Important consequences

* (I') and (J') **remain at infinity**
* But they are **no longer circular points**
* They now encode the **affine distortion of angles**

---

## 4. What stays invariant and what breaks

### Preserved

| Property           | Status |
| ------------------ | ------ |
| Straight lines     | ✅      |
| Parallelism        | ✅      |
| Points at infinity | ✅      |

### Destroyed

| Property      | Status              |
| ------------- | ------------------- |
| Angles        | ❌                   |
| Orthogonality | ❌                   |
| Circles       | ❌ (become ellipses) |

This is why after an affine transform:

> **Circles become ellipses**

---

## 5. Why circles turn into ellipses (key intuition)

A circle is defined by:

* Passing through (I) and (J)

After affine distortion:

* (I) and (J) move to **new infinite points**
* The image conic now passes through **two different infinite points**
* That conic is an **ellipse**

This is exactly why:

> *In an affinely rectified image, a circle appears as an ellipse.*

---

## 6. Connection to metric rectification

The goal of **metric rectification** is:

> Recover the original circular points (I, J)

How?

* From **two orthogonal directions**
* Or from **an imaged circle**
* Or from **known length ratios**

Once you find (I') and (J'), you can build the **dual absolute conic** (C_\infty^*) and undo the affine distortion.

---

## 7. One-sentence summary

> An affine transform (KsR) maps the circular points ((1,\pm i,0)) to new points at infinity, destroying their special “circular” role — this loss of circular points is exactly why affine images lose angle and circle information.

---



### An ellipse “passes through” circular points because we’re in *projective* geometry
In projective geometry we don’t work only with visible pixels \((x,y)\). We work with **homogeneous points** \(X=(x,y,w)^T\), and the ordinary image is just the subset \(w\neq 0\) (usually you set \(w=1\)).

The **line at infinity** is simply
\[
l_\infty:\; w=0
\]
It’s not a set of pixels, so you can’t “see” it in the image. But it still exists as a well-defined line **in the projective extension** of the plane.

A conic (ellipse) is also defined projectively by a homogeneous quadratic:
\[
X^T C X = 0
\]
So asking “where does the ellipse meet \(l_\infty\)?” just means: solve the system
\[
X^T C X=0,\quad w=0.
\]
Those intersection points can be **complex** (not real), so they won’t correspond to visible pixels either.

---

### Concrete example: a normal ellipse intersects \(l_\infty\) in complex points
Take the ellipse
\[
\frac{x^2}{a^2}+\frac{y^2}{b^2}=1.
\]
Homogeneous form:
\[
b^2 x^2 + a^2 y^2 - a^2 b^2 w^2 = 0.
\]
Intersect with \(l_\infty\) (set \(w=0\)):
\[
b^2 x^2 + a^2 y^2 = 0
\;\Rightarrow\;
\left(\frac{x}{y}\right)^2 = -\frac{a^2}{b^2}
\;\Rightarrow\;
\frac{x}{y}=\pm i\frac{a}{b}.
\]
So there are **two intersection points**, but they’re **complex**. That’s why you never “see” the ellipse crossing \(l_\infty\) in the image.

---

### Why this gives metric information (and why affine rectification matters)
A true **circle** in the Euclidean plane has the special property that (projectively) it passes through the two **circular points**:
\[
I=(1,i,0)^T,\quad J=(1,-i,0)^T,
\]
and these lie on \(l_\infty\) because \(w=0\).

After **affine rectification**, you have put the plane into an “affine coordinate system”, meaning \(l_\infty\) is now *known* (it becomes \(w=0\) in that coordinate system). A real circle on the plane becomes an **ellipse** under an affine transform, but it still “contains” the **images of \(I,J\)**, and those must lie on the (known) \(l_\infty\).

So “ellipse \(\cap l_\infty\)” is just a compact way of saying:
- fit the ellipse (get its conic \(C\)),
- restrict it to \(w=0\),
- the resulting quadratic gives you the two (complex) circular points → exactly the **2 constraints** needed for metric rectification.

---

### Important practical note
Even though the book talks about “intersection points”, in code you usually **don’t compute complex points explicitly**. You instead use the ellipse’s \(2\times 2\) quadratic form (the part you get after setting \(w=0\)) and factor it—this is the same “factor a symmetric \(2\times2\) matrix to get the metric upgrade” pattern your `07_recovery_from_affine_by_conic...py` uses, just with the matrix coming from an ellipse rather than perpendicular lines.


### Circle method in practice (after affine rectification)
Assume you already have an **affinely rectified** image \(I_a\) of a **plane** (so \(l_\infty\) is known; in affine coordinates it is simply \(w=0\)).

If there is a **real circle on that plane** (coin, manhole cover, plate rim, printed circle), then in \(I_a\) that circle appears as an **ellipse**. From that ellipse you can recover the remaining “metric” part.

There are two equivalent views:

- **Geometric (book sentence)**: “ellipse \(\cap l_\infty\)” gives the **imaged circular points** (two complex points), which determine the metric upgrade.
- **Computationally simpler**: fitting the ellipse gives you a \(2\times2\) quadratic form \(Q\); factoring \(Q\) gives the metric rectifying transform.

You almost never explicitly compute the complex intersection points in code; you use \(Q\).

---

### Step 1: find an ellipse in the affinely rectified image
You don’t “find any ellipse”; you find the image of a **known circle** on the plane.

Common ways:

- **Manual (most robust)**: click 5–20 points on the ellipse boundary.
- **Automatic-ish (OpenCV)**:
  - Convert to grayscale → blur → Canny edges.
  - `findContours`.
  - For each contour with enough points, run `cv2.fitEllipse(contour)`.
  - Pick the best candidate by location/size (you usually know roughly where the circle is), or by fit quality.

`cv2.fitEllipse` returns center \((c_x,c_y)\), axes \((2a,2b)\), and rotation angle \(\theta\).

---

### Step 2: convert the fitted ellipse to a conic / quadratic form
Write the ellipse as:
\[
(x-c)^T\,Q\,(x-c)=1
\]
where \(x=[u,v]^T\), \(c=[c_x,c_y]^T\), and
\[
Q = R^T \begin{bmatrix}1/a^2 & 0\\0 & 1/b^2\end{bmatrix} R,\quad
R=\begin{bmatrix}\cos\theta & -\sin\theta\\ \sin\theta & \cos\theta\end{bmatrix}
\]

This \(Q\) (symmetric positive definite) is the key object.

---

### Step 3: get the metric rectification from \(Q\)
For an affinely distorted circle, the ellipse’s \(Q\) satisfies (up to scale):
\[
Q = M^T M
\]
for the **metric-upgrade** matrix \(M\) (a \(2\times2\) matrix). So compute \(M\) by Cholesky (or any symmetric factorization):

- \(M = \mathrm{chol}(Q)\) (choose convention; Cholesky gives triangular)

Then build the homography:
\[
H = \begin{bmatrix} M & 0 \\ 0 & 1 \end{bmatrix}
\]
Warp the image by that \(H\) (or \(H^{-1}\), depending on your warp convention).

This is exactly analogous to what your perpendicular-lines method is doing: solve for a \(2\times2\) symmetric matrix (`KKT`), factor it, then build \(H\). Your code already has the “factor + build \(H\)” shape:

```188:258:d:\work\vslam\codes\hartley-learning\ch2\2.7_recovery_affine\07_recovery_from_affine_by_conic_from_2_pairs_of_perpendicular_lines.py
def decompose_KKT_to_K(KKT):
    """
    Decompose KKT = K * K^T where K is a 2x2 upper triangular matrix.
    ...
    """
    try:
        L = np.linalg.cholesky(KKT)
        K = L.T  # Transpose to get upper triangular
        return K
    ...
def construct_homography_from_K(K):
    H = np.eye(3)
    H[:2, :2] = K
    return H
```

With the circle method, you don’t solve `KKT` from perpendicular lines; you **set `KKT := Q` from the ellipse fit**.

---

### Why the book says “ellipse ∩ \(l_\infty\) gives circular points”
Because a circle is characterized projectively by passing through the two **circular points** (which lie on \(l_\infty\)). After affine rectification you know \(l_\infty\), so intersecting the ellipse (conic) with that line gives those two (complex) points. Those points encode exactly the same \(Q\) information above (that’s the “two constraints”).




### Setup (what’s still unknown after affine rectification)
After affine rectification, remaining distortion is a **2×2 linear map** \(A\) (shear + non-uniform scale). Metric rectification means finding a **2×2 map** \(T \approx A^{-1}\) such that, in new coords, Euclidean lengths/angles are correct (up to an overall similarity).

Define the unknown **metric tensor** in the affinely-rectified coordinates:
\[
G \;=\; T^T T \;=\; A^{-T}A^{-1}
\]
\(G\) is symmetric \(2\times2\): 3 unknowns, but overall scale is irrelevant ⇒ **2 DOF**, so **two constraints** suffice.

---

### One length-ratio constraint (linear in \(G\))
Pick two segments on the plane with **known real-world ratio**
\[
\frac{\|P_1P_2\|}{\|P_3P_4\|}=r.
\]
In your **affinely rectified image**, measure the displacement vectors:
\[
v = x_2-x_1,\quad u=x_4-x_3 \quad (2\text{D vectors}).
\]

In the corrected metric, squared lengths are:
\[
\|P_1P_2\|^2 \propto v^T G v,\quad \|P_3P_4\|^2 \propto u^T G u.
\]

So the ratio constraint becomes:
\[
v^T G v \;-\; r^2\, u^T G u \;=\; 0
\]
This is **linear in the entries of \(G\)**.

Write
\[
G=\begin{bmatrix}g_{11}&g_{12}\\g_{12}&g_{22}\end{bmatrix}.
\]
Then \(v^T G v = g_{11}v_x^2 + 2g_{12}v_xv_y + g_{22}v_y^2\). So one ratio gives one linear equation in \((g_{11},g_{12},g_{22})\).

---

### Two ratios ⇒ solve \(G\) (up to scale)
Do the above for two independent ratios \((r_1, r_2)\). You’ll get a 2×3 linear system:
\[
A\,[g_{11}, g_{12}, g_{22}]^T = 0
\]
Solve by SVD (nullspace), exactly like your perpendicular-lines code solves for `[c11,c12,c22]` via SVD.

**Important**: the two constraints must be independent (don’t use two ratios that effectively involve the same direction geometry, or you get a near-degenerate system).

---

### Recover the metric-rectifying transform \(T\) from \(G\)
Once you have \(G\) (scale arbitrary), choose a convenient normalization (e.g. scale \(G\) so \(\det(G)=1\) or \(g_{22}=1\)) and factor:
\[
G = T^T T
\]
Use Cholesky on \(G\) (or eigen/SVD factorization) to get \(T\). Then apply the homography:
\[
H = \begin{bmatrix}T & 0\\0 & 1\end{bmatrix}
\]
to warp the affinely-rectified image into a metric-rectified one (up to similarity).

---

### How this relates to your existing code
Your `07_recovery_from_affine_by_conic_from_2_pairs_of_perpendicular_lines.py` solves a **2×2 symmetric matrix** from two constraints using SVD, then factors it with Cholesky to build the final warp. The “two length ratios” method is the same pipeline—just the constraint rows come from **segment vectors** instead of **line coefficients**.

-->

