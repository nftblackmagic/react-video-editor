"use server";

import { TranscriptSegment } from "@/features/editor/transcript/types";
import {
	getTranscriptionOrchestrator,
	type OrchestratorOptions,
} from "@/lib/transcription/orchestrator";
import {
	TranscriptionError,
	TranscriptionErrorType,
} from "@/lib/transcription/server";

/**
 * Server action to transcribe audio/video using the orchestrator
 * @param url - URL of the media file to transcribe
 * @param language - Language code for transcription
 * @returns Array of transcript segments
 */
export async function transcribeAction(
	url: string,
	language: string,
): Promise<TranscriptSegment[]> {
	try {
		// Get the transcription orchestrator
		const orchestrator = getTranscriptionOrchestrator();

		// Prepare orchestrator options
		const options: OrchestratorOptions = {
			language,
			diarize: true,
			wordTimestamps: true,
		};

		// Transcribe the media through orchestrator
		const response = await orchestrator.transcribe(url, options);

		return response.segments;
	} catch (error) {
		// Handle transcription errors
		if (error instanceof TranscriptionError) {
			console.error(`Transcription error: ${error.type}`, error.message);

			// Map specific error types to user-friendly messages
			switch (error.type) {
				case TranscriptionErrorType.AUTHENTICATION_ERROR:
					throw new Error(
						"Transcription service authentication failed. Please check API configuration.",
					);
				case TranscriptionErrorType.QUOTA_EXCEEDED:
					throw new Error(
						"Transcription quota exceeded. Please try again later.",
					);
				case TranscriptionErrorType.UNSUPPORTED_FORMAT:
					throw new Error("Media format not supported for transcription.");
				case TranscriptionErrorType.LANGUAGE_NOT_SUPPORTED:
					throw new Error(
						`Language '${language}' is not supported for transcription.`,
					);
				default:
					throw new Error("Transcription failed. Please try again.");
			}
		}

		// Log unexpected errors
		console.error("Unexpected transcription error:", error);
		throw new Error("An unexpected error occurred during transcription.");
	}
}
