---
title: 'Optimization Problems'
date: 2024-03-17
permalink: /posts/2024/03/optimization_problems
categories: math
---

Problem summary of *High-Dimensional Data Analysis with Low-Dimensional Models - John Wright, Yi Ma*

# Problems



# L0: subset selection

$$ \arg \min_{x} \Vert Ax - y \Vert _2^2 \\ $$

$$ \text{s.t. } \  \Vert x \Vert _0 \le k $$

from P.17

see [subset_selection](https://xoofee.github.io/posts/2024/03/subset_selection)

# L1: lasso regression

$$ \arg \min_{x} \Vert Ax - y \Vert _2^2 \\ $$

$$ \text{s.t. } \  \Vert x \Vert _1 \le k $$

Our simulation studies suggest that the lasso enjoys some of the favourable properties of both subset selection and ridge regression. It produces interpretable models like subset selection and exhibits the stability of ridge regression. (from 1996 R. Tibshirani. Regression shrinkage and selection via the LASSO)

## basis pursuit form

 (1998 S. Chen  Atomic decomposition for basis pursuit)

$$ \min_{x} \Vert x \Vert _1 \\ $$

$$ \text{s.t. } y = Ax $$


## unconstrained
$$ \arg \min_{x} \Vert Ax - y \Vert _2^2 + \lambda \Vert x \Vert _1\\ $$

from P.18 of High Dim. via convex duality, these problems are **equivalent**.

# L2: ridge regression

other name: Tikhonov regularization

$$ \arg \min_{x} \Vert Ax - y \Vert _2^2 + \lambda \Vert x \Vert _2^2\\ $$

from P.30

the OLS estimates often have low bias but large variance; prediction accuracy can sometimes be improved by shrinking or setting to O some coefficients

**solution**

given that the matrix \\(AA + \lambda I\\) is invertible, the optimal solution is

$$ x_* = (A^*A+\lambda I)^{-1}A^*y$$

# error correction
