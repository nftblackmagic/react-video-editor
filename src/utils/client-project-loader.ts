"use client";

import { projectStorage, ProjectData } from "./project-storage";

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
