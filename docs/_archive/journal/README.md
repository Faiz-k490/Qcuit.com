# Qcuit Journal

> Educational quantum computing articles published at [qcuit.com/hub](https://qcuit.com/hub).

## Publishing an Article

### 1. Write a Draft

Create a Markdown file in `journal/drafts/`:

```markdown
# Your Article Title

Your content here. Supports standard Markdown.

## Subheading

> Blockquotes for emphasis

`inline code` and code blocks:

```python
from qcuit import Qubit
q = Qubit("demo")
```
```

### 2. Publish

```bash
cd /path/to/Qcuit.com
PYTHONPATH=studio python3 journal/scripts/publish_article.py \
  --title "Your Article Title" \
  --draft journal/drafts/your-draft.md \
  --category Tutorial \
  --topics "quantum, circuits" \
  --author "Your Name" \
  --affiliation "Your Org"
```

### 3. Verify

- **Local:** Start the backend and visit `http://localhost:3000/hub`
- **Production:** Deploy and check `https://qcuit.com/hub`

## Draft Template

See `journal/drafts/_TEMPLATE.md` for a starting point.

## File Structure

```
journal/
├── drafts/           # Markdown article drafts
│   ├── _TEMPLATE.md  # Template for new articles
│   └── *.md          # Your drafts
├── scripts/
│   └── publish_article.py  # Publishing CLI tool
└── README.md
```

## Article Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Article title |
| `content` | Yes | Markdown body (from draft file) |
| `abstract` | Auto | First paragraph or `--abstract` flag |
| `category` | Yes | Tutorial, Research, Pedagogy, etc. |
| `topics` | Yes | Comma-separated keywords |
| `author` | Yes | Author name |
| `affiliation` | No | Organization/university |
| `featured_image` | No | URL to header image |
