#!/usr/bin/env tsx
/**
 * Seed script to create demo user in the database
 * Run this once to ensure the demo user exists
 *
 * TODO: This is temporary for development/demo purposes
 * In production, users should be created through proper authentication flow
 */

// Load environment variables FIRST
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Now we can import database modules
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user } from "../src/db/schema";
import { eq } from "drizzle-orm";

// TODO: Remove this demo user in production
const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

async function seedDemoUser() {
	// Create database connection here after env vars are loaded
	const connectionString = process.env.POSTGRES_URL;
	if (!connectionString) {
		throw new Error("POSTGRES_URL environment variable is not set");
	}

	const client = postgres(connectionString);
	const db = drizzle(client);

	try {
		// Check if demo user already exists
		const [existingUser] = await db
			.select()
			.from(user)
			.where(eq(user.id, DEMO_USER_ID))
			.limit(1);

		if (existingUser) {
			console.log("Demo user already exists");
			await client.end();
			return;
		}

		// Create demo user
		const [demoUser] = await db
			.insert(user)
			.values({
				id: DEMO_USER_ID,
				email: "demo@example.com",
				username: "demo",
				password: null, // No password for demo user
				provider: "demo",
			})
			.returning();

		console.log("Demo user created successfully:", demoUser);
		await client.end();
	} catch (error) {
		console.error("Error creating demo user:", error);
		await client.end();
		process.exit(1);
	}
}

// Run the seed
seedDemoUser()
	.then(() => {
		console.log("Seed completed");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Seed failed:", error);
		process.exit(1);
	});
