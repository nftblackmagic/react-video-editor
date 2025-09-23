"use server";

import * as uploadQueries from "@/db/queries/uploads";
import type { NewUpload } from "@/db/schema";

/**
 * Validate if a string is a valid UUID v4
 */
function isValidUUID(id: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id);
}

/**
 * Create a new upload record
 */
export async function createUpload(
	data: {
		projectId: string;
		userId: string;
		fileName: string;
		fileType: string;
		fileSize: number;
		url: string;
		uploadServiceId?: string;
		metadata?: any;
		status?: "processing" | "ready" | "failed";
	},
): Promise<{ success: boolean; uploadId?: string; error?: string }> {
	try {
		// Validate UUIDs
		if (!isValidUUID(data.projectId)) {
			return {
				success: false,
				error: "Invalid project ID format. Expected UUID.",
			};
		}

		if (!isValidUUID(data.userId)) {
			return {
				success: false,
				error: "Invalid user ID format. Expected UUID.",
			};
		}

		const newUpload: NewUpload = {
			projectId: data.projectId,
			userId: data.userId,
			fileName: data.fileName,
			originalName: data.fileName, // Use fileName as originalName
			fileUrl: data.url, // Map url to fileUrl
			fileType: data.fileType,
			fileSize: data.fileSize,
			uploadServiceId: data.uploadServiceId,
			metadata: data.metadata,
			status: data.status || "ready",
		};

		const created = await uploadQueries.createUpload(newUpload);

		return {
			success: true,
			uploadId: created.id,
		};
	} catch (error) {
		console.error("Error creating upload:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to create upload",
		};
	}
}

/**
 * Get uploads for a project
 */
export async function getProjectUploads(
	projectId: string,
	userId: string,
): Promise<{ success: boolean; uploads?: any[]; error?: string }> {
	try {
		// Validate UUID format
		if (!isValidUUID(projectId)) {
			return {
				success: false,
				error: "Invalid project ID format. Expected UUID.",
			};
		}

		const uploads = await uploadQueries.getProjectUploads(projectId);

		return {
			success: true,
			uploads,
		};
	} catch (error) {
		console.error("Error getting project uploads:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to get uploads",
		};
	}
}

/**
 * Update upload status
 */
export async function updateUploadStatus(
	uploadId: string,
	status: "processing" | "ready" | "failed",
	errorMessage?: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Validate UUID format
		if (!isValidUUID(uploadId)) {
			return {
				success: false,
				error: "Invalid upload ID format. Expected UUID.",
			};
		}

		const updated = await uploadQueries.updateUploadStatus(
			uploadId,
			status,
			errorMessage,
		);

		if (!updated) {
			return {
				success: false,
				error: "Upload not found",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error updating upload status:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to update upload",
		};
	}
}

/**
 * Delete upload
 */
export async function deleteUpload(
	uploadId: string,
	userId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Validate UUID format
		if (!isValidUUID(uploadId)) {
			return {
				success: false,
				error: "Invalid upload ID format. Expected UUID.",
			};
		}

		// Get upload first to verify ownership
		const upload = await uploadQueries.getUploadById(uploadId);
		if (!upload) {
			return {
				success: false,
				error: "Upload not found",
			};
		}

		if (upload.userId !== userId) {
			return {
				success: false,
				error: "Access denied",
			};
		}

		const deleted = await uploadQueries.deleteUpload(uploadId);

		if (!deleted) {
			return {
				success: false,
				error: "Failed to delete upload",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error deleting upload:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to delete upload",
		};
	}
}