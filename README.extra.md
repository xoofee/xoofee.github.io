# see
- https://idratherbewriting.com/jekylldoctheme-separate-outputs/mydoc/home.html

# bundle install stuck
```bash
gem sources --add https://gems.ruby-china.com/ --remove https://rubygems.org/
gem sources -l https://gems.ruby-china.com
```

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

# google analytics

1. create account in analytics.google.com
2. add tracking id in _config.yml

```yaml
# Analytics
analytics:
  provider               :  "google-analytics-4" # false (default), "google", "google-universal", "google-analytics-4", "custom"
  google:
    tracking_id          :  G-VBS36KC0MW

```

3. check any page has following scripts

```html
<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'G-VBS36KC0MW', 'auto');
  ga('send', 'pageview');
</script>
```

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-VBS36KC0MW"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-VBS36KC0MW');
</script>
```

# blog abstract

The abstract is extacted from post by the first empty lines

## good
```

Abstract xxx

Content
```

## bad
```markdown

Abstract xxx
  
Content

```
There are two spaces before Content, jekyll will connect it to abstract