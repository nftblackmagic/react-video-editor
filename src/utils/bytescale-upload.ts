/**
 * Bytescale Upload Service
 * Supports BasicUpload, FormDataUpload, and UploadFromUrl APIs
 */

interface BytescaleUploadParams {
	accountId: string;
	apiKey: string;
	file: File | Blob;
	fileName?: string;
	folderPath?: string;
	metadata?: Record<string, any>;
	onProgress?: (percent: number) => void;
}

interface BytescaleMultiUploadParams {
	accountId: string;
	apiKey: string;
	files: File[];
	folderPath?: string;
	metadata?: Record<string, any>;
	onProgress?: (percent: number) => void;
}

interface BytescaleUrlUploadParams {
	accountId: string;
	apiKey: string;
	url: string;
	fileName?: string;
	folderPath?: string;
	metadata?: Record<string, any>;
}

interface BytescaleUploadResponse {
	accountId: string;
	etag: string;
	filePath: string;
	fileUrl: string;
}

interface BytescaleFormDataResponse {
	files: Array<BytescaleUploadResponse & { formDataFieldName: string }>;
	errors: Array<{
		error: { code: string; message: string; timestamp: string };
		formDataFieldName: string;
	}>;
}

/**
 * Upload a file to Bytescale using the BasicUpload API
 */
