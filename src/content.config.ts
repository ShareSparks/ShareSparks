import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

// The "posts" collection: Markdown / MDX files under src/content/posts.
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// The "members" collection: one file per person under src/content/members.
const members = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/members' }),
  schema: z.object({
    name: z.string(),
    // One-line intro shown under the avatar.
    bio: z.string().optional(),
    // Path to an image in /public (e.g. /avatars/liu.jpg) or a full URL.
    // Leave empty to fall back to an initial-letter avatar.
    avatar: z.string().optional(),
    // Social / contact links shown on the detail page.
    links: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
    // Lower number = shown first on the members wall.
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, members };
