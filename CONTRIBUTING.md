# Contributing to ShareSparks

[English](./CONTRIBUTING.md) | [简体中文](./CONTRIBUTING.zh-CN.md)

Thanks for wanting to share something here! This guide walks you through
publishing an article, adding yourself as a member, previewing your changes
locally, and opening a pull request.

You don't need to be a developer — if you can write Markdown and follow the
steps below, you can contribute.

## 1. Fork & clone

1. Click **Fork** at the top-right of the
   [repo page](https://github.com/ShareSparks/ShareSparks) to copy it to your
   own GitHub account.
2. Clone your fork to your computer:

   ```bash
   git clone https://github.com/<your-username>/ShareSparks.git
   cd ShareSparks
   ```

3. Create a branch for your change:

   ```bash
   git checkout -b post/my-article
   ```

## 2. Run it locally (optional but recommended)

This project uses [pnpm](https://pnpm.io/). With [Node.js](https://nodejs.org/)
18+ installed:

```bash
pnpm install      # install dependencies (first time only)
pnpm dev          # start a live preview at http://localhost:4321
```

Leave `pnpm dev` running and edit files — the browser reloads automatically.

## 3. Write an article

Create a Markdown file under `src/content/post/`, e.g.
`src/content/post/my-first-article.md`. The file name (lower-cased) becomes the
URL: `/posts/my-first-article/`.

Start the file with a **frontmatter** block (the part between the `---` lines),
then write your article in Markdown below it:

```markdown
---
title: "My article title"
description: "A one-sentence summary, 10–160 characters. Shown in previews."
publishDate: 2026-06-03
author: liu          # optional — your member id (see step 4); omit if none
tags: [Agent, LLM]   # optional
draft: false         # optional — set true to hide it from the live site
---

Your article content starts here. Plain **Markdown**: headings, lists,
`code`, > quotes, images, and links all work.
```

Frontmatter fields:

| Field         | Required | Notes                                                        |
| ------------- | -------- | ------------------------------------------------------------ |
| `title`       | yes      | Up to 120 characters.                                        |
| `description` | yes      | 10–160 characters. Used for previews and SEO.                |
| `publishDate` | yes      | `YYYY-MM-DD`.                                                 |
| `author`      | no       | A member id — the file name under `src/content/member/`.     |
| `tags`        | no       | A list, e.g. `[Agent, LLM]`.                                 |
| `draft`       | no       | `true` hides the post in production. Defaults to `false`.    |
| `updatedDate` | no       | `YYYY-MM-DD`, if you revise it later.                        |

> **Tip:** copy an existing post in `src/content/post/` and edit it — that's the
> easiest way to get the frontmatter right.

## 4. Add yourself as a member (optional)

So your article can be attributed to you, add a profile under
`src/content/member/`, e.g. `src/content/member/jane.md`. The file name is your
**member id** — use it as the `author` value in your post's frontmatter.

```markdown
---
name: JANE DOE
bio: One line about you.
# avatar: /avatars/jane.jpg   # put an image in public/avatars/ and uncomment
order: 3                      # lower number = shown earlier on the members wall
links:
  - label: GitHub
    url: https://github.com/jane
---

A longer introduction in Markdown — who you are and what you write about.
```

## 5. Update the README index

The article list in [`README.md`](./README.md) and
[`README.zh-CN.md`](./README.zh-CN.md) is maintained by hand. Add a line for
your new post under the **Articles / 文章目录** section (newest first):

```markdown
- [My article title](https://sharesparks.dev/posts/my-first-article/) — JANE DOE · 2026-06-03
```

## 6. Open a pull request

```bash
git add .
git commit -m "post: add my first article"
git push origin post/my-article
```

Then open your fork on GitHub and click **Compare & pull request**. Describe
what you added, and we'll review and merge it. Once merged, it goes live at
<https://sharesparks.dev>.

Thanks for sharing! ✨
