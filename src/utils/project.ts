/**
 * Project Management Utilities
 * Handles project storage, loading, and data preparation
 */

import { FullEDU } from "@/features/editor/transcript/types";

// ============================================
// Types and Interfaces
// ============================================

export interface ProjectMedia {
	url: string;
	type: "video" | "audio" | "image";
	uploadId: string;
	fileName?: string;
	fileSize?: number;
	duration?: number;
	isPending?: boolean; // Indicates if the media upload is still pending
}

export interface ProjectUpload {
	id: string;
	fileName: string;
	filePath: string;
	url: string;
	contentType: string;
	fileSize?: number;
	uploadedAt: string;
	folder?: string;
	metadata?: any;
}

export interface ProjectData {
	id: string;
	name: string;
	initialMedia: ProjectMedia;
	uploads: ProjectUpload[]; // Store all project uploads
	timeline: {
		tracks: any[];
		trackItemsMap: Record<string, any>;
		trackItemIds: string[];
		transitionsMap: Record<string, any>;
		transitionIds: string[];
		compositions?: any[];
		duration?: number;
	};
	settings: {
		fps?: number;
		width?: number;
		height?: number;
		background?: { type: string; value: string };
	};
	fullEDUs?: FullEDU[]; // EDU-structured transcript storage
	createdAt: string;
	updatedAt: string;
}

export interface ProjectListItem {
	id: string;
	name: string;
	thumbnail?: string;
	createdAt: string;
	updatedAt: string;
}

// ============================================
// Project Storage Class
// ============================================

const PROJECTS_INDEX_KEY = "video-editor-projects";
const PROJECT_PREFIX = "project-";

class ProjectStorage {
	/**
	 * Create a new project with initial media
	 */
	createProject(initialMedia: ProjectMedia, name?: string): ProjectData {
		const projectId = crypto.randomUUID();
		const now = new Date().toISOString();

		const projectData: ProjectData = {
			id: projectId,
			name: name || `Project ${new Date().toLocaleDateString()}`,
			initialMedia,
			uploads: [], // Initialize empty uploads array
			timeline: {
				tracks: [],
				trackItemsMap: {},
				trackItemIds: [],
				transitionsMap: {},
				transitionIds: [],
				compositions: [],
				duration: 30000, // Default 30 seconds
			},
			settings: {
				fps: 30,
				width: 1920,
				height: 1080,
			},
			fullEDUs: [],
			createdAt: now,
			updatedAt: now,
		};

		// Save project
		this.saveProject(projectData);

		// Add to index
		this.addToIndex({
			id: projectId,
			name: projectData.name,
			createdAt: now,
			updatedAt: now,
		});

		return projectData;
	}

	/**
	 * Save project data to localStorage
	 */
	saveProject(projectData: ProjectData): void {
		const key = `${PROJECT_PREFIX}${projectData.id}`;
		projectData.updatedAt = new Date().toISOString();

		try {
			localStorage.setItem(key, JSON.stringify(projectData));
			// Update index
			this.updateIndex(projectData.id, {
				name: projectData.name,
				updatedAt: projectData.updatedAt,
			});
		} catch (error) {
			console.error("Failed to save project:", error);
			throw new Error("Failed to save project. Storage may be full.");
		}
	}

	/**
	 * Get project by ID
	 */
	getProject(projectId: string): ProjectData | null {
		const key = `${PROJECT_PREFIX}${projectId}`;
		try {
			const data = localStorage.getItem(key);
			if (!data) return null;
			return JSON.parse(data) as ProjectData;
		} catch (error) {
			console.error("Failed to load project:", error);
			return null;
		}
	}

	/**
	 * List all projects
	 */
	listProjects(): ProjectListItem[] {
		try {
			const indexData = localStorage.getItem(PROJECTS_INDEX_KEY);
			if (!indexData) return [];

			const index = JSON.parse(indexData);
			return index.projects || [];
		} catch (error) {
			console.error("Failed to list projects:", error);
			return [];
		}
	}

	/**
	 * Delete a project
	 */
	deleteProject(projectId: string): boolean {
		const key = `${PROJECT_PREFIX}${projectId}`;
		try {
			localStorage.removeItem(key);
			this.removeFromIndex(projectId);
			return true;
		} catch (error) {
			console.error("Failed to delete project:", error);
			return false;
		}
	}

	/**
	 * Update project name
	 */
	updateProjectName(projectId: string, newName: string): boolean {
		const project = this.getProject(projectId);
		if (!project) return false;

		project.name = newName;
		this.saveProject(project);
		return true;
	}

	/**
	 * Update project timeline
	 */
	updateProjectTimeline(
		projectId: string,
		timeline: Partial<ProjectData["timeline"]>,
	): boolean {
		const project = this.getProject(projectId);
		if (!project) return false;

		project.timeline = { ...project.timeline, ...timeline };
		this.saveProject(project);
		return true;
	}

	/**
	 * Update project settings
	 */
	updateProjectSettings(
		projectId: string,
		settings: Partial<ProjectData["settings"]>,
	): boolean {
		const project = this.getProject(projectId);
		if (!project) return false;

		project.settings = { ...project.settings, ...settings };
		this.saveProject(project);
		return true;
	}

