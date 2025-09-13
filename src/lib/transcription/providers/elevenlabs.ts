/**
 * ElevenLabs Transcription Service Provider
 * Implementation of TranscriptionService using ElevenLabs API
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { BaseTranscriptionService } from "../interface";
import {
	TranscriptionOptions,
	TranscriptionResponse,
	TranscriptionError,
	TranscriptionErrorType,
	LanguageCode,
	SUPPORTED_TRANSCRIPTION_FORMATS,
} from "../types";
import { TranscriptSegment } from "@/features/editor/transcript/types";

/**
 * ElevenLabs specific configuration
 */
interface ElevenLabsConfig {
	apiKey: string;
	modelId?: string;
}

/**
 * ElevenLabs implementation of the TranscriptionService
 */
export class ElevenLabsTranscriptionService extends BaseTranscriptionService {
	private client: ElevenLabsClient;
	private modelId: string;

	constructor(config: ElevenLabsConfig) {
		super();

		if (!config.apiKey) {
			throw new TranscriptionError(
				TranscriptionErrorType.AUTHENTICATION_ERROR,
				"ElevenLabs API key is required"
			);
		}

		this.client = new ElevenLabsClient({
			apiKey: config.apiKey,
		});

		this.modelId = config.modelId || "scribe_v1";

		// Set ElevenLabs specific limits
		this.maxFileSizeMB = 100; // ElevenLabs supports up to 100MB
		this.supportedFormats = [...SUPPORTED_TRANSCRIPTION_FORMATS];

		// ElevenLabs supported languages
		// Note: This list should be updated based on ElevenLabs documentation
		this.supportedLanguages = [
			"en",
			"es",
			"fr",
			"de",
			"it",
			"pt",
			"nl",
			"pl",
			"ru",
			"zh",
			"ja",
			"ko",
		] as LanguageCode[];
	}

	async transcribe(
		input: Blob | string,
		options: TranscriptionOptions
	): Promise<TranscriptionResponse> {
		try {
			// Validate language if provided
			if (options.language) {
				this.validateLanguage(options.language);
			}

			// Convert URL to Blob if needed
			let audioBlob: Blob;
			if (typeof input === "string") {
				audioBlob = await this.urlToBlob(input);
			} else {
				audioBlob = input;
			}

			// Validate input
			await this.validateInput(audioBlob);

			// Call ElevenLabs API
			const transcription = await this.client.speechToText.convert({
				file: audioBlob,
				modelId: options.modelId || this.modelId,
				tagAudioEvents: true,
				languageCode: options.language || "en",
				diarize: options.diarize !== false, // Default to true
				...options.providerOptions, // Allow provider-specific options
			});

			// Process and convert response
			if ("words" in transcription && transcription.words) {
				const segments = this.convertToSegments(transcription.words as any[]);
				
				return {
					segments,
					detectedLanguage: options.language,
					metadata: {
						provider: "elevenlabs",
						modelId: this.modelId,
					},
				};
			}

			throw new TranscriptionError(
				TranscriptionErrorType.PROVIDER_ERROR,
				"Invalid response format from ElevenLabs"
			);
		} catch (error) {
			// Handle and wrap errors
			if (error instanceof TranscriptionError) {
				throw error;
			}

			if (error instanceof Error) {
				// Check for specific error types
				if (error.message.includes("401") || error.message.includes("403")) {
					throw new TranscriptionError(
						TranscriptionErrorType.AUTHENTICATION_ERROR,
						"Invalid or expired API key",
						error
					);
				}

				if (error.message.includes("429")) {
					throw new TranscriptionError(
						TranscriptionErrorType.QUOTA_EXCEEDED,
						"API rate limit exceeded",
						error
					);
				}

				if (error.message.includes("network") || error.message.includes("fetch")) {
					throw new TranscriptionError(
						TranscriptionErrorType.NETWORK_ERROR,
						"Network error during transcription",
						error
					);
				}

				throw new TranscriptionError(
					TranscriptionErrorType.PROVIDER_ERROR,
					`ElevenLabs transcription failed: ${error.message}`,
					error
				);
			}

			throw new TranscriptionError(
				TranscriptionErrorType.PROVIDER_ERROR,
				"Unknown error during transcription"
			);
		}
	}

	/**
	 * Convert ElevenLabs response to standard TranscriptSegment format
	 */
	private convertToSegments(words: any[]): TranscriptSegment[] {
		return words.map((word: any, index: number) => ({
			id: word.id || `seg-${index + 1}`,
			text: word.text || "",
			start: word.start * 1000, // Convert seconds to milliseconds
			end: word.end * 1000, // Convert seconds to milliseconds
			type: word.type || "word",
			speaker_id: word.speaker_id || null,
			logprob: word.logprob || 0,
			characters: word.characters || null,
		}));
	}

	getProviderName(): string {
		return "ElevenLabs";
	}

	async isAvailable(): Promise<boolean> {
		try {
			// Attempt a simple API call to check availability
			// You might want to implement a specific health check endpoint
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get ElevenLabs-specific model options
	 */
	getAvailableModels(): string[] {
		return ["scribe_v1", "scribe_v2"]; // Update based on ElevenLabs offerings
	}

	/**
	 * Override to add ElevenLabs-specific validation
	 */
	async validateInput(input: Blob | string): Promise<void> {
		await super.validateInput(input);

		if (typeof input !== "string") {
			// Additional ElevenLabs-specific validations
			// For example, check audio duration limits
			// This would require decoding the audio which might be expensive
			// So we'll rely on the API to return appropriate errors
		}
	}
}