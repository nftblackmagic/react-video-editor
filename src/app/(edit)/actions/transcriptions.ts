"use server";

import * as transcriptionQueries from "@/db/queries/transcriptions";
import type { NewTranscription, Transcription } from "@/db/schema";
import type { FullEDU } from "@/features/editor/transcript/types";

/**
 * Save transcription with fullEDUs to database
 */
export async function saveTranscription(
	uploadId: string,
	fullEDUs: FullEDU[],
	metadata?: {
		language?: string;
		provider?: string;
		wordCount?: number;
		duration?: number;
	},
): Promise<{ success: boolean; transcriptionId?: string; error?: string }> {
	try {
		// Check if transcription already exists for this upload
		const existing =
			await transcriptionQueries.getTranscriptionByUploadId(uploadId);

		// Prepare segments data with fullEDUs
		const segments = fullEDUs.map((edu) => ({
			id: `edu-${edu.edu_index}`,
			text: edu.edu_content,
			start: edu.edu_start,
			end: edu.edu_end,
			speaker_id: null,
			confidence: null,
			words: edu.words, // Include word-level timestamps
		}));

		if (existing) {
			// Update existing transcription
			const updated = await transcriptionQueries.updateTranscription(
				existing.id,
				{
					segments: segments as any,
					language: metadata?.language || existing.language,
					provider: metadata?.provider || existing.provider,
					wordCount: metadata?.wordCount || existing.wordCount,
					duration: metadata?.duration || existing.duration,
					status: "completed",
					completedAt: new Date(),
				},
			);

			return {
				success: true,
				transcriptionId: updated.id,
			};
		}

		// Create new transcription
		const newTranscription: NewTranscription = {
			uploadId,
			language: metadata?.language || "en",
			segments: segments as any,
			wordCount: metadata?.wordCount,
			duration: metadata?.duration,
			status: "completed",
			provider: metadata?.provider,
			completedAt: new Date(),
		};

		const created =
			await transcriptionQueries.createTranscription(newTranscription);

		return {
			success: true,
			transcriptionId: created.id,
		};
	} catch (error) {
		console.error("Error saving transcription:", error);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to save transcription",
		};
	}
}

/**
 * Get transcription by upload ID
 */
export async function getTranscription(uploadId: string): Promise<{
	success: boolean;
	transcription?: Transcription;
	fullEDUs?: FullEDU[];
	error?: string;
}> {
	try {
		const transcription =
			await transcriptionQueries.getTranscriptionByUploadId(uploadId);

		if (!transcription) {
			return {
				success: false,
				error: "Transcription not found",
			};
		}

		// Convert segments back to FullEDU format
		const fullEDUs: FullEDU[] = (transcription.segments as any[]).map(
			(segment, index) => ({
				edu_index: index,
				edu_content: segment.text,
				edu_start: segment.start,
				edu_end: segment.end,
				words: segment.words || [],
			}),
		);

		return {
			success: true,
			transcription,
			fullEDUs,
		};
	} catch (error) {
		console.error("Error getting transcription:", error);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to get transcription",
		};
	}
}

/**
 * Update transcription segments
 */
export async function updateTranscription(
	uploadId: string,
	fullEDUs: FullEDU[],
): Promise<{ success: boolean; error?: string }> {
	try {
		// Convert fullEDUs to segments format
		const segments = fullEDUs.map((edu) => ({
			id: `edu-${edu.edu_index}`,
			text: edu.edu_content,
			start: edu.edu_start,
			end: edu.edu_end,
			speaker_id: null,
			confidence: null,
			words: edu.words,
		}));

		// Need to get the transcription first to get its ID
		const existing =
			await transcriptionQueries.getTranscriptionByUploadId(uploadId);
		if (!existing) {
			return {
				success: false,
				error: "Transcription not found",
			};
		}

		const updated = await transcriptionQueries.updateTranscription(
			existing.id,
			{
				segments: segments as any,
				status: "completed",
				completedAt: new Date(),
			},
		);

		if (!updated) {
			return {
				success: false,
				error: "Transcription not found",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error updating transcription:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to update transcription",
		};
	}
}

/**
 * Delete transcription
 */
export async function deleteTranscription(
	uploadId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Get transcription by upload ID first
		const existing =
			await transcriptionQueries.getTranscriptionByUploadId(uploadId);
		if (!existing) {
			return {
				success: false,
				error: "Transcription not found",
			};
		}

		const deleted = await transcriptionQueries.deleteTranscription(existing.id);

		if (!deleted) {
			return {
				success: false,
				error: "Transcription not found",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error deleting transcription:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to delete transcription",
		};
	}
}

/**
 * Get transcription for a project
 * This is a helper that gets all transcriptions for uploads in a project
 */
export async function getProjectTranscriptions(projectId: string): Promise<{
	success: boolean;
	transcriptions?: Transcription[];
	error?: string;
}> {
	try {
		const results =
			await transcriptionQueries.getProjectTranscriptions(projectId);

		return {
			success: true,
			transcriptions: results.map((r) => r.transcription),
		};
	} catch (error) {
		console.error("Error getting project transcriptions:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to get project transcriptions",
		};
	}
}
