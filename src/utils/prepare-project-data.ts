import { ProjectData } from "./project-storage";

/**
 * Helper to prepare project data for Editor props
 * Separates concerns and filters out problematic data
 */
export function prepareProjectDataForEditor(projectData: ProjectData | null) {
	if (!projectData) {
		return {
			project: null,
			initialMedia: null,
			tracks: [],
			trackItems: {},
			transitions: {},
			compositions: [],
			transcripts: [],
			settings: {},
			uploads: [],
		};
	}

	// Get track items from the timeline
	const trackItems = { ...(projectData.timeline?.trackItemsMap || {}) };
	const tracksToUpdate = [...(projectData.timeline?.tracks || [])];
	const itemsToRemove: string[] = [];

	for (const key in trackItems) {
		const item = trackItems[key];
		if (item?.details?.src && typeof item.details.src === "string") {
			if (item.details.src.startsWith("blob:")) {
				console.warn(
					`Filtering out track item with expired blob URL: ${item.name || key}`,
				);
				itemsToRemove.push(key);
				delete trackItems[key];
			}
		}
	}

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
		trackItems, // This will be used by loadTimelineGranularly
		transitions: projectData.timeline?.transitionsMap || {},
		compositions: projectData.timeline?.compositions || [],
		transcripts: projectData.transcripts || [],
		settings: projectData.settings || {},
		uploads: projectData.uploads || [],
	};
}