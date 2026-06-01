import { type CollectionEntry, getCollection } from "astro:content";

/** Fetch all members. Drafts are excluded in production builds. */
export async function getAllMembers(): Promise<CollectionEntry<"member">[]> {
	const members = await getCollection("member", ({ data }) => {
		return import.meta.env.PROD ? !data.draft : true;
	});
	return members.sort((a, b) => a.data.order - b.data.order);
}
