#!/usr/bin/env tsx

import { rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const ROOT_DIR = path.join(__dirname, "..");

async function cleanupMediaCache() {
	console.log("🧹 Starting media cache cleanup...\n");

	const cleanupTargets = [
		// Next.js cache (includes cached images, videos, API responses)
		{
			path: path.join(ROOT_DIR, ".next/cache"),
			name: "Next.js cache",
		},
		// Browser localStorage cached in development
		{
			path: path.join(ROOT_DIR, ".next/server/app-paths"),
			name: "Next.js server cache",
		},
		// Public debug files
		{
			path: path.join(ROOT_DIR, "public/debug"),
			name: "Debug files",
		},
		// Debug directory in root
		{
			path: path.join(ROOT_DIR, "debug"),
			name: "Debug directory",
		},
		// Temporary upload directory if exists
		{
			path: path.join(ROOT_DIR, "tmp"),
			name: "Temporary files",
		},
		// Local SQLite database if exists
		{
			path: path.join(ROOT_DIR, "local.db"),
			name: "Local database",
		},
		// Drizzle migrations folder (optional - uncomment if you want to reset)
		// {
		//   path: path.join(ROOT_DIR, 'drizzle'),
		//   name: 'Drizzle migrations'
		// },
	];

	let totalCleaned = 0;

	for (const target of cleanupTargets) {
		if (existsSync(target.path)) {
			try {
				await rm(target.path, { recursive: true, force: true });
				console.log(`✅ Cleaned: ${target.name} (${target.path})`);
				totalCleaned++;
			} catch (error) {
				console.error(`❌ Failed to clean ${target.name}:`, error);
			}
		} else {
			console.log(`⏭️  Skipped: ${target.name} (not found)`);
		}
	}

	// Clear Zustand persisted storage (localStorage)
	console.log("\n📦 To clear browser localStorage (Zustand stores):");
	console.log("   Run this in browser console:");
	console.log("   localStorage.clear(); sessionStorage.clear();");
	console.log("   Or specifically for upload store:");
	console.log('   localStorage.removeItem("upload-store");');

	console.log(`\n✨ Cleanup complete! Cleaned ${totalCleaned} locations.`);
	console.log("\n💡 Tips:");
	console.log("   - Restart the dev server: pnpm dev");
	console.log(
		"   - Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)",
	);
	console.log("   - For production builds: pnpm build");
}

// Run cleanup
cleanupMediaCache().catch(console.error);
