import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	projectStorage,
	type ProjectData,
	type ProjectMedia,
	type ProjectListItem,
} from "@/utils/project-storage";
import { TranscriptSegment } from "../transcript/types";

interface ProjectStore {
	// Current project state
	currentProjectId: string | null;
	projectData: ProjectData | null;
	initialMediaUrl: string | null;

	// Project list
	projects: ProjectListItem[];

	// Actions
	createProject: (
		initialMedia: ProjectMedia,
		name?: string
	) => ProjectData;
	loadProject: (projectId: string) => boolean;
	saveCurrentProject: () => void;
	updateProjectName: (name: string) => void;
	updateProjectTimeline: (timeline: Partial<ProjectData["timeline"]>) => void;
	updateProjectSettings: (settings: Partial<ProjectData["settings"]>) => void;
	updateProjectTranscripts: (transcripts: TranscriptSegment[]) => void;
	deleteProject: (projectId: string) => void;
	refreshProjectList: () => void;
	clearCurrentProject: () => void;
}

const useProjectStore = create<ProjectStore>()(
	persist(
		(set, get) => ({
			// Initial state
			currentProjectId: null,
			projectData: null,
			initialMediaUrl: null,
			projects: [],

			// Create new project
			createProject: (initialMedia: ProjectMedia, name?: string) => {
				const project = projectStorage.createProject(initialMedia, name);
				set({
					currentProjectId: project.id,
					projectData: project,
					initialMediaUrl: initialMedia.url,
				});
				get().refreshProjectList();
				return project;
			},

			// Load existing project
			loadProject: (projectId: string) => {
				const project = projectStorage.getProject(projectId);
				if (!project) {
					console.error(`Project ${projectId} not found`);
					return false;
				}

				set({
					currentProjectId: projectId,
					projectData: project,
					initialMediaUrl: project.initialMedia?.url || null,
				});
				return true;
			},

			// Save current project to localStorage
			saveCurrentProject: () => {
				const { projectData } = get();
				if (!projectData) return;

				projectStorage.saveProject(projectData);
				get().refreshProjectList();
			},

			// Update project name
			updateProjectName: (name: string) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = { ...projectData, name };
				projectStorage.saveProject(updated);
				set({ projectData: updated });
				get().refreshProjectList();
			},

			// Update project timeline
			updateProjectTimeline: (timeline: Partial<ProjectData["timeline"]>) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					timeline: { ...projectData.timeline, ...timeline },
				};
				projectStorage.saveProject(updated);
				set({ projectData: updated });
			},

			// Update project settings
			updateProjectSettings: (settings: Partial<ProjectData["settings"]>) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					settings: { ...projectData.settings, ...settings },
				};
				projectStorage.saveProject(updated);
				set({ projectData: updated });
			},

			// Update project transcripts
			updateProjectTranscripts: (transcripts: TranscriptSegment[]) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					transcripts,
				};
				projectStorage.saveProject(updated);
				set({ projectData: updated });
			},

			// Delete project
			deleteProject: (projectId: string) => {
				projectStorage.deleteProject(projectId);
				
				// If deleting current project, clear it
				if (get().currentProjectId === projectId) {
					set({
						currentProjectId: null,
						projectData: null,
						initialMediaUrl: null,
					});
				}
				
				get().refreshProjectList();
			},

			// Refresh project list
			refreshProjectList: () => {
				const projects = projectStorage.listProjects();
				set({ projects });
			},

			// Clear current project
			clearCurrentProject: () => {
				set({
					currentProjectId: null,
					projectData: null,
					initialMediaUrl: null,
				});
			},
		}),
		{
			name: "project-store",
			partialize: (state) => ({
				currentProjectId: state.currentProjectId,
			}),
		}
	)
);

export default useProjectStore;