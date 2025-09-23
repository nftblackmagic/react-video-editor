import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Only initialize database if POSTGRES_URL is set
let dbConnection: ReturnType<typeof drizzle> | null = null;

if (process.env.POSTGRES_URL) {
	try {
		const connectionString = process.env.POSTGRES_URL;
		const client = postgres(connectionString);
		dbConnection = drizzle(client, { schema });
	} catch (error) {
		console.error("Failed to initialize database connection:", error);
	}
}

// Throw error if db is not initialized when used
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(_, prop) {
		if (!dbConnection) {
			throw new Error("Database connection not initialized. Please check your POSTGRES_URL environment variable.");
		}
		return dbConnection[prop as keyof typeof dbConnection];
	},
});
