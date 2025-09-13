import { NextRequest, NextResponse } from "next/server";
import {
	generateUploadFolder,
	getContentTypeFromFileName,
} from "@/utils/bytescale";

interface PresignRequest {
	userId: string;
	fileNames: string[];
}

interface PresignResponse {
	fileName: string;
	filePath: string;
	contentType: string;
	presignedUrl: string;
	folder?: string;
	url: string;
}

export async function POST(request: NextRequest) {
	try {
		const body: PresignRequest = await request.json();
		const { userId, fileNames } = body;

		if (!userId) {
			console.error("Presign request missing userId");
			return NextResponse.json(
				{ error: "userId is required" },
				{ status: 400 },
			);
		}

		if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
			console.error("Presign request missing or invalid fileNames");
			return NextResponse.json(
				{ error: "fileNames array is required and must not be empty" },
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
					error: "Bytescale configuration error",
					details:
						"Please ensure BYTESCALE_ACCOUNT_ID and BYTESCALE_API_KEY are properly configured",
				},
				{ status: 503 },
			);
		}

		// Generate folder path for this upload batch
		const folderPath = generateUploadFolder(userId);

		try {
			// Return upload configuration for client-side uploads
			// The client will use this info to upload directly to Bytescale
			const uploads: PresignResponse[] = fileNames.map((fileName) => {
				const filePath = `${folderPath}/${fileName}`;

				// For Bytescale, we don't need presigned URLs
				// The client will use the API directly with the bearer token
				// We return the expected file paths and URLs
				return {
					fileName: fileName,
					filePath: filePath,
					contentType: getContentTypeFromFileName(fileName),
					presignedUrl: `https://api.bytescale.com/v2/accounts/${accountId}/uploads/binary`,
					folder: folderPath,
					url: `https://upcdn.io/${accountId}/raw${filePath}`,
				};
			});

			return NextResponse.json({
				success: true,
				uploads: uploads,
				// Include config for client-side direct upload
				config: {
					accountId,
					folderPath,
				},
			});
		} catch (error) {
			console.error("Failed to generate upload configuration:", error);
			throw error;
		}
	} catch (error) {
		console.error("Error in presign route:", error);
		// Don't expose internal error details to client in production
		const errorMessage = "Failed to generate upload URL";

		return NextResponse.json(
			{
				error: "Internal server error",
				details: errorMessage,
			},
			{ status: 500 },
		);
	}
}
