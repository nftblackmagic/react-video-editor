"use server";

import { type NewProject, type Project } from "@/db/schema";
import * as projectQueries from "@/db/queries/projects";
import type { ProjectData, ProjectMedia } from "@/utils/project";

/**
 * Validate if a string is a valid UUID v4
 */
function isValidUUID(id: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id);
}

/**
 * Create a new project in the database
 */
export async function createProject(
	userId: string,
	initialMedia: ProjectMedia,
	name?: string,
): Promise<{ success: boolean; projectId?: string; error?: string }> {
	try {
		const projectId = crypto.randomUUID();
		const now = new Date();

		const newProject: NewProject = {
			id: projectId,
			userId,
			name: name || `Project ${now.toLocaleDateString()}`,
			description: null,
			thumbnail: null,
			duration: initialMedia.duration || 30000,
			fps: 30,
			width: 1920,
			height: 1080,
			tracks: [],
			trackItems: {},
			transitions: {},
			compositions: [],
			background: { type: "solid", value: "#000000" },
			settings: {
				initialMedia,
			},
			status: "draft",
			isPublic: false,
		};

		const created = await projectQueries.createProject(newProject);

		return {
			success: true,
			projectId: created.id,
		};
	} catch (error) {
		console.error("Error creating project:", error);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to create project",
		};
	}
}

/**
 * Get a project by ID
 */
export async function getProject(
	projectId: string,
	userId?: string,
): Promise<{ success: boolean; project?: Project; error?: string }> {
	try {
		// Validate that the project ID is a proper UUID
		if (!isValidUUID(projectId)) {
			return {
				success: false,
				error: "Invalid project ID format. Expected UUID.",
			};
		}

		const project = await projectQueries.getProjectById(projectId);

		if (!project) {
			return {
				success: false,
				error: "Project not found",
			};
		}

		// If userId is provided, verify ownership
		if (userId && project.userId !== userId) {
			return {
				success: false,
				error: "Access denied",
			};
		}

		return {
			success: true,
			project,
		};
	} catch (error) {
		console.error("Error getting project:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to get project",
		};
	}
}

/**
 * Update project settings (name, dimensions, fps, background)
 */
export async function updateProjectSettings(
	projectId: string,
	userId: string,
	settings: {
		name?: string;
		width?: number;
		height?: number;
		fps?: number;
		background?: { type: string; value: string };
		duration?: number;
		initialMedia?: any;
	},
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

		const updateData: any = {};

		// Handle top-level fields
		if (settings.name !== undefined) updateData.name = settings.name;
		if (settings.width !== undefined) updateData.width = settings.width;
		if (settings.height !== undefined) updateData.height = settings.height;
		if (settings.fps !== undefined) updateData.fps = settings.fps;
		if (settings.background !== undefined)
			updateData.background = settings.background;
		if (settings.duration !== undefined)
			updateData.duration = Math.round(settings.duration);

		// Handle settings JSONB field updates (like initialMedia)
		if (settings.initialMedia !== undefined) {
			// Get current project to merge settings
			const currentProject = await projectQueries.getProjectById(projectId);
			if (currentProject) {
				const currentSettings = (currentProject.settings as any) || {};
				updateData.settings = {
					...currentSettings,
					initialMedia: settings.initialMedia,
				};
			}
		}

		const updated = await projectQueries.updateProject(projectId, updateData);

		if (!updated) {
			return {
				success: false,
				error: "Failed to update project",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error updating project settings:", error);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to update settings",
		};
	}
}

/**
 * List all projects for a user
 */
export async function listUserProjects(
	userId: string,
	limit = 50,
): Promise<{ success: boolean; projects?: Project[]; error?: string }> {
	try {
		const userProjects = await projectQueries.getUserProjects(userId);

		// Apply limit if needed (query function doesn't have limit parameter)
		const limitedProjects = userProjects.slice(0, limit);

		return {
			success: true,
			projects: limitedProjects,
		};
	} catch (error) {
		console.error("Error listing projects:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to list projects",
		};
	}
}

/**
 * Delete a project
 */
export async function deleteProject(
	projectId: string,
	userId: string,
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

		const deleted = await projectQueries.deleteProject(projectId);

		if (!deleted) {
			return {
				success: false,
				error: "Failed to delete project",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error deleting project:", error);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to delete project",
		};
	}
}

/**
 * Migrate a project from localStorage to database
 */
export async function migrateProjectToDb(
	userId: string,
	projectData: ProjectData,
): Promise<{ success: boolean; projectId?: string; error?: string }> {
	try {
		// For migration, we always create a new project with a proper UUID
		// We don't check for existing projects by old IDs since we're not preserving them
		// This ensures all database entries use proper UUIDs

		// Create new project in DB with a fresh UUID
		// We don't preserve the old ID to ensure all database entries use proper UUIDs
		const newProjectId = crypto.randomUUID();
		const newProject: NewProject = {
			id: newProjectId,
			userId,
			name: projectData.name,
			description: null,
			thumbnail: null,
			duration: projectData.timeline?.duration || 30000,
			fps: projectData.settings?.fps || 30,
			width: projectData.settings?.width || 1920,
			height: projectData.settings?.height || 1080,
			tracks: projectData.timeline?.tracks || [],
			trackItems: projectData.timeline?.trackItemsMap || {},
			transitions: projectData.timeline?.transitionsMap || {},
			compositions: projectData.timeline?.compositions || [],
			background: projectData.settings?.background,
			settings: {
				...projectData.settings,
				initialMedia: projectData.initialMedia,
				uploads: projectData.uploads,
			},
			status: "draft",
			isPublic: false,
			createdAt: new Date(projectData.createdAt),
			updatedAt: new Date(projectData.updatedAt),
		};

		const created = await projectQueries.createProject(newProject);

		return {
			success: true,
			projectId: created.id,
		};
	} catch (error) {
		console.error("Error migrating project to DB:", error);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to migrate project",
		};
	}
}
