---
title: Your Article Title
slug: your-article-slug
category: Tutorial
topics: quantum, circuits, beginners
author: Faizan
affiliation: Qcuit
featured_image: https://images.unsplash.com/photo-xxx
---

# Introduction

Your opening paragraph here. This will be auto-extracted as the abstract if you don't specify one.

## Main Content

Write your article in standard Markdown.

### Code Examples

```python
from qcuit import Qubit, Circuit, Apply, Hadamard

q = Qubit("demo")
circ = Circuit(q)
circ.add(Apply(Hadamard, target=q))
```

### Math & Equations

Use inline LaTeX: $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$

> Blockquotes for emphasis or important notes.

## Conclusion

Wrap up your article here.
