import { db } from "../index";
import {
  transcriptions,
  uploads,
  type Transcription,
  type NewTranscription,
} from "../schema";
import { eq, desc, and, inArray } from "drizzle-orm";

// ==================== TRANSCRIPTION QUERIES ====================

/**
 * Create a new transcription
 */
export async function createTranscription(data: NewTranscription) {
  const [transcription] = await db
    .insert(transcriptions)
    .values(data)
    .returning();
  return transcription;
}

/**
 * Get transcription by ID
 */
export async function getTranscriptionById(id: string) {
  const [transcription] = await db
    .select()
    .from(transcriptions)
    .where(eq(transcriptions.id, id))
    .limit(1);
  return transcription;
}

/**
 * Get transcription by upload ID
 */
export async function getTranscriptionByUploadId(uploadId: string) {
  const [transcription] = await db
    .select()
    .from(transcriptions)
    .where(eq(transcriptions.uploadId, uploadId))
    .orderBy(desc(transcriptions.createdAt))
    .limit(1);
  return transcription;
}

/**
 * Get all transcriptions for a project
 */
export async function getProjectTranscriptions(projectId: string) {
  return await db
    .select({
      transcription: transcriptions,
      upload: uploads,
    })
    .from(transcriptions)
    .innerJoin(uploads, eq(transcriptions.uploadId, uploads.id))
    .where(eq(uploads.projectId, projectId))
    .orderBy(desc(transcriptions.createdAt));
}

/**
 * Update transcription
 */
export async function updateTranscription(
  id: string,
  data: Partial<Omit<Transcription, "id" | "createdAt" | "uploadId">>
) {
  const [updated] = await db
    .update(transcriptions)
    .set(data)
    .where(eq(transcriptions.id, id))
    .returning();
  return updated;
}

/**
 * Update transcription status
 */
export async function updateTranscriptionStatus(
  id: string,
  status: "pending" | "processing" | "completed" | "failed",
  errorMessage?: string
) {
  const updateData: any = { status };
  
  if (status === "completed") {
    updateData.completedAt = new Date();
  }
  
  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }

  return await updateTranscription(id, updateData);
}

/**
 * Update transcription segments
 */
export async function updateTranscriptionSegments(
  id: string,
  segments: Array<{
    id: string;
    text: string;
    start: number;
    end: number;
    speaker_id?: string;
    confidence?: number;
  }>
) {
  // Calculate word count and duration from segments
  const wordCount = segments.reduce(
    (count, seg) => count + seg.text.split(/\s+/).length,
    0
  );
  const duration = segments.length > 0 
    ? segments[segments.length - 1].end 
    : 0;

  return await updateTranscription(id, {
    segments,
    wordCount,
    duration,
    status: "completed",
    completedAt: new Date(),
  });
}

/**
 * Delete transcription
 */
export async function deleteTranscription(id: string) {
  const [deleted] = await db
    .delete(transcriptions)
    .where(eq(transcriptions.id, id))
    .returning();
  return deleted;
}

/**
 * Delete transcriptions by upload IDs
 */
export async function deleteTranscriptionsByUploadIds(uploadIds: string[]) {
  return await db
    .delete(transcriptions)
    .where(inArray(transcriptions.uploadId, uploadIds))
    .returning();
}

/**
 * Get pending transcriptions
 */
export async function getPendingTranscriptions(limit = 10) {
  return await db
    .select({
      transcription: transcriptions,
      upload: uploads,
    })
    .from(transcriptions)
    .innerJoin(uploads, eq(transcriptions.uploadId, uploads.id))
    .where(eq(transcriptions.status, "pending"))
    .orderBy(transcriptions.createdAt)
    .limit(limit);
}

/**
 * Get transcription statistics for a user
 */
export async function getUserTranscriptionStats(userId: string) {
  const userTranscriptions = await db
    .select({
      status: transcriptions.status,
      wordCount: transcriptions.wordCount,
      duration: transcriptions.duration,
    })
    .from(transcriptions)
    .innerJoin(uploads, eq(transcriptions.uploadId, uploads.id))
    .where(eq(uploads.userId, userId));

  const stats = {
    total: userTranscriptions.length,
    completed: userTranscriptions.filter((t) => t.status === "completed").length,
    processing: userTranscriptions.filter((t) => t.status === "processing").length,
    failed: userTranscriptions.filter((t) => t.status === "failed").length,
    totalWords: userTranscriptions.reduce((sum, t) => sum + (t.wordCount || 0), 0),
    totalDuration: userTranscriptions.reduce((sum, t) => sum + (t.duration || 0), 0),
  };

  return stats;
}

/**
 * Check if upload has transcription
 */
export async function uploadHasTranscription(uploadId: string) {
  const [result] = await db
    .select({ id: transcriptions.id })
    .from(transcriptions)
    .where(eq(transcriptions.uploadId, uploadId))
    .limit(1);
  return !!result;
}