/**
 * LLM Service
 * Server-only exports for LLM operations
 */

// Only enforce server-only in production builds
// This allows tsx scripts to work in development
if (process.env.NODE_ENV === "production") {
	require("server-only");
}

// Export text operations
export { processArticle } from "./operations/text-operations";

// Export types (these are safe for client as they're just TypeScript types)
// export type { ParagraphSplitResult } from "./types";

// Namespace exports for organized access
export * as TextOps from "./operations/text-operations";
