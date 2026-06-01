// Site-wide configuration. Edit these to make the site yours.
export const SITE = {
  title: 'ShareSparks',
  description: '兀坐听雪溜竟日，闲谈生慧火一星。',
  // Your production URL — update once the Cloudflare domain is ready.
  url: 'https://sharesparks.pages.dev',
  author: '',
  lang: 'zh-CN',
} as const;

// Top navigation links.
export const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/posts', label: '文章' },
  { href: '/about', label: '关于' },
] as const;
