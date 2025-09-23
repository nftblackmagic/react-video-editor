/**
 * Authentication related constants
 *
 * TODO: This file contains temporary demo authentication constants
 * In production, these should be replaced with real authentication
 */

/**
 * Demo user UUID for development/testing
 *
 * TODO: Remove this in production
 * This user is created by running `pnpm db:seed`
 *
 * In production, users should be authenticated through:
 * - NextAuth.js
 * - Clerk
 * - Auth0
 * - Supabase Auth
 * - Or another authentication provider
 */
export const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * TODO: Implement proper user authentication
 *
 * Example implementation with NextAuth:
 * ```typescript
 * import { getServerSession } from "next-auth";
 * import { authOptions } from "@/lib/auth";
 *
 * export async function getCurrentUserId() {
 *   const session = await getServerSession(authOptions);
 *   return session?.user?.id || null;
 * }
 * ```
 */
export async function getCurrentUserId(): Promise<string | null> {
	// TODO: Replace with real authentication
	return DEMO_USER_ID;
}

/**
 * TODO: Implement authentication check
 *
 * @returns true if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
	// TODO: Replace with real authentication check
	return true; // Always return true for demo
}

/**
 * TODO: Implement user session retrieval
 *
 * @returns User session object or null
 */
export async function getUserSession() {
	// TODO: Replace with real session retrieval
	return {
		user: {
			id: DEMO_USER_ID,
			email: "demo@example.com",
			name: "Demo User",
		},
	};
}