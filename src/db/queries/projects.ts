import { db } from "../index";
import { projects, type Project, type NewProject } from "../schema";
import { eq, desc, and } from "drizzle-orm";

// ==================== PROJECT QUERIES ====================

/**
 * Create a new project
 */
export async function createProject(data: NewProject) {
	const [project] = await db.insert(projects).values(data).returning();
	return project;
}

/**
 * Get project by ID
 */
export async function getProjectById(id: string) {
	const [project] = await db
		.select()
		.from(projects)
		.where(eq(projects.id, id))
		.limit(1);
	return project;
}

/**
 * Get all projects for a user
 */
export async function getUserProjects(userId: string) {
	return await db
		.select()
		.from(projects)
		.where(eq(projects.userId, userId))
		.orderBy(desc(projects.updatedAt));
}

/**
 * Get public projects
 */
export async function getPublicProjects(limit = 20) {
	return await db
		.select()
		.from(projects)
		.where(eq(projects.isPublic, true))
		.orderBy(desc(projects.createdAt))
		.limit(limit);
}

/**
 * Update project
 */
export async function updateProject(
	id: string,
	data: Partial<Omit<Project, "id" | "createdAt">>,
) {
	const [updated] = await db
		.update(projects)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(projects.id, id))
		.returning();
	return updated;
}

/**
 * Update project timeline data (tracks, items, transitions)
 */
export async function updateProjectTimeline(
	id: string,
	timelineData: {
		tracks?: any[];
		trackItems?: Record<string, any>;
		transitions?: Record<string, any>;
		compositions?: any[];
		duration?: number;
	},
) {
	const [updated] = await db
		.update(projects)
		.set({
			...timelineData,
			updatedAt: new Date(),
		})
		.where(eq(projects.id, id))
		.returning();
	return updated;
}

/**
 * Delete project
 */
export async function deleteProject(id: string) {
	const [deleted] = await db
		.delete(projects)
		.where(eq(projects.id, id))
		.returning();
	return deleted;
}

/**
 * Check if user owns project
 */
export async function userOwnsProject(userId: string, projectId: string) {
	const [project] = await db
		.select({ id: projects.id })
		.from(projects)
		.where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
		.limit(1);
	return !!project;
}

/**
 * Duplicate a project
 */
export async function duplicateProject(projectId: string, userId: string) {
	const original = await getProjectById(projectId);
	if (!original) throw new Error("Project not found");

	const duplicate = await createProject({
		...original,
		id: undefined as any, // Let DB generate new ID
		userId,
		name: `${original.name} (Copy)`,
		status: "draft",
		isPublic: false,
		createdAt: undefined as any,
		updatedAt: undefined as any,
	});

	return duplicate;
}
