# ShareSparks

> 兀坐听雪溜竟日，闲谈生慧火一星。

**English** | [简体中文](./README.zh-CN.md)

A repository for sharing personal insights — where we record ideas, refine
articles, and exchange perspectives.

🌐 **Live site**: <https://sharesparks.dev> — read everything right in your
browser, no need to clone the repo.

Built with [Astro](https://astro.build) on the
[Sienna](https://github.com/AnjayGoel/astro-sienna) theme (serif typography,
light/dark mode, RSS, full-text search, OG images) and deployed on
[Cloudflare](https://developers.cloudflare.com/); every push to `main` updates
the site automatically.

## Development

```bash
pnpm install      # install dependencies
pnpm dev          # local dev server at http://localhost:4321
pnpm build        # type-check + build to ./dist (also runs Pagefind search index)
pnpm preview      # preview the production build
```

## Writing an article

Create a `.md` file (or `.mdx` for embedded components) under
`src/content/post/`. The filename becomes the URL slug.

```markdown
---
title: "Title"
publishDate: 2026-06-01
description: "One-line summary (10–160 characters)."
tags: [note]
draft: false   # true keeps it out of the production build
---

Body…
```

It then appears on the home page, the `/posts` list, the RSS feed, and search.
Code blocks get syntax highlighting + a copy button, and KaTeX math is supported.

## Adding a member

Each person is one file under `src/content/member/`. The filename becomes the
URL (e.g. `liu.md` → `/members/liu`).

```markdown
---
name: Name
bio: One-line intro
avatar: /avatars/name.jpg   # optional; falls back to an initial-letter avatar
order: 1                     # lower number shows first
links:
  - label: GitHub
    url: https://github.com/name
---

Longer introduction in Markdown…
```

Put avatar images in `public/avatars/` (square images work best). Members appear
on `/members` and on the home page; each has a detail page at `/members/<filename>`.

## Project structure

```
src/
├── site.config.ts       # site title, description, nav menu, profile, theme options
├── content.config.ts    # schemas for the post / page / member collections
├── content/post/        # articles (Markdown / MDX)
├── content/member/      # one file per person
├── content/page/        # standalone pages (e.g. about.md)
├── components/          # header, footer, avatar, theme toggle, etc.
├── data/                # collection helpers (post.ts, member.ts)
├── layouts/             # Base & BlogPost layouts
├── pages/               # routes (home, posts, members, about, rss, og-image…)
├── plugins/             # remark/rehype plugins (admonitions, reading time…)
└── styles/global.css    # design tokens (colors, fonts) + base styles
public/                  # static assets (icon, avatars, _headers…)
```

## Deploying to Cloudflare

The static build lands in `./dist`; `wrangler.jsonc` is included (Workers
static-assets mode).

- **Cloudflare dashboard + GitHub**: framework preset Astro, build command
  `pnpm build`, output directory `dist`. Recommended — deploys on every push.
  (`.npmrc` enables the `postbuild` Pagefind step.)
- **CLI**: `pnpm build && wrangler deploy`.

If the domain changes, update `site` in `astro.config.ts` (it drives the
sitemap, RSS, OG images, and canonical links).

> Theme credit: [Astro Sienna](https://github.com/AnjayGoel/astro-sienna) by Anjay Goel (MIT).