	/**
	 * Add upload to project
	 */
	addProjectUpload(projectId: string, upload: ProjectUpload): boolean {
		const project = this.getProject(projectId);
		if (!project) return false;

		// Initialize uploads array if it doesn't exist (for backward compatibility)
		if (!project.uploads) {
			project.uploads = [];
		}

		// Check if upload already exists
		const existingIndex = project.uploads.findIndex((u) => u.id === upload.id);
		if (existingIndex !== -1) {
			// Update existing upload
			project.uploads[existingIndex] = upload;
		} else {
			// Add new upload
			project.uploads.push(upload);
		}

		this.saveProject(project);
		return true;
	}

	/**
	 * Add multiple uploads to project
	 */
	addProjectUploads(projectId: string, uploads: ProjectUpload[]): boolean {
		const project = this.getProject(projectId);
		if (!project) return false;

		// Initialize uploads array if it doesn't exist
		if (!project.uploads) {
			project.uploads = [];
		}

		// Add or update uploads
		for (const upload of uploads) {
			const existingIndex = project.uploads.findIndex(
				(u) => u.id === upload.id,
			);
			if (existingIndex !== -1) {
				project.uploads[existingIndex] = upload;
			} else {
				project.uploads.push(upload);
			}
		}

		this.saveProject(project);
		return true;
	}

	/**
	 * Get project uploads
	 */
	getProjectUploads(projectId: string): ProjectUpload[] {
		const project = this.getProject(projectId);
		if (!project) return [];
		return project.uploads || [];
	}

	/**
	 * Remove upload from project
	 */
	removeProjectUpload(projectId: string, uploadId: string): boolean {
		const project = this.getProject(projectId);
		if (!project || !project.uploads) return false;

		project.uploads = project.uploads.filter((u) => u.id !== uploadId);
		this.saveProject(project);
		return true;
	}

	/**
	 * Check if localStorage is available
	 */
	isAvailable(): boolean {
		try {
			const testKey = "__test__";
			localStorage.setItem(testKey, "test");
			localStorage.removeItem(testKey);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get storage size (approximate)
	 */
	getStorageSize(): number {
		let size = 0;
		for (const key in localStorage) {
			if (key.startsWith(PROJECT_PREFIX) || key === PROJECTS_INDEX_KEY) {
				size += localStorage[key].length;
			}
		}
		return size;
	}

	/**
	 * Clear all projects
	 */
	clearAllProjects(): void {
		const keys = Object.keys(localStorage);
		for (const key of keys) {
			if (key.startsWith(PROJECT_PREFIX)) {
				localStorage.removeItem(key);
			}
		}
		localStorage.removeItem(PROJECTS_INDEX_KEY);
	}

	// Private helper methods
	private addToIndex(item: ProjectListItem): void {
		const projects = this.listProjects();
		projects.unshift(item);
		this.saveIndex(projects);
	}

	private updateIndex(
		projectId: string,
		updates: Partial<ProjectListItem>,
	): void {
		const projects = this.listProjects();
		const index = projects.findIndex((p) => p.id === projectId);
		if (index !== -1) {
			projects[index] = { ...projects[index], ...updates };
			this.saveIndex(projects);
		}
	}

	private removeFromIndex(projectId: string): void {
		const projects = this.listProjects();
		const filtered = projects.filter((p) => p.id !== projectId);
		this.saveIndex(filtered);
	}

	private saveIndex(projects: ProjectListItem[]): void {
		try {
			localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify({ projects }));
		} catch (error) {
			console.error("Failed to save project index:", error);
		}
	}
}

// Export singleton instance
export const projectStorage = new ProjectStorage();

// ============================================
// Project Data Preparation
// ============================================

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
			fullEDUs: [],
			settings: {},
			uploads: [],
		};
	}

	// Get track items from the timeline
	const trackItems = { ...(projectData.timeline?.trackItemsMap || {}) };
	const tracksToUpdate = [...(projectData.timeline?.tracks || [])];
	const itemsToRemove: string[] = [];

	// Note: Commenting out blob URL filtering to allow audio/video playback after refresh
	// Most uploaded files should have permanent URLs from Bytescale
	// for (const key in trackItems) {
	// 	const item = trackItems[key];
	// 	if (item?.details?.src && typeof item.details.src === "string") {
	// 		if (item.details.src.startsWith("blob:")) {
	// 			console.warn(
	// 				`Filtering out track item with expired blob URL: ${item.name || key}`,
	// 			);
	// 			itemsToRemove.push(key);
	// 			delete trackItems[key];
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
		trackItems, // This will be used by loadTimelineGranularly
		transitions: projectData.timeline?.transitionsMap || {},
		compositions: projectData.timeline?.compositions || [],
		fullEDUs: projectData.fullEDUs || [],
		settings: projectData.settings || {},
		uploads: projectData.uploads || [],
	};
}

// ============================================
// Client-side Loading
// ============================================

/**
 * Client-side project loader
 * This runs on the client to access localStorage
 */
export function loadProjectFromClient(projectId: string): ProjectData | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		return projectStorage.getProject(projectId);
	} catch (error) {
		console.error("Failed to load project from localStorage:", error);
		return null;
	}
}
