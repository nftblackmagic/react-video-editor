import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	AlertTriangle,
	Info,
	Pause,
	Play,
	RefreshCw,
	Volume2,
	VolumeX,
} from "lucide-react";
import { useEffect, useState } from "react";
import useStore from "../store/use-store";

/**
 * Debug panel to show audio state and help diagnose playback issues
 * Shows audio sources, volume levels, and URL types
 */
export const AudioDebugPanel = () => {
	const { trackItemsMap, playerRef } = useStore();
	const [isPlaying, setIsPlaying] = useState(false);
	const [audioItems, setAudioItems] = useState<any[]>([]);
	const [hasBlobUrls, setHasBlobUrls] = useState(false);
	const [audioContextState, setAudioContextState] = useState<string>("unknown");

	// Extract audio items from track items
	useEffect(() => {
		const items = Object.values(trackItemsMap).filter(
			(item: any) => item.type === "audio",
		);
		setAudioItems(items);

		// Check for blob URLs
		const blobUrlsFound = items.some((item: any) =>
			item.details?.src?.startsWith("blob:"),
		);
		setHasBlobUrls(blobUrlsFound);
	}, [trackItemsMap]);

	// Monitor play state
	useEffect(() => {
		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);

		playerRef?.current?.addEventListener("play", handlePlay);
		playerRef?.current?.addEventListener("pause", handlePause);

		return () => {
			playerRef?.current?.removeEventListener("play", handlePlay);
			playerRef?.current?.removeEventListener("pause", handlePause);
		};
	}, [playerRef]);

	// Monitor audio context state
	useEffect(() => {
		const checkAudioContext = () => {
			// Check if AudioContext exists
			const AudioContext =
				window.AudioContext || (window as any).webkitAudioContext;
			if (AudioContext) {
				// Try to get the existing context or create one
				const ctx = new AudioContext();
				setAudioContextState(ctx.state);

				// Listen for state changes
				ctx.onstatechange = () => {
					setAudioContextState(ctx.state);
				};
			}
		};

		checkAudioContext();
		// Check again after user interaction
		window.addEventListener("click", checkAudioContext, { once: true });

		return () => {
			window.removeEventListener("click", checkAudioContext);
		};
	}, []);

	// Debug functions
	const handleDebugPlay = (event: React.MouseEvent<HTMLButtonElement>) => {
		console.log("🐛 Debug Play clicked - calling player.play() directly");
		if (playerRef?.current) {
			try {
				playerRef.current.play(event);
				console.log("✅ Debug play() successful");

				// Check actual audio elements after play
				setTimeout(() => {
					const audioElements = document.querySelectorAll("audio");
					console.log("🔊 Audio elements after play:", audioElements.length);
					audioElements.forEach((audio, index) => {
						console.log(`Audio ${index} state:`, {
							src: audio.src,
							muted: audio.muted,
							volume: audio.volume,
							paused: audio.paused,
							currentTime: audio.currentTime,
							duration: audio.duration,
							readyState: audio.readyState,
						});
					});
				}, 100);
			} catch (error) {
				console.error("❌ Debug play() failed:", error);
			}
		}
	};

	const handleDebugPause = () => {
		console.log("🐛 Debug Pause clicked");
		if (playerRef?.current) {
			playerRef.current.pause();
		}
	};

	const handleResumeAudioContext = async () => {
		console.log("🔊 Attempting to resume audio context");
		const AudioContext =
			window.AudioContext || (window as any).webkitAudioContext;
		if (AudioContext) {
			const ctx = new AudioContext();
			if (ctx.state === "suspended") {
				await ctx.resume();
				console.log("✅ Audio context resumed");
				setAudioContextState(ctx.state);
			}
		}
	};

	// Only show in development
	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	// Don't show if no audio items
	if (audioItems.length === 0) {
		return null;
	}

	return (
		<Card className="fixed top-20 right-4 z-50 p-4 max-w-md bg-background/95 backdrop-blur">
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold flex items-center gap-2">
						<Volume2 className="w-4 h-4" />
						Audio Debug Panel
					</h3>
					<span
						className={`text-xs px-2 py-1 rounded ${
							isPlaying
								? "bg-green-500/20 text-green-500"
								: "bg-gray-500/20 text-gray-500"
						}`}
					>
						{isPlaying ? "Playing" : "Paused"}
					</span>
				</div>

				{hasBlobUrls && (
					<div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded text-yellow-600">
						<AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
						<div className="text-xs">
							<p className="font-semibold">Blob URLs Detected!</p>
							<p>
								Audio uses blob URLs which expire on page refresh. Audio won't
								play after refreshing.
							</p>
						</div>
					</div>
				)}

				<div className="space-y-2">
					<h4 className="text-sm font-medium">
						Audio Tracks ({audioItems.length})
					</h4>
					{audioItems.map((item, idx) => (
						<div
							key={item.id}
							className="p-2 border rounded text-xs space-y-1 bg-muted/50"
						>
							<div className="flex items-center justify-between">
								<span className="font-mono">#{idx + 1}</span>
								<span className="text-muted-foreground">{item.id}</span>
							</div>

							<div className="grid grid-cols-2 gap-1 text-xs">
								<div>
									<span className="text-muted-foreground">Volume: </span>
									<span className="font-medium">
										{item.details?.volume ?? 100}%
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Rate: </span>
									<span className="font-medium">{item.playbackRate || 1}x</span>
								</div>
							</div>

							<div className="mt-1">
								<span className="text-muted-foreground">Source: </span>
								{item.details?.src ? (
									<div className="mt-1">
										<code
											className={`text-xs break-all ${
												item.details.src.startsWith("blob:")
													? "text-yellow-600"
													: "text-green-600"
											}`}
										>
											{item.details.src.startsWith("blob:")
												? "blob:// (EXPIRED ON REFRESH!)"
												: `${item.details.src.substring(0, 50)}...`}
										</code>
									</div>
								) : (
									<span className="text-red-500">No source URL!</span>
								)}
							</div>
						</div>
					))}
				</div>

				<div className="space-y-3">
					{/* Debug Controls */}
					<div className="space-y-2">
						<h4 className="text-sm font-medium">Debug Controls</h4>
						<div className="flex gap-2">
							<Button
								size="sm"
								variant="outline"
								onClickCapture={handleDebugPlay}
								className="flex items-center gap-1"
							>
								<Play className="w-3 h-3" />
								Direct Play
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={handleDebugPause}
								className="flex items-center gap-1"
							>
								<Pause className="w-3 h-3" />
								Pause
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={handleResumeAudioContext}
								className="flex items-center gap-1"
							>
								<RefreshCw className="w-3 h-3" />
								Resume Audio
							</Button>
						</div>
					</div>

					{/* Audio Context State */}
					<div className="p-2 border rounded text-xs space-y-1 bg-muted/50">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Audio Context:</span>
							<span
								className={`px-2 py-0.5 rounded text-xs font-medium ${
									audioContextState === "running"
										? "bg-green-500/20 text-green-500"
										: audioContextState === "suspended"
											? "bg-yellow-500/20 text-yellow-500"
											: "bg-gray-500/20 text-gray-500"
								}`}
							>
								{audioContextState}
							</span>
						</div>
						{audioContextState === "suspended" && (
							<p className="text-yellow-600 text-xs mt-1">
								⚠️ Audio context suspended - click "Resume Audio" button
							</p>
						)}
					</div>

					<div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded">
						<Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
						<div className="text-xs text-blue-600">
							<p>Use "Direct Play" button to test audio unlock.</p>
							<p>Check browser console for detailed logs.</p>
							<p>Audio Context must be "running" for sound.</p>
						</div>
					</div>
				</div>
			</div>
		</Card>
	);
};

export default AudioDebugPanel;
