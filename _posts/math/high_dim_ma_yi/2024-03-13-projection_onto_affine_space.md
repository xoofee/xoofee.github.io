---
title: 'Projection onto an Affine Subspace'
date: 2024-03-13
permalink: /posts/2024/03/projection_onto_affine_space
categories: math
---

Let \\(A\\) be a matrix with size \\(m \times n\\). We want to project point z onto a plane
$$
\begin{align}
\arg \min_{x} \lVert z-x \rVert_2 \\
\text{s.t. } Ax = y
\end{align}
$$

# Full Row Rank

This problem can be handled using the Lagrangian multiplier method

$$
L(x, \lambda) = \frac{1}{2} \lVert z-x \rVert_2^2 + (Ax-y)^*\lambda
$$

Note that \\(\lambda\\) here is a vector with size equal to the rank of \\(A\\). For full rank, \\(\lambda\\) has \\(m\\) components.

$$
\frac{\partial L}{\partial x} = x-z + A^*\lambda = 0
$$

Multiplying by \\(A\\) from the left:

$$
\begin{align}
Ax - Az + AA^*\lambda = 0 \\
AA^*\lambda = Az - y
\end{align}
$$

If \\(A\\) is full row rank:

$$
\begin{align}
\lambda &= (AA^*)^{-1}(Az-y) \\
x &= z - A^*\lambda \\
&= z - A^*(AA^*)^{-1}(Az-y)
\end{align}
$$

# Geometric Interpretation

From align (1), \\(z-x = A^*\lambda\\), that is to say, the line from \\(z\\) to the nearest point \\(x\\) is in the row space (span of rows of \\(A\\)), which is orthogonal to \\(\text{null}(A)\\).

$$
\begin{align}
\forall \hat{x} \in C := \{ x | Ax = y \} \\
\langle z-x, x - \hat{x} \rangle = 0
\end{align}
$$

See <a href="https://en.wikipedia.org/wiki/Row_and_column_spaces">Row and Column Spaces</a> on Wikipedia for more details.

Without Full Row Rank (\\(r < m\\))</h2>

$$
\begin{align}
A = USV^* \\
Ax = y \Rightarrow S (V^*x) = U^*y
\end{align}
$$

Let \\(z' = V^*z, x' = V^*x, y' = U^*y\\), we then want to project \\(z'\\) to the affine space \\(Sx' = y'\\), which can be reduced to:

$$
L(x', \lambda) = \frac{1}{2} \lVert z'-x' \rVert_2^2 + (S_rx'[:r] - y'[:r])^*\lambda
$$

We get the fixed coordinates in the affine space:

$$
x'[:r] = S_r^{-1} y'[:r]
$$

The floating coordinates in the affine space from \\(z'\\):

$$
x'[r:] = z'[r:]
$$

Transforming back to the original space:

$$
x = V \{ S_r^{-1} y'[:r] \ (V^*z)[r:] \}
$$