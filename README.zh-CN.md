# ShareSparks

> 兀坐听雪溜竟日，闲谈生慧火一星。

[English](./README.md) | **简体中文**

这是一个分享个人见解的仓库 —— 我们在这里记录想法、沉淀文章、交流观点。

🌐 **在线网站**：<https://sharesparks.dev> —— 无需克隆仓库，直接在浏览器里阅读所有内容。

基于 [Astro](https://astro.build) 的 [Sienna](https://github.com/AnjayGoel/astro-sienna)
主题（衬线排版、亮/暗双主题、RSS、全文搜索、自动 OG 图），部署在
[Cloudflare](https://developers.cloudflare.com/) 上，推送到 `main` 即自动更新。

## 开发

```bash
pnpm install      # 安装依赖
pnpm dev          # 本地开发，http://localhost:4321
pnpm build        # 类型检查 + 构建到 ./dist（同时生成 Pagefind 搜索索引）
pnpm preview      # 预览构建产物
```

## 写文章

在 `src/content/post/` 下新建 `.md`（或需要嵌入组件时用 `.mdx`），文件名即网址。

```markdown
---
title: "标题"
publishDate: 2026-06-01
description: "一句话简介（10–160 字符）。"
tags: [随笔]
draft: false   # true 时不会出现在生产构建
---

正文……
```

保存后会自动出现在首页、`/posts` 列表、RSS 和搜索里。代码块带语法高亮与复制按钮，
并支持 KaTeX 数学公式。

## 新增成员

一人一个文件，放在 `src/content/member/` 下，文件名即网址（如 `liu.md` → `/members/liu`）。

```markdown
---
name: 名字
bio: 一句话简介
avatar: /avatars/name.jpg   # 可选，没有就用名字首字头像
order: 1                     # 数字越小排越前
links:
  - label: GitHub
    url: https://github.com/name
---

详细介绍（Markdown）……
```

头像图片放进 `public/avatars/`（建议正方形）。成员会出现在 `/members` 和首页，
每人有独立详情页 `/members/<文件名>`。

## 目录结构

```
src/
├── site.config.ts       # 站点标题、简介、导航菜单、个人信息、主题选项
├── content.config.ts    # post / page / member 集合的 schema
├── content/post/        # 文章（Markdown / MDX）
├── content/member/      # 成员（一人一个文件）
├── content/page/        # 独立页面（如 about.md）
├── components/          # 页头、页脚、头像、主题切换等组件
├── data/                # 集合辅助函数（post.ts、member.ts）
├── layouts/             # Base 与 BlogPost 布局
├── pages/               # 路由（首页、文章、成员、关于、rss、og-image…）
├── plugins/             # remark/rehype 插件（提示框、阅读时长…）
└── styles/global.css    # 设计变量（颜色、字体）+ 基础样式
public/                  # 静态资源（图标、头像、_headers…）
```

## 部署到 Cloudflare

纯静态产物在 `./dist`，已附 `wrangler.jsonc`（Workers 静态资源方式）。

- **Cloudflare 控制台连 GitHub**：框架选 Astro，构建命令 `pnpm build`，
  输出目录 `dist`。推荐，推送即自动部署。（`.npmrc` 已开启 `postbuild` 的 Pagefind 步骤。）
- **命令行**：`pnpm build && wrangler deploy`。

更换域名时，记得改 `astro.config.ts` 里的 `site`
（影响 sitemap / RSS / OG 图 / canonical 链接）。

> 主题致谢：[Astro Sienna](https://github.com/AnjayGoel/astro-sienna)，作者 Anjay Goel（MIT 许可）。
