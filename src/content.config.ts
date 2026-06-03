import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

function removeDupsAndLowerCase(array: string[]) {
	if (!array.length) return array;
	const lowercaseItems = array.map((str) => str.toLowerCase());
	const distinctItems = new Set(lowercaseItems);
	return Array.from(distinctItems);
}

const post = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/post" }),
	schema: ({ image }) =>
		z.object({
			// Optional member id (filename under src/content/member, e.g. "liu").
			// When set, the byline shows that member's name and links to their page.
			author: z.string().optional(),
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
			description: z.string().min(10).max(160),
			draft: z.boolean().default(false),
			ogImage: z.string().optional(),
			publishDate: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),
			tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
			title: z.string().max(120),
			updatedDate: z
				.string()
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
		}),
});

const page = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/page" }),
	schema: z.object({
		title: z.string().max(120),
		description: z.string().max(160).optional(),
	}),
});

// One file per person under src/content/member.
const member = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/member" }),
	schema: z.object({
		name: z.string().max(80),
		// One-line intro shown under the avatar.
		bio: z.string().max(160).optional(),
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

export const collections = { post, page, member };
