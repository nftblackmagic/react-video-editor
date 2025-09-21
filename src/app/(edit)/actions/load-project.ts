"use server";

import { ProjectData } from "@/utils/project";

/**
 * Server action to load project data
 * Following the Server-First with Client Fallback pattern
 */
export async function loadProjectFromServer(projectId: string): Promise<{
	data: ProjectData | null;
	source: "database" | "client-required";
	error?: string;
}> {
	try {
		// TODO: When database is ready, uncomment this section:
		// const dbProject = await db.query.projects.findFirst({
		//   where: eq(projects.id, projectId),
		//   with: {
		//     uploads: true,
		//     transcriptions: true,
		//   }
		// });
		//
		// if (dbProject) {
		//   return {
		//     data: dbProject,
		//     source: "database"
		//   };
		// }

		// For now, indicate that client-side loading is required
		// This tells the client component to check localStorage
		return {
			data: null,
			source: "client-required",
		};
	} catch (error) {
		console.error("Error loading project from server:", error);
		return {
			data: null,
			source: "client-required",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Helper to prepare project data for Editor props
 * Separates concerns and filters out problematic data
 */
export async function prepareProjectDataForEditor(
	projectData: ProjectData | null,
) {
	if (!projectData) {
		return {
			project: null,
			initialMedia: null,
			tracks: [],
			trackItemsMap: {},
			transitionsMap: {},
			compositions: [],
			fullEDUs: [],
			settings: {},
		};
	}

	// Filter out blob URLs from track items
	const trackItemsMap = { ...(projectData.timeline?.trackItemsMap || {}) };
	const tracksToUpdate = [...(projectData.timeline?.tracks || [])];
	const itemsToRemove: string[] = [];

	// Note: Commenting out blob URL filtering to allow audio/video playback after refresh
	// Most uploaded files should have permanent URLs from Bytescale
	// for (const key in trackItemsMap) {
	// 	const item = trackItemsMap[key];
	// 	if (item?.details?.src && typeof item.details.src === "string") {
	// 		if (item.details.src.startsWith("blob:")) {
	// 			console.warn(
	// 				`Filtering out track item with expired blob URL: ${item.name || key}`,
	// 			);
	// 			itemsToRemove.push(key);
	// 			delete trackItemsMap[key];
	// 		}
	// 	}
	// }

	// Remove filtered items from tracks
	if (itemsToRemove.length > 0) {
		for (const track of tracksToUpdate) {
			if (track.items && Array.isArray(track.items)) {
				track.items = track.items.filter(
					(itemId: string) => !itemsToRemove.includes(itemId),
				);
			}
		}
	}

	return {
		project: {
			id: projectData.id,
			name: projectData.name,
			createdAt: projectData.createdAt,
			updatedAt: projectData.updatedAt,
		},
		initialMedia: projectData.initialMedia,
		tracks: tracksToUpdate,
		trackItemsMap,
		transitionsMap: projectData.timeline?.transitionsMap || {},
		compositions: projectData.timeline?.compositions || [],
		fullEDUs: projectData.fullEDUs || [],
		settings: projectData.settings || {},
		uploads: projectData.uploads || [],
	};
}
