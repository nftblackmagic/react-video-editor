import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface UploadUrlRequest {
	userId: string;
	urls: string[];
}

interface UploadResponse {
	fileName: string;
	filePath: string;
	contentType: string;
	originalUrl: string;
	folder?: string;
	url: string;
}

export async function POST(request: NextRequest) {
	try {
		const body: UploadUrlRequest = await request.json();
		const { userId, urls } = body;

		if (!userId) {
			return NextResponse.json(
				{ error: "userId is required" },
				{ status: 400 },
			);
		}

		if (!urls || !Array.isArray(urls) || urls.length === 0) {
			return NextResponse.json(
				{ error: "urls array is required and must not be empty" },
				{ status: 400 },
			);
		}

		// Get Bytescale configuration
		const accountId = process.env.BYTESCALE_ACCOUNT_ID;
		const apiKey = process.env.BYTESCALE_API_KEY;

		if (!accountId || !apiKey) {
			console.error("Bytescale configuration missing");
			return NextResponse.json(
				{
					error: "Server configuration error",
					details: "Upload service not configured",
				},
				{ status: 503 },
			);
		}

		// Generate folder path using userId and timestamp
		const timestamp = Date.now();
		const folderPath = `/uploads/${userId}/${timestamp}`;

		// Process each URL using Bytescale's UploadFromUrl API
		const uploadPromises = urls.map(async (url, index) => {
			try {
				// Extract filename from URL or generate one
				const urlObj = new URL(url);
				const pathParts = urlObj.pathname.split("/");
				let fileName = pathParts[pathParts.length - 1] || `file-${index}`;

				// If no extension, we'll let Bytescale handle it
				if (!fileName.includes(".")) {
					fileName = `media-${timestamp}-${index}`;
				}

				// Use Bytescale's UploadFromUrl API
				const baseUrl = "https://api.bytescale.com";
				const uploadPath = `/v2/accounts/${accountId}/uploads/url`;

				const requestBody = {
					url: url,
					fileName: fileName,
					folderPath: folderPath,
					metadata: {
						originalUrl: url,
						userId,
						uploadedAt: new Date().toISOString(),
					},
				};

				const uploadResponse = await axios.post(
					`${baseUrl}${uploadPath}`,
					requestBody,
					{
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${apiKey}`,
						},
					},
				);

				return {
					fileName: fileName,
					filePath: uploadResponse.data.filePath,
					contentType: "application/octet-stream", // Bytescale will determine the actual type
					originalUrl: url,
					folder: folderPath,
					url: uploadResponse.data.fileUrl,
				};
			} catch (error) {
				// Log error but don't fail entire batch
				console.error(`Failed to process URL ${url}:`, error);
				// Return null for failed uploads
				return null;
			}
		});

		const results = await Promise.all(uploadPromises);

		// Filter out failed uploads (null values) and ensure type safety
		const uploads: UploadResponse[] = results
			.filter((result) => result !== null)
			.map((result) => result as UploadResponse);

		if (uploads.length === 0) {
			console.error("All URL uploads failed");
			return NextResponse.json(
				{
					error: "All uploads failed",
					details: "Unable to process any of the provided URLs",
				},
				{ status: 400 },
			);
		}

		return NextResponse.json({
			success: true,
			uploads: uploads,
		});
	} catch (error) {
		console.error("Error in upload URL route:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
