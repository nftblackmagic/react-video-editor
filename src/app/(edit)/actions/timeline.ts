"use server";

import * as projectQueries from "@/db/queries/projects";

/**
 * Validate if a string is a valid UUID v4
 */
function isValidUUID(id: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id);
}

interface TimelineData {
	tracks?: any[];
	trackItems?: Record<string, any>;
	trackItemIds?: string[];
	transitions?: Record<string, any>;
	transitionIds?: string[];
	compositions?: any[];
	duration?: number;
}

/**
 * Save timeline data to database
 * This is the main function for persisting timeline state
 */
export async function saveTimeline(
	projectId: string,
	userId: string,
	timeline: TimelineData,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Validate UUID format
		if (!isValidUUID(projectId)) {
			return {
				success: false,
				error: "Invalid project ID format. Expected UUID.",
			};
		}

		// Verify ownership first
		const ownsProject = await projectQueries.userOwnsProject(userId, projectId);
		if (!ownsProject) {
			return {
				success: false,
				error: "Project not found or access denied",
			};
		}

		// Prepare timeline data
		const timelineData: any = {};
		if (timeline.tracks !== undefined) timelineData.tracks = timeline.tracks;
		if (timeline.trackItems !== undefined)
			timelineData.trackItems = timeline.trackItems;
		if (timeline.transitions !== undefined)
			timelineData.transitions = timeline.transitions;
		if (timeline.compositions !== undefined)
			timelineData.compositions = timeline.compositions;
		if (timeline.duration !== undefined)
			timelineData.duration = Math.round(timeline.duration);

		const updated = await projectQueries.updateProjectTimeline(
			projectId,
			timelineData,
		);

		if (!updated) {
			return {
				success: false,
				error: "Failed to update timeline",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error saving timeline:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to save timeline",
		};
	}
}

/**
 * Get timeline data from database
 */
export async function getTimeline(
	projectId: string,
	userId?: string,
): Promise<{ success: boolean; timeline?: TimelineData; error?: string }> {
	try {
		// If userId is provided, verify ownership
		if (userId) {
			const ownsProject = await projectQueries.userOwnsProject(
				userId,
				projectId,
			);
			if (!ownsProject) {
				return {
					success: false,
					error: "Project not found or access denied",
				};
			}
		}

		const project = await projectQueries.getProjectById(projectId);

		if (!project) {
			return {
				success: false,
				error: "Project not found",
			};
		}

		const timeline: TimelineData = {
			tracks: (project.tracks as any[]) || [],
			trackItems: (project.trackItems as Record<string, any>) || {},
			transitions: (project.transitions as Record<string, any>) || {},
			compositions: (project.compositions as any[]) || [],
			duration: project.duration || 30000,
		};

		// Calculate trackItemIds and transitionIds from the maps
		timeline.trackItemIds = Object.keys(timeline.trackItems || {});
		timeline.transitionIds = Object.keys(timeline.transitions || {});

		return {
			success: true,
			timeline,
		};
	} catch (error) {
		console.error("Error getting timeline:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to get timeline",
		};
	}
}

/**
 * Update specific timeline elements
 * More granular than saveTimeline - useful for specific operations
 */
export async function updateTimelineItems(
	projectId: string,
	userId: string,
	updates: {
		addTrackItems?: Record<string, any>;
		removeTrackItemIds?: string[];
		updateTrackItems?: Record<string, any>;
		addTransitions?: Record<string, any>;
		removeTransitionIds?: string[];
	},
): Promise<{ success: boolean; error?: string }> {
	try {
		// Get current timeline
		const result = await getTimeline(projectId, userId);
		if (!result.success || !result.timeline) {
			return {
				success: false,
				error: result.error || "Failed to get current timeline",
			};
		}

		const timeline = result.timeline;

		// Apply updates
		if (updates.addTrackItems) {
			timeline.trackItems = {
				...timeline.trackItems,
				...updates.addTrackItems,
			};
		}

		if (updates.removeTrackItemIds) {
			for (const id of updates.removeTrackItemIds) {
				if (timeline.trackItems?.[id]) {
					delete timeline.trackItems[id];
				}
			}
			// Also remove from tracks
			if (timeline.tracks) {
				timeline.tracks = timeline.tracks.map((track: any) => ({
					...track,
					items:
						track.items?.filter(
							(itemId: string) => !updates.removeTrackItemIds?.includes(itemId),
						) || [],
				}));
			}
		}

		if (updates.updateTrackItems) {
			for (const [id, item] of Object.entries(updates.updateTrackItems)) {
				if (timeline.trackItems?.[id]) {
					timeline.trackItems[id] = { ...timeline.trackItems[id], ...item };
				}
			}
		}

		if (updates.addTransitions) {
			timeline.transitions = {
				...timeline.transitions,
				...updates.addTransitions,
			};
		}

		if (updates.removeTransitionIds) {
			for (const id of updates.removeTransitionIds) {
				if (timeline.transitions?.[id]) {
					delete timeline.transitions[id];
				}
			}
		}

		// Save updated timeline
		return await saveTimeline(projectId, userId, timeline);
	} catch (error) {
		console.error("Error updating timeline items:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to update timeline items",
		};
	}
}

/**
 * Clear timeline (reset to empty state)
 */
export async function clearTimeline(
	projectId: string,
	userId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const emptyTimeline: TimelineData = {
			tracks: [],
			trackItems: {},
			transitions: {},
			compositions: [],
			duration: 30000,
		};

		return await saveTimeline(projectId, userId, emptyTimeline);
	} catch (error) {
		console.error("Error clearing timeline:", error);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to clear timeline",
		};
	}
}

/**
 * Batch update timeline tracks
 */
export async function updateTimelineTracks(
	projectId: string,
	userId: string,
	tracks: any[],
): Promise<{ success: boolean; error?: string }> {
	try {
		// Verify ownership first
		const ownsProject = await projectQueries.userOwnsProject(userId, projectId);
		if (!ownsProject) {
			return {
				success: false,
				error: "Project not found or access denied",
			};
		}

		const updated = await projectQueries.updateProjectTimeline(projectId, {
			tracks,
		});

		if (!updated) {
			return {
				success: false,
				error: "Failed to update tracks",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error updating timeline tracks:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to update tracks",
		};
	}
}
