# 参与 ShareSparks

[English](./CONTRIBUTING.md) | [简体中文](./CONTRIBUTING.zh-CN.md)

感谢你想在这里分享内容！本指南会一步步带你：发表文章、把自己加为成员、在本地预览改动、提交
Pull Request（PR）。

你不需要是程序员 —— 只要会写 Markdown、跟着下面的步骤走，就能参与。

## 1. Fork 并克隆仓库

1. 打开[仓库页面](https://github.com/ShareSparks/ShareSparks)，点右上角的 **Fork**，把仓库
   复制到你自己的 GitHub 账号下。
2. 把你 fork 的仓库克隆到本地：

   ```bash
   git clone https://github.com/<你的用户名>/ShareSparks.git
   cd ShareSparks
   ```

3. 新建一个分支来放你的改动：

   ```bash
   git checkout -b post/my-article
   ```

## 2. 本地预览（可选，但推荐）

本项目用 [pnpm](https://pnpm.io/)。先装好 [Node.js](https://nodejs.org/) 18+，然后：

```bash
pnpm install      # 安装依赖（只需第一次）
pnpm dev          # 启动本地预览：http://localhost:4321
```

让 `pnpm dev` 一直开着，边改文件边看 —— 浏览器会自动刷新。

## 3. 写一篇文章

在 `src/content/post/` 下新建一个 Markdown 文件，例如
`src/content/post/my-first-article.md`。文件名（小写）就是文章网址：
`/posts/my-first-article/`。

文件开头要有一段 **frontmatter**（两行 `---` 之间的部分），下面再用 Markdown 写正文：

```markdown
---
title: "文章标题"
description: "一句话简介，10–160 字，会显示在预览和分享卡片里。"
publishDate: 2026-06-03
author: liu          # 可选 —— 你的成员 id（见第 4 步）；没有就删掉这行
tags: [Agent, LLM]   # 可选
draft: false         # 可选 —— 设为 true 可以先隐藏、不发布到线上
---

正文从这里开始。普通 **Markdown** 就行：标题、列表、`代码`、> 引用、图片、链接都支持。
```

frontmatter 字段：

| 字段          | 必填 | 说明                                                   |
| ------------- | ---- | ------------------------------------------------------ |
| `title`       | 是   | 最多 120 字。                                          |
| `description` | 是   | 10–160 字。用于预览和 SEO。                             |
| `publishDate` | 是   | `年-月-日`，如 `2026-06-03`。                          |
| `author`      | 否   | 成员 id —— 即 `src/content/member/` 下的文件名。       |
| `tags`        | 否   | 列表，如 `[Agent, LLM]`。                              |
| `draft`       | 否   | `true` 表示在线上隐藏，默认 `false`。                  |
| `updatedDate` | 否   | `年-月-日`，以后修订时填。                             |

> **小技巧：** 直接复制 `src/content/post/` 里已有的一篇文章再改，是最省事、最不容易写错
> frontmatter 的办法。

## 4. 把自己加为成员（可选）

想让文章署名到你，就在 `src/content/member/` 下加一个个人资料，例如
`src/content/member/jane.md`。文件名就是你的 **成员 id** —— 在文章 frontmatter 的 `author`
里填它。

```markdown
---
name: JANE DOE
bio: 一句话简介。
# avatar: /avatars/jane.jpg   # 把图片放进 public/avatars/，再取消注释
order: 3                      # 数字越小，在成员墙上越靠前
links:
  - label: GitHub
    url: https://github.com/jane
---

用 Markdown 写一段更详细的介绍 —— 你是谁、写些什么。
```

## 5. 更新 README 目录

[`README.md`](./README.md) 和 [`README.zh-CN.md`](./README.zh-CN.md) 里的文章列表是手动
维护的。在 **Articles / 文章目录** 这一节里，给你的新文章加一行（最新在前）：

```markdown
- [文章标题](https://sharesparks.dev/posts/my-first-article/) — JANE DOE · 2026-06-03
```

## 6. 提交 Pull Request

```bash
git add .
git commit -m "post: add my first article"
git push origin post/my-article
```

然后在 GitHub 上打开你 fork 的仓库，点 **Compare & pull request**，简单说明你加了什么，
我们会 review 并合并。合并后就会出现在 <https://sharesparks.dev> 上。

感谢分享！✨
