---
title: 'Subset Selection'
date: 2024-03-13
permalink: /posts/2024/03/subset_selection
categories: math
---

Python implementation of Algorithm **L0-Minimization by Exhaustive Search** from *High-Dimensional Data Analysis with Low-Dimensional Models - John Wright, Yi Ma*, Page 48


# Problem

$$A$$ is a matrix with size $$m \times n$$, we want to recovery original sparse signal x from observation y.

<div>  
\begin{eqnarray}  
\arg \min_{x} ||y-Ax||_2^2 \\  
\text{s.t. } ||x||_0 \leqslant k
\end{eqnarray}  
</div>  


```python
"""
Subset selection provides interpretable models but can be extremely variable because it is a discrete process-regressors are either retained or dropped from the model. Small changes in the data can result in very different models being selected and this can reduce its prediction accuracy.

1996 Tibshirani - Regression Shrinkage and Selection via the Lasso
"""

# %%
import numpy as np
from itertools import combinations

m = 5
n = 12
sparsity = 4

A = np.random.random([m, n])
x = np.random.random(n)
# make x sparse
zero_i = np.random.choice(n, n - sparsity, replace=False)
x[zero_i] = 0.0

y = A.dot(x)
# y = y + np.random.random(y.shape) * 0.001   # unable to recovery with noise

## %% let recover y
I = np.eye(m)
success = False
# for k in range(1, n+1):
for k in range(1, m):
    # print('k:', k)
    # https://www.geeksforgeeks.org/python-program-to-get-all-subsets-of-given-size-of-a-set/
    for s in combinations(range(0, n), k):
        # print('  subset', s)
        B = A[:, s]
        # D = I - B @ np.linalg.inv(B.T @ B) @ B.T
        # error_vector = D @ y
        x0 = np.linalg.inv(B.T @ B) @ B.T @ y
        xr = np.zeros_like(x)   # recovery of x
        xr[list(s)] = x0
        # error_vector =  A@xr - y    # equal to B @ x0 - y
        error_vector = x - xr
        e = np.linalg.norm(error_vector)
        print(e)
        if e < 1e-6:
            print('success recovery of x:\n', xr.reshape([xr.size, 1]))
            print('sparsity: ', k, ' error:', e)
 
            # print('original x:\n', x.reshape([x.size, 1]))
            success = True
            break
    
    if success:
        break

print('success:', success)



```