# Repo Notes for Agents

## Blog post defaults

- This repo is a Jekyll blog.
- New posts should usually go under `_posts/<category>/`.
- Use filename pattern `YYYY-MM-DD-slug.md`.
- Match the front matter used by recent posts in the same category.
- Default front matter for a normal post:

```yaml
---
title: "Post Title"
date: YYYY-MM-DD
permalink: /posts/YYYY/MM/slug/
categories: tech
tags: [tag1, tag2]
---
```

- For technical posts, `categories: tech` is the default unless the user clearly wants another category.
- Include:

```md
* TOC
{:toc}
```

- When writing a new post, prefer the tone and structure of recent posts instead of re-discovering the blog format from scratch.
- If the user asks for a post draft only, do not spend time re-checking the repository structure unless there is a concrete reason to think the format changed.
