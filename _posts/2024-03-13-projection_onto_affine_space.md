---
title: 'Projection onto an Affine Subspace'
date: 2024-03-13
permalink: /posts/2024/03/projection_onto_affine_space
tags:
  - math
---

# projection problem
  
<p>Let \(A\) be a matrix with size \(m \times n\). We want to project point z onto a plane </p>  
  
<div>  
\begin{eqnarray}  
\arg \min_{x} \lVert z-x \rVert_2 \\  
\text{s.t. } Ax = y  
\end{eqnarray}  
</div>  
  
# Full Row Rank
  
This problem can be handled using the Lagrangian multiplier method
  
<div>  
\begin{eqnarray}  
L(x, \lambda) = \frac{1}{2} \lVert z-x \rVert_2^2 + (Ax-y)^*\lambda  
\end{eqnarray}  
</div>  
  
<p>Note that \(\lambda\) here is a vector with size equal to the rank of \(A\). For full rank, \(\lambda\) has \(m\) components.</p>  
  
<div>  
\begin{eqnarray}  
\frac{\partial L}{\partial x} = x-z + A^*\lambda = 0  
\end{eqnarray}  
</div>  
  
<p>Multiplying by \(A\) from the left:</p>  
  
<div>  
\begin{eqnarray}  
Ax - Az + AA^*\lambda = 0 \\  
AA^*\lambda = Az - y  
\end{eqnarray}  
</div>  
  
<p>If \(A\) is full row rank:</p>  
  
<div>  
\begin{align*}  
\lambda &= (AA^*)^{-1}(Az-y) \\  
x &= z - A^*\lambda \\  
&= z - A^*(AA^*)^{-1}(Az-y)  
\end{align*}  
</div>  
  
# Geometric Interpretation
  
<p>From eqnarray (1), \(z-x = A^*\lambda\), that is to say, the line from \(z\) to the nearest point \(x\) is in the row space (span of rows of \(A\)), which is orthogonal to \(\text{null}(A)\).</p>  
  
<div>  
\begin{eqnarray}  
\forall \hat{x} \in C := \{ x | Ax = y \} \\  
\langle z-x, x - \hat{x} \rangle = 0  
\end{eqnarray}  
</div>  
  
<p>See <a href="https://en.wikipedia.org/wiki/Row_and_column_spaces">Row and Column Spaces</a> on Wikipedia for more details.</p>  
  
Without Full Row Rank (\(r < m\))</h2>  
  
<div>  
\begin{eqnarray}  
A = USV^* \\  
Ax = y \Rightarrow S (V^*x) = U^*y  
\end{eqnarray}  
</div>  
  
<p>Let \(z' = V^*z, x' = V^*x, y' = U^*y\), we then want to project \(z'\) to the affine space \(Sx' = y'\), which can be reduced to:</p>  
  
<div>  
\begin{eqnarray}  
L(x', \lambda) = \frac{1}{2} \lVert z'-x' \rVert_2^2 + (S_rx'[:r] - y'[:r])^*\lambda  
\end{eqnarray}  
</div>  
  
We get the fixed coordinates in the affine space:
  
<div>  
\begin{eqnarray}  
x'[:r] = S_r^{-1} y'[:r]  
\end{eqnarray}  
</div>  
  
<p>The floating coordinates in the affine space from \(z'\):</p>  
  
<div>  
\begin{eqnarray}  
x'[r:] = z'[r:]  
\end{eqnarray}  
</div>  
  
Transforming back to the original space:
  
<div>  
\begin{eqnarray}  
x = V \{ S_r^{-1} y'[:r] \ (V^*z)[r:] \}  
\end{eqnarray}  
</div>