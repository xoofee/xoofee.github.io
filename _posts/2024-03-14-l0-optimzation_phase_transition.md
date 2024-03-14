---
title: 'L0 optimization phase transition'
date: 2024-03-14
permalink: /posts/2024/03/l0-optimzation_phase_transition/
tags:
  - math
---

Input: a matrix \( A \in \mathbb{R}^{m \times n} \) and a vector \( y \in \mathbb{R}^m \).  
Compute \( \Gamma \leftarrow I - A^{\text{T}}(AA^{\text{T}})^{-1}A \), and \( \tilde{x} \leftarrow A^{\text{T}}(AA^{\text{T}})^{-1}y \).  
\( x_0 \leftarrow 0 \).  
\( t \leftarrow 0 \).  
repeat many times  
\( t \leftarrow t + 1 \)  
\( x_t \leftarrow \tilde{x} + \Gamma \left( x_{t-1} - \frac{1}{t} \text{sign}(x_{t-1}) \right) \);  
end while  

$$\alpha$$

$\alpha$

ok \\(\alpha\\)

$$
\displaylines{
Input: a matrix A \in \mathbb{R}^{m \times n} and a vector y \in \mathbb{R}^m.   
Compute \Gamma \leftarrow I - A^*(A A^*)^{-1} A, and \tilde{x} \leftarrow A^{\dagger} y = A^*(A A^*)^{-1} y.  
x_0 \leftarrow 0.  
t \leftarrow 0.  
repeat many times  
t \leftarrow t + 1  
x_t \leftarrow \tilde{x} + \Gamma \left( x_{t-1} - \frac{1}{t} \operatorname{sign} \left( x_{t-1} \right) \right) ;  
end while
}
$$

```python
from IPython.core.getipython import get_ipython      # for %matplotlib
get_ipython().run_line_magic('matplotlib', 'widget') # install pip install ipympl 

import numpy as np
import matplotlib.pyplot as plt

m = 100
n = 200

A = np.random.randn(m, n)    # todo: also try for a gaussian matrix
# A = np.random.random([m, n])    # todo: also try for a gaussian matrix
B = A.T @ np.linalg.inv(A @ A.T)

# make x sparse
success_rates = []
for sparsity in range(20, 50):
    print('sparsity:', sparsity)
    tries = 10
    success = 0.0
    for _ in range(tries):
        x0 = np.random.randn(n)
        zero_i = np.random.choice(n, n - sparsity, replace=False)
        x0[zero_i] = 0.0

        y = A@x0

        # initialize
        x = np.random.random(n)

        for i in range(1, 20000):
            # print(i)
            dx = np.sign(x)
            lr = 1/i
            x = x - lr*dx
            x = x - B @ (A@x - y)

        err = np.linalg.norm(x-x0, 1)
        if err < 0.01:
            success += 1
        print('\r  err: ', err, end='')
    success = success / tries
    print('\n    success rate:', success)
    success_rates.append(success)

plt.figure(); plt.plot(success_rates);
```

![Alt text](/images/blogs/2024/03/l0-optimzation_phase_transition/transition.png)

Headings are cool
======

You can have many headings
======

Aren't headings cool?
------