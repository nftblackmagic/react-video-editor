import UploadLanding from "@/features/upload/UploadLanding";
import * as projectActions from "@/app/(edit)/actions/projects";

// TODO: Replace with real authentication system
// Demo user UUID - replace with real auth when ready
// This is a valid UUID v4 that can be used in the database
const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

// TODO: Implement proper authentication
// Mock function to get current user - replace with real auth when ready
async function getCurrentUserId() {
	// TODO: In production, this would get the actual user from session/auth
	// Example: const session = await getSession();
	// return session?.user?.id || null;
	return DEMO_USER_ID;
}

export default async function Home() {
	// Get current user ID
	const userId = await getCurrentUserId();

	// Load user's projects from database
	const projectsResult = await projectActions.listUserProjects(userId, 20);
	const projects = projectsResult.success ? projectsResult.projects : [];

	return <UploadLanding initialProjects={projects} userId={userId} />;
}
