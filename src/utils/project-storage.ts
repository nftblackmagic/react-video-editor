import { TranscriptSegment } from "@/features/editor/transcript/types";
import { nanoid } from "nanoid";

export interface ProjectMedia {
	url: string;
	type: "video" | "audio";
	uploadId: string;
	fileName?: string;
	fileSize?: number;
	duration?: number;
}

export interface ProjectData {
	id: string;
	name: string;
	initialMedia: ProjectMedia;
	timeline: {
		tracks: any[];
		trackItems: Record<string, any>;
		transitions: Record<string, any>;
		compositions?: any[];
		duration?: number;
	};
	settings: {
		fps?: number;
		width?: number;
		height?: number;
		background?: { type: string; value: string };
	};
	transcripts?: TranscriptSegment[]; // Add transcript storage
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

const PROJECTS_INDEX_KEY = "video-editor-projects";
const PROJECT_PREFIX = "project-";

class ProjectStorage {
	/**
	 * Create a new project with initial media
	 */
	createProject(initialMedia: ProjectMedia, name?: string): ProjectData {
		const projectId = nanoid(10);
		const now = new Date().toISOString();

		const projectData: ProjectData = {
			id: projectId,
			name: name || `Project ${new Date().toLocaleDateString()}`,
			initialMedia,
			timeline: {
				tracks: [],
				trackItems: {} as Record<string, any>,
				transitions: {} as Record<string, any>,
				compositions: [],
				duration: 30000, // Default 30 seconds
			},
			settings: {
				fps: 30,
				width: 1920,
				height: 1080,
			},
			transcripts: [],
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
		timeline: Partial<ProjectData["timeline"]>
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
		settings: Partial<ProjectData["settings"]>
	): boolean {
		const project = this.getProject(projectId);
		if (!project) return false;

		project.settings = { ...project.settings, ...settings };
		this.saveProject(project);
		return true;
	}

	/**
	 * Update project transcripts
	 */
	updateProjectTranscripts(
		projectId: string,
		transcripts: TranscriptSegment[]
	): boolean {
		const project = this.getProject(projectId);
		if (!project) return false;

		project.transcripts = transcripts;
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
		keys.forEach((key) => {
			if (key.startsWith(PROJECT_PREFIX)) {
				localStorage.removeItem(key);
			}
		});
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
		updates: Partial<ProjectListItem>
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
			localStorage.setItem(
				PROJECTS_INDEX_KEY,
				JSON.stringify({ projects })
			);
		} catch (error) {
			console.error("Failed to save project index:", error);
		}
	}
}

// Export singleton instance
export const projectStorage = new ProjectStorage();