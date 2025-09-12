/**
 * Bytescale URL Helper
 * Simple URL generation for Bytescale uploads
 */

interface BytescaleConfig {
	accountId: string;
	apiKey: string;
}

/**
 * Get Bytescale configuration from environment variables
 */
export function getBytescaleConfig(): BytescaleConfig {
	const accountId = process.env.BYTESCALE_ACCOUNT_ID;
	const apiKey = process.env.BYTESCALE_API_KEY;

	if (!accountId || !apiKey) {
		throw new Error(
			"Bytescale configuration missing. Please set BYTESCALE_ACCOUNT_ID and BYTESCALE_API_KEY environment variables.",
		);
	}

	return { accountId, apiKey };
}

/**
 * Generate batch upload URLs for multiple files
 */
export function generateBatchUploadUrls(
	fileNames: string[],
	folder?: string,
): Array<{
	fileName: string;
	filePath: string;
	uploadUrl: string;
	viewUrl: string;
}> {
	const config = getBytescaleConfig();

	const results = fileNames.map((fileName) => {
		const filePath = folder ? `${folder}/${fileName}` : fileName;

		// Simple URL construction without encoding the path separators
		const uploadUrl = `https://upcdn.io/${config.accountId}/raw/${filePath}`;
		const viewUrl = `https://upcdn.io/${config.accountId}/raw/${filePath}`;

		return {
			fileName,
			filePath,
			uploadUrl,
			viewUrl,
		};
	});

	return results;
}

/**
 * Extract content type from file name
 */
export function getContentTypeFromFileName(fileName: string): string {
	const extension = fileName.split(".").pop()?.toLowerCase();

	const mimeTypes: Record<string, string> = {
		// Video
		mp4: "video/mp4",
		webm: "video/webm",
		ogg: "video/ogg",
		mov: "video/quicktime",
		avi: "video/x-msvideo",

		// Audio
		mp3: "audio/mpeg",
		wav: "audio/wav",
		m4a: "audio/mp4",
		aac: "audio/aac",

		// Image
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		svg: "image/svg+xml",

		// Default
		default: "application/octet-stream",
	};

	return mimeTypes[extension || ""] || mimeTypes.default;
}