export async function uploadToBytescale({
	accountId,
	apiKey,
	file,
	fileName,
	folderPath,
	metadata,
	onProgress,
}: BytescaleUploadParams): Promise<BytescaleUploadResponse> {
	const baseUrl = "https://api.bytescale.com";
	const path = `/v2/accounts/${accountId}/uploads/binary`;

	// Build query parameters
	const queryParams: Record<string, string> = {};

	if (fileName) {
		queryParams.fileName = fileName;
	} else if (file instanceof File) {
		queryParams.fileName = file.name;
	}

	if (folderPath) {
		queryParams.folderPath = folderPath;
	}

	// Original file name for tracking
	if (file instanceof File) {
		queryParams.originalFileName = file.name;
	}

	// Convert query params to string
	const queryString = Object.entries(queryParams)
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join("&");

	const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ""}`;

	// Prepare headers
	const headers: Record<string, string> = {
		Authorization: `Bearer ${apiKey}`,
	};

	if (metadata && Object.keys(metadata).length > 0) {
		headers["X-Upload-Metadata"] = JSON.stringify(metadata);
	}

	// Add content type if available
	if (file.type) {
		headers["Content-Type"] = file.type;
	}

	try {
		// Create XMLHttpRequest for progress tracking
		const response = await new Promise<BytescaleUploadResponse>(
			(resolve, reject) => {
				const xhr = new XMLHttpRequest();

				// Track upload progress
				if (onProgress) {
					xhr.upload.addEventListener("progress", (event) => {
						if (event.lengthComputable) {
							const percentComplete = Math.round(
								(event.loaded / event.total) * 100,
							);
							onProgress(percentComplete);
						}
					});
				}

				// Handle completion
				xhr.addEventListener("load", () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						try {
							const result = JSON.parse(xhr.responseText);
							resolve(result);
						} catch (error) {
							reject(new Error("Failed to parse response"));
						}
					} else {
						try {
							const error = JSON.parse(xhr.responseText);
							reject(
								new Error(`Bytescale API Error: ${JSON.stringify(error)}`),
							);
						} catch {
							reject(new Error(`Upload failed with status ${xhr.status}`));
						}
					}
				});

				// Handle errors
				xhr.addEventListener("error", () => {
					reject(new Error("Network error during upload"));
				});

				xhr.addEventListener("abort", () => {
					reject(new Error("Upload aborted"));
				});

				// Open and send request
				xhr.open("POST", url);

				// Set headers
				for (const [key, value] of Object.entries(headers)) {
					xhr.setRequestHeader(key, value);
				}

				// Send the file
				xhr.send(file);
			},
		);

		return response;
	} catch (error) {
		console.error("Bytescale upload error:", error);
		throw error;
	}
}

/**
 * Get Bytescale configuration from environment variables
 * For client-side code, use NEXT_PUBLIC_ prefixed variables
 * For server-side code, use regular environment variables
 */
export function getBytescaleConfig() {
	// Check if we're on the server or client
	const isServer = typeof window === "undefined";

	let accountId: string | undefined;
	let apiKey: string | undefined;

	if (isServer) {
		// Server-side: use regular env vars
		accountId = process.env.BYTESCALE_ACCOUNT_ID;
		apiKey = process.env.BYTESCALE_API_KEY;
	} else {
		// Client-side: use NEXT_PUBLIC_ prefixed vars
		accountId = process.env.NEXT_PUBLIC_BYTESCALE_ACCOUNT_ID;
		apiKey = process.env.NEXT_PUBLIC_BYTESCALE_API_KEY;
	}

	if (!accountId || !apiKey) {
		throw new Error(
			`Bytescale configuration missing. Please set ${isServer ? "BYTESCALE_ACCOUNT_ID and BYTESCALE_API_KEY" : "NEXT_PUBLIC_BYTESCALE_ACCOUNT_ID and NEXT_PUBLIC_BYTESCALE_API_KEY"} environment variables.`,
		);
	}

	return { accountId, apiKey };
}

/**
 * Upload multiple files using FormDataUpload API
 */
export async function uploadMultipleToBytescale({
	accountId,
	apiKey,
	files,
	folderPath,
	metadata,
	onProgress,
}: BytescaleMultiUploadParams): Promise<BytescaleFormDataResponse> {
	const baseUrl = "https://api.bytescale.com";
	const path = `/v2/accounts/${accountId}/uploads/form_data`;

	// Build query parameters
	const queryParams: Record<string, string> = {};
	if (folderPath) {
		queryParams.folderPath = folderPath;
	}

	const queryString = Object.entries(queryParams)
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join("&");

	const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ""}`;

	// Create FormData
	const formData = new FormData();
	for (const [index, file] of files.entries()) {
		formData.append(`file_${index}`, file, file.name);
	}

	// Prepare headers
	const headers: Record<string, string> = {
		Authorization: `Bearer ${apiKey}`,
	};

	if (metadata && Object.keys(metadata).length > 0) {
		headers["X-Upload-Metadata"] = JSON.stringify(metadata);
	}

	try {
		const response = await new Promise<BytescaleFormDataResponse>(
			(resolve, reject) => {
				const xhr = new XMLHttpRequest();

				// Track upload progress
				if (onProgress) {
					xhr.upload.addEventListener("progress", (event) => {
						if (event.lengthComputable) {
							const percentComplete = Math.round(
								(event.loaded / event.total) * 100,
							);
							onProgress(percentComplete);
						}
					});
				}

				// Handle completion
				xhr.addEventListener("load", () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						try {
							const result = JSON.parse(xhr.responseText);
							resolve(result);
						} catch (error) {
							reject(new Error("Failed to parse response"));
						}
					} else {
						try {
							const error = JSON.parse(xhr.responseText);
							reject(
								new Error(`Bytescale API Error: ${JSON.stringify(error)}`),
							);
						} catch {
							reject(new Error(`Upload failed with status ${xhr.status}`));
						}
					}
				});

				// Handle errors
				xhr.addEventListener("error", () => {
					reject(new Error("Network error during upload"));
				});

				xhr.addEventListener("abort", () => {
					reject(new Error("Upload aborted"));
				});

				// Open and send request
				xhr.open("POST", url);

				// Set headers
				for (const [key, value] of Object.entries(headers)) {
					xhr.setRequestHeader(key, value);
				}

				// Send the form data
				xhr.send(formData);
			},
		);

		return response;
	} catch (error) {
		console.error("Bytescale multi-upload error:", error);
		throw error;
	}
}

/**
 * Upload from URL using Bytescale's UploadFromUrl API
 */
export async function uploadFromUrl({
	accountId,
	apiKey,
	url,
	fileName,
	folderPath,
	metadata,
}: BytescaleUrlUploadParams): Promise<BytescaleUploadResponse> {
	const baseUrl = "https://api.bytescale.com";
	const path = `/v2/accounts/${accountId}/uploads/url`;

	const requestBody: any = { url };

	if (fileName) {
		requestBody.fileName = fileName;
	}

	if (folderPath) {
		requestBody.folderPath = folderPath;
	}

	if (metadata && Object.keys(metadata).length > 0) {
		requestBody.metadata = metadata;
	}

	try {
		const response = await fetch(`${baseUrl}${path}`, {
			method: "POST",
			body: JSON.stringify(requestBody),
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
		});

		const result = await response.json();

		if (!response.ok) {
			throw new Error(`Bytescale API Error: ${JSON.stringify(result)}`);
		}

		return result;
	} catch (error) {
		console.error("Bytescale URL upload error:", error);
		throw error;
	}
}

/**
 * Generate folder path for uploads
 */
export function generateUploadFolder(userId: string): string {
	const timestamp = Date.now();
	return `/uploads/${userId}/${timestamp}`;
}
