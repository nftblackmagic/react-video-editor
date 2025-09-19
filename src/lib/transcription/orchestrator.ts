/**
 * Transcription Orchestrator
 * Central coordinator for transcription workflow with optional LLM enhancement
 */

import { TranscriptSegment } from "@/features/editor/transcript/types";
import { groupEDUs } from "../llm/operations/text-operations";
import { FullEDU } from "../llm/types";
import type { TranscriptionService } from "./interface";
import {
	TranscriptionError,
	TranscriptionErrorType,
	getTranscriptionService,
} from "./server";
import { TranscriptionOptions, TranscriptionResponse } from "./types";

/**
 * Options for orchestrated transcription workflow
 */
export interface OrchestratorOptions {
	// Core transcription options
	language: string;
	diarize?: boolean;
	wordTimestamps?: boolean;
	modelId?: string;
	providerOptions?: Record<string, any>;
}

/**
 * Response from orchestrated transcription
 */
export interface OrchestratorResponse {
	// Transcription result as Elementary Discourse Units
	edus: FullEDU[];

	// Processing metadata
	metadata?: {
		provider: string;
		processingTime?: number;
		duration?: number;
		detectedLanguage?: string;
	};

	// Non-fatal issues encountered during processing
	warnings?: string[];
}

/**
 * Orchestrates transcription workflow with optional LLM enhancement
 */
export class TranscriptionOrchestrator {
	private transcriptionService: TranscriptionService;

	constructor() {
		this.transcriptionService = getTranscriptionService();
	}

	/**
	 * Main entry point for orchestrated transcription
	 * Maybe the name should be transcribeAndProcess
	 */
	async transcribe(
		input: string | Blob,
		options: OrchestratorOptions,
	): Promise<OrchestratorResponse> {
		const startTime = Date.now();
		const warnings: string[] = [];

		try {
			// Get transcription from configured provider
			const response = await this.getTranscription(input, options);

			const segments = removeTooShortSegments(response.segments);

			// Group segments into Elementary Discourse Units (EDUs)
			const fullEDUs = await groupEDUs(segments);
			console.log(
				`Grouped ${segments.length} segments into ${fullEDUs.length} EDUs`,
			);

			// Return transcription result with metadata
			return {
				edus: fullEDUs,
				metadata: {
					provider: this.transcriptionService.getProviderName(),
					processingTime: Date.now() - startTime,
					duration: response.duration,
					detectedLanguage: response.detectedLanguage,
				},
				warnings,
			};
		} catch (error) {
			// Handle transcription errors
			if (error instanceof TranscriptionError) {
				throw error; // Re-throw transcription errors as-is
			}

			// Wrap unexpected errors
			throw new TranscriptionError(
				TranscriptionErrorType.PROVIDER_ERROR,
				"Orchestration failed",
				error,
			);
		}
	}

	/**
	 * Get transcription from configured provider
	 */
	private async getTranscription(
		input: string | Blob,
		options: OrchestratorOptions,
	): Promise<TranscriptionResponse> {
		// Map orchestrator options to transcription options
		const transcriptionOptions: TranscriptionOptions = {
			language: options.language,
			diarize: options.diarize,
			wordTimestamps: options.wordTimestamps,
			modelId: options.modelId,
			providerOptions: options.providerOptions,
		};

		// Call transcription service
		const response = await this.transcriptionService.transcribe(
			input,
			transcriptionOptions,
		);

		console.log(
			"DEBUG: Transcription response length:",
			response.segments.length,
		);

		return response;
	}

	/**
	 * Get provider information
	 */
	getProviderName(): string {
		return this.transcriptionService.getProviderName();
	}

	/**
	 * Check if service is available
	 */
	async isAvailable(): Promise<boolean> {
		return await this.transcriptionService.isAvailable();
	}
}

/**
 * Singleton instance
 */
let orchestratorInstance: TranscriptionOrchestrator | null = null;

/**
 * Get or create orchestrator instance
 */
export function getTranscriptionOrchestrator(): TranscriptionOrchestrator {
	if (!orchestratorInstance) {
		orchestratorInstance = new TranscriptionOrchestrator();
	}
	return orchestratorInstance;
}

function removeTooShortSegments(
	segments: TranscriptSegment[],
): TranscriptSegment[] {
	const SPACING_DELETE_THRESHOLD_MILLISECONDS = 400;
	// if the segment is spacing and the duration is less than 0.2, half divide the duration and add to previous segment and the next segment. Delete this one.
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		if (segment.type === "spacing") {
			const duration = segment.end - segment.start;
			if (duration < SPACING_DELETE_THRESHOLD_MILLISECONDS) {
				const halfDuration = duration / 2;
				if (i > 0) {
					segments[i - 1].end += halfDuration;
				}
				if (i < segments.length - 1) {
					segments[i + 1].start -= halfDuration;
				}
				segments.splice(i, 1);
				i--; // Adjust index after removal
			}
		}
	}
	return segments;
}
