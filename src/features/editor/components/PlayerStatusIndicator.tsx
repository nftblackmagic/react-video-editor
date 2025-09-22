import { usePlayerMountStatus } from "../hooks/use-player-mount-status";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

/**
 * Visual indicator showing Remotion Player mount status
 * Helps debug player mounting issues after page refresh
 */
export const PlayerStatusIndicator = () => {
	const { status, isReady, availableMethods, errorMessage } =
		usePlayerMountStatus();

	// Only show indicator in development mode or when there's an issue
	if (process.env.NODE_ENV === "production" && isReady) {
		return null;
	}

	return (
		<div className="fixed bottom-4 right-4 z-50 p-3 rounded-lg bg-background border shadow-lg max-w-xs">
			<div className="flex items-center gap-2">
				{status === "not-mounted" && (
					<>
						<AlertCircle className="w-5 h-5 text-yellow-500" />
						<span className="text-sm">Player not mounted</span>
					</>
				)}
				{status === "mounting" && (
					<>
						<Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
						<span className="text-sm">Mounting player...</span>
					</>
				)}
				{status === "ready" && (
					<>
						<CheckCircle className="w-5 h-5 text-green-500" />
						<span className="text-sm">Player ready</span>
					</>
				)}
				{status === "error" && (
					<>
						<AlertCircle className="w-5 h-5 text-red-500" />
						<span className="text-sm text-red-500">{errorMessage}</span>
					</>
				)}
			</div>

			{/* Show method count in development */}
			{process.env.NODE_ENV === "development" && status === "ready" && (
				<div className="mt-2 text-xs text-muted-foreground">
					{availableMethods.length} methods available
				</div>
			)}

			{/* Show warning if player isn't ready but user might try to interact */}
			{!isReady && (
				<div className="mt-2 text-xs text-yellow-600">
					⚠️ Audio playback may not work until player is ready
				</div>
			)}
		</div>
	);
};

export default PlayerStatusIndicator;
