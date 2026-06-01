# ShareSparks

> 兀坐听雪溜竟日，闲谈生慧火一星。

一个用来分享文章的个人站点。基于 [Astro](https://astro.build)（纯静态输出），
准备部署到 [Cloudflare](https://developers.cloudflare.com/)。

## 开发

```bash
pnpm install      # 安装依赖
pnpm dev          # 本地开发，http://localhost:4321
pnpm build        # 构建到 ./dist
pnpm preview      # 预览构建产物
```

## 写文章

在 `src/content/posts/` 下新建 `.md`（或需要嵌入组件时用 `.mdx`），顶部填写
frontmatter：

```markdown
---
title: 标题
description: 一句话简介（可选）
pubDate: 2026-06-01
tags: ['随笔']
draft: false   # true 时不会出现在生产构建
---

正文……
```

保存后会自动出现在首页、`/posts` 列表和 RSS 中。

## 目录结构

```
src/
├── consts.ts            # 站点标题、URL、导航等全局配置
├── content.config.ts    # 文章集合的 schema 定义
├── content/posts/       # 文章（Markdown / MDX）
├── components/          # Header / Footer / 日期等组件
├── layouts/             # 页面与文章布局
├── pages/               # 路由（首页、列表、文章、关于、rss.xml）
└── styles/global.css    # 全局样式
public/                  # 静态资源（favicon 等）
```

## 部署到 Cloudflare

纯静态产物在 `./dist`，已附 `wrangler.jsonc`（Workers 静态资源方式）。

- **Cloudflare 控制台连 GitHub**：框架选 Astro，构建命令 `pnpm build`，
  输出目录 `dist`。推荐，推送即自动部署。
- **命令行**：`pnpm cf:deploy`（= `astro build && wrangler deploy`）。

部署好域名后，记得把 `src/consts.ts` 里的 `SITE.url` 改成正式域名
（影响 sitemap / RSS / canonical 链接）。

> 之后若需要服务端渲染（SSR），安装 `@astrojs/cloudflare` 适配器，
> 并在 `astro.config.mjs` 中改为 `output: 'server'`。
