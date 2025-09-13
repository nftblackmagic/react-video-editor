/**
 * Transcription Service Interface
 * Abstract interface that all transcription providers must implement
 */

import {
	TranscriptionOptions,
	TranscriptionResponse,
	LanguageCode,
} from "./types";

/**
 * Abstract interface for transcription services
 * All transcription providers must implement this interface
 */
export interface TranscriptionService {
	/**
	 * Transcribe audio/video content
	 * @param input - Audio blob or URL to media file
	 * @param options - Transcription options
	 * @returns Promise with transcription segments
	 */
	transcribe(
		input: Blob | string,
		options: TranscriptionOptions,
	): Promise<TranscriptionResponse>;

	/**
	 * Get list of supported languages
	 * @returns Array of language codes supported by this provider
	 */
	getSupportedLanguages(): LanguageCode[];

	/**
	 * Check if a specific language is supported
	 * @param language - Language code to check
	 * @returns True if language is supported
	 */
	isLanguageSupported(language: string): boolean;

	/**
	 * Get maximum file size supported by the provider
	 * @returns Maximum file size in bytes
	 */
	getMaxFileSize(): number;

	/**
	 * Get supported media formats
	 * @returns Array of supported MIME types
	 */
	getSupportedFormats(): string[];

	/**
	 * Validate input before transcription
	 * @param input - Input to validate
	 * @throws TranscriptionError if validation fails
	 */
	validateInput(input: Blob | string): Promise<void>;

	/**
	 * Get provider name
	 * @returns Name of the transcription provider
	 */
	getProviderName(): string;

	/**
	 * Health check for the service
	 * @returns True if service is available
	 */
	isAvailable(): Promise<boolean>;
}

/**
 * Base abstract class for transcription services
 * Provides common functionality that providers can extend
 */
export abstract class BaseTranscriptionService implements TranscriptionService {
	protected maxFileSizeMB = 100; // Default 100MB
	protected supportedFormats: string[] = [];
	protected supportedLanguages: LanguageCode[] = [];

	abstract transcribe(
		input: Blob | string,
		options: TranscriptionOptions,
	): Promise<TranscriptionResponse>;

	abstract getProviderName(): string;

	getSupportedLanguages(): LanguageCode[] {
		return this.supportedLanguages;
	}

	isLanguageSupported(language: string): boolean {
		return this.supportedLanguages.includes(language as LanguageCode);
	}

	getMaxFileSize(): number {
		return this.maxFileSizeMB * 1024 * 1024; // Convert MB to bytes
	}

	getSupportedFormats(): string[] {
		return this.supportedFormats;
	}

	async validateInput(input: Blob | string): Promise<void> {
		if (typeof input === "string") {
			// URL validation
			try {
				new URL(input);
			} catch {
				throw new Error("Invalid URL provided");
			}
		} else {
			// Blob validation
			if (input.size > this.getMaxFileSize()) {
				throw new Error(`File size exceeds maximum of ${this.maxFileSizeMB}MB`);
			}

			if (
				this.supportedFormats.length > 0 &&
				!this.supportedFormats.includes(input.type)
			) {
				throw new Error(`Unsupported format: ${input.type}`);
			}
		}
	}

	async isAvailable(): Promise<boolean> {
		// Default implementation - can be overridden by providers
		return true;
	}

	/**
	 * Helper method to convert URL to Blob
	 */
	protected async urlToBlob(url: string): Promise<Blob> {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch media from URL: ${response.statusText}`);
		}
		return response.blob();
	}

	/**
	 * Helper method to validate language option
	 */
	protected validateLanguage(language: string): void {
		if (!this.isLanguageSupported(language)) {
			throw new Error(
				`Language '${language}' is not supported by ${this.getProviderName()}`,
			);
		}
	}
}
