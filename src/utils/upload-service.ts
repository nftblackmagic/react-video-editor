import axios from "axios";
import {
	uploadToBytescale,
	uploadMultipleToBytescale,
	uploadFromUrl,
	getBytescaleConfig,
	generateUploadFolder,
} from "./bytescale";

export type UploadProgressCallback = (
	uploadId: string,
	progress: number,
) => void;

export type UploadStatusCallback = (
	uploadId: string,
	status: "uploaded" | "failed",
	error?: string,
) => void;

export interface UploadCallbacks {
	onProgress: UploadProgressCallback;
	onStatus: UploadStatusCallback;
}

export async function processFileUpload(
	uploadId: string,
	file: File,
	callbacks: UploadCallbacks,
): Promise<any> {
	try {
		// Get Bytescale configuration
		const { accountId, apiKey } = getBytescaleConfig();
		const userId = "PJ1nkaufw0hZPyhN7bWCP";
		const folderPath = generateUploadFolder(userId);

		// Upload file directly to Bytescale using BasicUpload API
		const uploadResponse = await uploadToBytescale({
			accountId,
			apiKey,
			file,
			fileName: file.name,
			folderPath,
			metadata: {
				uploadId,
				userId,
				uploadedAt: new Date().toISOString(),
			},
			onProgress: (percent) => callbacks.onProgress(uploadId, percent),
		}).catch((error) => {
			console.error("Failed to upload file to Bytescale:", error);
			throw new Error("Failed to upload file. Please try again.");
		});

		// Construct upload data from Bytescale response
		const uploadData = {
			fileName: file.name,
			filePath: uploadResponse.filePath,
			fileSize: file.size,
			contentType: file.type || "application/octet-stream",
			metadata: {
				uploadedUrl: uploadResponse.fileUrl,
				bytescaleUrl: uploadResponse.fileUrl,
				etag: uploadResponse.etag,
			},
			folder: folderPath,
			type: file.type?.split("/")[0] || "unknown",
			method: "direct",
			origin: "user",
			status: "uploaded",
			isPreview: false,
			url: uploadResponse.fileUrl,
		};

		callbacks.onStatus(uploadId, "uploaded");
		return uploadData;
	} catch (error) {
		console.error(`Upload failed for file ${file.name}:`, error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		callbacks.onStatus(uploadId, "failed", errorMessage);
		// Don't throw - return null to indicate failure
		return null;
	}
}

export async function processUrlUpload(
	uploadId: string,
	url: string,
	callbacks: UploadCallbacks,
): Promise<any[]> {
	try {
		// Start with 10% progress
		callbacks.onProgress(uploadId, 10);

		// Upload URL
		const response = await axios
			.post(
				"/api/uploads/url",
				{
					userId: "PJ1nkaufw0hZPyhN7bWCP",
					urls: [url],
				},
				{
					headers: { "Content-Type": "application/json" },
				},
			)
			.catch((error) => {
				console.error("Failed to process URL upload:", error);
				throw new Error(
					"Failed to process URL. Please check the URL and try again.",
				);
			});

		const { uploads = [] } = response.data || {};

		if (!uploads || uploads.length === 0) {
			console.error("No upload data returned for URL:", url);
			throw new Error("Failed to process URL upload");
		}

		// Update to 50% progress
		callbacks.onProgress(uploadId, 50);

		// Construct upload data from uploads array
		const uploadDataArray = uploads.map((uploadInfo: any) => ({
			fileName: uploadInfo.fileName,
			filePath: uploadInfo.filePath,
			fileSize: 0,
			contentType: uploadInfo.contentType,
			metadata: {
				originalUrl: uploadInfo.originalUrl,
				bytescaleUrl: uploadInfo.url,
			},
			folder: uploadInfo.folder || null,
			type: uploadInfo.contentType.split("/")[0],
			method: "url",
			origin: "user",
			status: "uploaded",
			isPreview: false,
			url: uploadInfo.url,
		}));

		// Complete
		callbacks.onProgress(uploadId, 100);
		callbacks.onStatus(uploadId, "uploaded");
		return uploadDataArray;
	} catch (error) {
		console.error(`URL upload failed for ${url}:`, error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		callbacks.onStatus(uploadId, "failed", errorMessage);
		// Don't throw - return empty array to indicate failure
		return [];
	}
}

/**
 * Process multiple file uploads in a single request
 */
export async function processMultipleFileUploads(
	files: File[],
	callbacks: UploadCallbacks,
): Promise<any[]> {
	try {
		// Get Bytescale configuration
		const { accountId, apiKey } = getBytescaleConfig();
		const userId = "PJ1nkaufw0hZPyhN7bWCP";
		const folderPath = generateUploadFolder(userId);

		// Upload all files at once using FormDataUpload API
		const uploadResponse = await uploadMultipleToBytescale({
			accountId,
			apiKey,
			files,
			folderPath,
			metadata: {
				userId,
				uploadedAt: new Date().toISOString(),
				batchUpload: true,
			},
			onProgress: (percent) => {
				// Report progress for the entire batch
				files.forEach((_, index) => {
					callbacks.onProgress(`batch-${index}`, percent);
				});
			},
		}).catch((error) => {
			console.error("Failed to upload files to Bytescale:", error);
			throw new Error("Failed to upload files. Please try again.");
		});

		// Process successful uploads
		const uploadData = uploadResponse.files.map((file, index) => ({
			fileName: files[index].name,
			filePath: file.filePath,
			fileSize: files[index].size,
			contentType: files[index].type || "application/octet-stream",
			metadata: {
				uploadedUrl: file.fileUrl,
				bytescaleUrl: file.fileUrl,
				etag: file.etag,
				formDataFieldName: file.formDataFieldName,
			},
			folder: folderPath,
			type: files[index].type?.split("/")[0] || "unknown",
			method: "batch",
			origin: "user",
			status: "uploaded",
			isPreview: false,
			url: file.fileUrl,
		}));

		// Report success for each file
		uploadResponse.files.forEach((_, index) => {
			callbacks.onStatus(`batch-${index}`, "uploaded");
		});

		// Report errors if any
		if (uploadResponse.errors) {
			for (const error of uploadResponse.errors) {
				console.error(
					`Upload error for ${error.formDataFieldName}:`,
					error.error,
				);
			}
		}

		return uploadData;
	} catch (error) {
		console.error("Batch upload failed:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		files.forEach((_, index) => {
			callbacks.onStatus(`batch-${index}`, "failed", errorMessage);
		});
		return [];
	}
}

export async function processUpload(
	uploadId: string,
	upload: { file?: File; url?: string },
	callbacks: UploadCallbacks,
): Promise<any> {
	if (upload.file) {
		return await processFileUpload(uploadId, upload.file, callbacks);
	}
	if (upload.url) {
		return await processUrlUpload(uploadId, upload.url, callbacks);
	}
	callbacks.onStatus(uploadId, "failed", "No file or URL provided");
	throw new Error("No file or URL provided");
}
