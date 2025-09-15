/**
 * Transcription Orchestrator
 * Central coordinator for transcription workflow with optional LLM enhancement
 */

import { TranscriptSegment } from "@/features/editor/transcript/types";
import { processArticle } from "../llm";
import { EDUSResult } from "../llm/types";
import type { TranscriptionService } from "./interface";
import {
	TranscriptionError,
	TranscriptionErrorType,
	getTranscriptionService,
} from "./server";
import { TranscriptionOptions, TranscriptionResponse } from "./types";

const SPACING_DELETE_THRESHOLD_SECONDS = 400;

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
	// Transcription result
	segments: TranscriptSegment[];

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

			console.log(
				"DEBUG: Transcription response length:",
				response.segments.length,
			);

			// LLM process the article from article to edus
			const edus = await splitArticleIntoEDUs(response.segments);

			// Reconstructure the edus with the original transcription
			const reconstructuredSegments = reconstructureEdus(
				edus,
				response.segments,
			);
			// console.log("Reconstructured segments:", reconstructuredSegments);

			// Return transcription result with metadata
			return {
				segments: reconstructuredSegments,
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

		// post process the transcript
		for (const segment of response.segments) {
			if (segment.type === "spacing") {
				const duration = segment.end - segment.start;
				if (duration < SPACING_DELETE_THRESHOLD_SECONDS) {
					console.log("DEBUG: detected spacing segment:", segment);
				}
			}
		}

		const postProcessedSegments = postProcessTranscript(response.segments);
		console.log(
			"DEBUG: Post processed segments length:",
			postProcessedSegments.length,
		);

		return {
			...response,
			segments: postProcessedSegments,
		};
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

function getPureArticle(segments: TranscriptSegment[]): string {
	if (!segments || segments.length === 0) {
		throw new Error("No segments provided");
	}

	return segments
		.filter((segment) => segment.type === "word")
		.map((segment) => segment.text)
		.join("");
}

async function splitArticleIntoEDUs(
	segments: TranscriptSegment[],
): Promise<EDUSResult> {
	const article = getPureArticle(segments);
	if (!article) {
		throw new Error("No article provided");
	}

	return await processArticle(article, segments);
}

export function reconstructureEdus(
	edus: EDUSResult,
	segments: TranscriptSegment[],
): TranscriptSegment[] {
	if (!edus || !segments) {
		throw new Error("No edus or segments provided");
	}

	console.log("DEBUG: Starting reconstructureEdus");
	console.log(`  - EDUs count: ${edus.edus.length}`);
	console.log(`  - Segments count: ${segments.length}`);
	console.log(`  - First EDU: "${edus.edus[0]?.content}"`);

	// First, create a mapping of word positions to EDU indices
	const wordToEduMap = new Map<number, number>();
	let currentEduIndex = 0;
	let accumulatedText = "";

	// Build the mapping
	for (let i = 0; i < segments.length; i++) {
		if (segments[i].type === "word") {
			const wordText = segments[i].text;
			const currentEdu = edus.edus[currentEduIndex];

			if (!currentEdu) {
				console.error(
					`DEBUG: No more EDUs at index ${currentEduIndex}, breaking`,
				);
				throw new Error(`No more EDUs at index ${currentEduIndex}, breaking`);
			}

			// Check if this word belongs to the current EDU
			const potentialText = accumulatedText + wordText;

			if (
				currentEdu.content.includes(potentialText) ||
				currentEdu.content === potentialText
			) {
				wordToEduMap.set(i, currentEduIndex);
				accumulatedText = potentialText;

				// If we've completed the current EDU, move to the next
				if (accumulatedText === currentEdu.content) {
					console.log(
						`DEBUG: Completed EDU ${currentEduIndex}: "${currentEdu.content}"`,
					);
					currentEduIndex++;
					accumulatedText = "";
				}
			} else {
				console.error(
					`DEBUG ERROR: Word "${wordText}" doesn't match EDU ${currentEduIndex}`,
				);
				console.error(`  - Accumulated: "${accumulatedText}"`);
				console.error(`  - Potential: "${potentialText}"`);
				console.error(`  - EDU content: "${currentEdu.content}"`);
				throw new Error(
					`Word "${wordText}" doesn't match EDU ${currentEduIndex}`,
				);
			}
		}
	}

	console.log(
		`DEBUG: Mapping complete. Mapped ${wordToEduMap.size} words to EDUs`,
	);

	// Now reconstruct segments maintaining order
	const finalSegments: TranscriptSegment[] = [];
	let segmentIndex = 0;
	let i = 0;

	while (i < segments.length) {
		const segment = segments[i];

		if (segment.type !== "word") {
			// Pass through non-word segments unchanged
			finalSegments.push({
				...segment,
				id: `segment-${segmentIndex}`,
			});
			segmentIndex++;
			i++;
		} else {
			// For word segments, check if we should merge consecutive words
			const eduIndex = wordToEduMap.get(i);

			if (eduIndex === undefined) {
				// Word not mapped to any EDU
				console.error(`DEBUG ERROR: Word at index ${i} not mapped to any EDU`);
				console.error(`  - Word text: "${segment.text}"`);
				console.error(`  - Word type: "${segment.type}"`);
				console.error(`  - Word position: ${segment.start}-${segment.end}`);
				throw new Error(
					`Word not mapped to any EDU: "${segment.text}" at index ${i}`,
				);
			}
			// Accumulate consecutive words from the same EDU
			const wordsToMerge: TranscriptSegment[] = [segment];
			let j = i + 1;

			while (
				j < segments.length &&
				segments[j].type === "word" &&
				wordToEduMap.get(j) === eduIndex
			) {
				wordsToMerge.push(segments[j]);
				j++;
			}

			// Create merged segment
			const firstWord = wordsToMerge[0];
			const lastWord = wordsToMerge[wordsToMerge.length - 1];
			const mergedText = wordsToMerge.map((w) => w.text).join("");

			finalSegments.push({
				id: `segment-${segmentIndex}`,
				type: "word",
				text: mergedText,
				start: firstWord.start,
				end: lastWord.end,
				speaker_id: firstWord.speaker_id,
				logprob: firstWord.logprob,
				characters: firstWord.characters,
			});
			segmentIndex++;
			i = j; // Skip the merged words
		}
	}

	return finalSegments;
}

export function postProcessTranscript(
	segments: TranscriptSegment[],
): TranscriptSegment[] {
	// if the segment is spacing and the duration is less than 0.2, half divide the duration and add to previous segment and the next segment. Delete this one.
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		if (segment.type === "spacing") {
			const duration = segment.end - segment.start;
			if (duration < SPACING_DELETE_THRESHOLD_SECONDS) {
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

	// if the segment.text first character is punctuation/symbol/space, remove it
	const punctuationRegex = /^[\s\p{P}\p{S}]+/u; // Matches spaces, punctuation, and symbols at start

	for (const segment of segments) {
		if (segment.type === "word" && segment.text && segment.text.length > 1) {
			// Remove leading punctuation/symbols/spaces
			segment.text = segment.text.replace(punctuationRegex, "");
		}
	}

	return segments;
}
