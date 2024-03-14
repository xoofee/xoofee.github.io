README.extra.md

# bundle install stuck
gem sources --add https://gems.ruby-china.com/ --remove https://rubygems.org/
gem sources -l https://gems.ruby-china.com


# convert latex to MathJax (used by Jekyll)

```
Input: a matrix A \in \mathbb{R}^{m \times n} and a vector y \in \mathbb{R}^m.   
Compute \Gamma \leftarrow I - A^*(A A^*)^{-1} A, and \tilde{x} \leftarrow A^{\dagger} y = A^*(A A^*)^{-1} y.  
x_0 \leftarrow 0.  
t \leftarrow 0.  
repeat many times  
t \leftarrow t + 1  
x_t \leftarrow \tilde{x} + \Gamma \left( x_{t-1} - \frac{1}{t} \operatorname{sign} \left( x_{t-1} \right) \right) ;  
end while 
采用MathJax语法重写此段，输出源码。注意每一行需要能正确的显示，而不是全部显示在一行中

```

# temporarily disable 4 types of pages

how to restore:
- _config.yml:235-269
- _pages/sitemap.md: 12-15, 24-37

# files for download

files in "files" will be list in the sitemap.xml

