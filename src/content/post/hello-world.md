---
title: "你好，世界"
publishDate: 2026-06-01
description: "ShareSparks 的第一篇文章，顺便看看这个写作模板能渲染些什么。"
tags: [随笔]
---

欢迎来到 ShareSparks。这是第一篇文章 —— 等你写下第一篇真正想分享的内容时，把它替换或删掉就好。

## 标题、列表与链接

正文用 Newsreader 衬线体，代码用 JetBrains Mono。列表照常工作：

- 一个要点
- 另一个要点
- 还有一个

有序列表也行：

1. 第一项
2. 第二项
3. 第三项

行内链接 —— 比如 [Astro 文档](https://docs.astro.build) —— 样式很克制，悬停才看得出来。

## 代码

代码块由 [Expressive Code](https://expressive-code.com) 渲染，带语法高亮、悬停复制按钮，并跟随亮/暗主题切换：

```ts
function greet(name: string): string {
    return `你好，${name}！`;
}
```

```bash
# 命令行代码块会渲染成终端样式
pnpm install
pnpm dev
```

## 数学公式

[KaTeX](https://katex.org) 已经接好了。行内 $E = mc^2$，也可以独立成行：

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

## 引用与强调

> 引用块带左侧竖线，斜体、略微灰一些。
>
> 多个段落也没问题。

可以正常使用*强调*与**加粗**。

## 接下来

- 在 `src/content/post/` 下新建 `.md` 文件即可发布新文章，文件名就是网址。
- 在 `src/content/member/` 下管理成员介绍。
- 站点信息在 `src/site.config.ts` 里改。
