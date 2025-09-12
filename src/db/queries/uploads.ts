import { db } from "../index";
import { uploads, type Upload, type NewUpload } from "../schema";
import { eq, desc, and, inArray, or, like } from "drizzle-orm";

// ==================== UPLOAD QUERIES ====================

/**
 * Create a new upload record
 */
export async function createUpload(data: NewUpload) {
	const [upload] = await db.insert(uploads).values(data).returning();
	return upload;
}

/**
 * Create multiple upload records
 */
export async function createUploads(data: NewUpload[]) {
	return await db.insert(uploads).values(data).returning();
}

/**
 * Get upload by ID
 */
export async function getUploadById(id: string) {
	const [upload] = await db
		.select()
		.from(uploads)
		.where(eq(uploads.id, id))
		.limit(1);
	return upload;
}

/**
 * Get uploads by project
 */
export async function getProjectUploads(projectId: string) {
	return await db
		.select()
		.from(uploads)
		.where(eq(uploads.projectId, projectId))
		.orderBy(desc(uploads.createdAt));
}

/**
 * Get user's uploads
 */
export async function getUserUploads(
	userId: string,
	options?: {
		projectId?: string;
		fileType?: string;
		status?: string;
		limit?: number;
	},
) {
	const conditions = [eq(uploads.userId, userId)];

	if (options?.projectId) {
		conditions.push(eq(uploads.projectId, options.projectId));
	}

	if (options?.fileType) {
		conditions.push(like(uploads.fileType, `${options.fileType}%`));
	}

	if (options?.status) {
		conditions.push(eq(uploads.status, options.status));
	}

	const baseQuery = db
		.select()
		.from(uploads)
		.where(and(...conditions))
		.orderBy(desc(uploads.createdAt));

	if (options?.limit) {
		return await baseQuery.limit(options.limit);
	}

	return await baseQuery;
}

/**
 * Update upload
 */
export async function updateUpload(
	id: string,
	data: Partial<Omit<Upload, "id" | "createdAt" | "userId">>,
) {
	const [updated] = await db
		.update(uploads)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(uploads.id, id))
		.returning();
	return updated;
}

/**
 * Update upload status
 */
export async function updateUploadStatus(
	id: string,
	status: "processing" | "ready" | "failed",
	errorMessage?: string,
) {
	return await updateUpload(id, { status, errorMessage });
}

/**
 * Delete upload
 */
export async function deleteUpload(id: string) {
	const [deleted] = await db
		.delete(uploads)
		.where(eq(uploads.id, id))
		.returning();
	return deleted;
}

/**
 * Delete multiple uploads
 */
export async function deleteUploads(ids: string[]) {
	return await db.delete(uploads).where(inArray(uploads.id, ids)).returning();
}

/**
 * Get uploads by service IDs
 */
export async function getUploadsByServiceIds(serviceIds: string[]) {
	return await db
		.select()
		.from(uploads)
		.where(inArray(uploads.uploadServiceId, serviceIds));
}

/**
 * Get media stats for user
 */
export async function getUserMediaStats(userId: string) {
	const userUploads = await db
		.select({
			fileType: uploads.fileType,
			fileSize: uploads.fileSize,
		})
		.from(uploads)
		.where(eq(uploads.userId, userId));

	const stats = {
		totalFiles: userUploads.length,
		totalSize: userUploads.reduce((sum, u) => sum + (u.fileSize || 0), 0),
		byType: {
			videos: userUploads.filter((u) => u.fileType?.startsWith("video/"))
				.length,
			images: userUploads.filter((u) => u.fileType?.startsWith("image/"))
				.length,
			audio: userUploads.filter((u) => u.fileType?.startsWith("audio/")).length,
		},
	};

	return stats;
}

/**
 * Move uploads to project
 */
export async function moveUploadsToProject(
	uploadIds: string[],
	projectId: string,
) {
	return await db
		.update(uploads)
		.set({
			projectId,
			updatedAt: new Date(),
		})
		.where(inArray(uploads.id, uploadIds))
		.returning();
}
