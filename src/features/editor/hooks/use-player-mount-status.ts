import { useEffect, useState } from "react";
import { PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";

export type PlayerStatus = "not-mounted" | "mounting" | "ready" | "error";

interface PlayerMountInfo {
	status: PlayerStatus;
	isReady: boolean;
	availableMethods: string[];
	errorMessage?: string;
}

/**
 * Hook to monitor Remotion Player mounting status and provide debugging info
 * Helps detect when the player is ready to accept commands after page refresh
 */
export const usePlayerMountStatus = (): PlayerMountInfo => {
	const { playerRef } = useStore();
	const [status, setStatus] = useState<PlayerStatus>("not-mounted");
	const [availableMethods, setAvailableMethods] = useState<string[]>([]);
	const [errorMessage, setErrorMessage] = useState<string>();

	useEffect(() => {
		if (!playerRef) {
			setStatus("not-mounted");
			setAvailableMethods([]);
			console.log("🎬 Player mount status: not-mounted (no ref in store)");
			return;
		}

		setStatus("mounting");
		console.log(
			"🎬 Player mount status: mounting (ref exists, checking current)",
		);

		// Check immediately and then periodically
		let checkAttempts = 0;
		const maxAttempts = 50; // 5 seconds max wait time

		const checkInterval = setInterval(() => {
			checkAttempts++;

			if (playerRef.current) {
				// Player is ready!
				const methods = Object.keys(playerRef.current).filter(
					(key) => typeof (playerRef.current as any)[key] === "function",
				);

				setAvailableMethods(methods);
				setStatus("ready");

				console.log("✅ Player mount status: ready!", {
					hasPlay: !!playerRef.current.play,
					hasPause: !!playerRef.current.pause,
					hasSeekTo: !!playerRef.current.seekTo,
					isPlaying: typeof playerRef.current.isPlaying === "function",
					totalMethods: methods.length,
					methods: methods.join(", "),
				});

				// Emit custom event for other components
				window.dispatchEvent(
					new CustomEvent("remotion-player-ready", {
						detail: { playerRef },
					}),
				);

				clearInterval(checkInterval);
			} else if (checkAttempts >= maxAttempts) {
				// Timeout - player failed to mount
				setStatus("error");
				setErrorMessage("Player failed to mount after 5 seconds");
				console.error(
					"❌ Player mount status: error (timeout after 5 seconds)",
				);
				clearInterval(checkInterval);
			} else {
				// Still waiting
				if (checkAttempts % 10 === 0) {
					console.log(
						`⏳ Player mount status: mounting (attempt ${checkAttempts}/${maxAttempts})`,
					);
				}
			}
		}, 100);

		return () => {
			clearInterval(checkInterval);
		};
	}, [playerRef]);

	// Log status changes
	useEffect(() => {
		if (status === "ready") {
			console.group("🎬 Remotion Player Ready");
			console.log("Status:", status);
			console.log("Available methods:", availableMethods);
			console.log("Player ref:", playerRef?.current);
			console.groupEnd();
		}
	}, [status, availableMethods, playerRef]);

	return {
		status,
		isReady: status === "ready",
		availableMethods,
		errorMessage,
	};
};

/**
 * Hook to listen for player ready events
 */
export const useOnPlayerReady = (
	callback: (playerRef: React.RefObject<PlayerRef>) => void,
) => {
	useEffect(() => {
		const handleReady = (event: CustomEvent) => {
			callback(event.detail.playerRef);
		};

		window.addEventListener("remotion-player-ready" as any, handleReady);

		return () => {
			window.removeEventListener("remotion-player-ready" as any, handleReady);
		};
	}, [callback]);
};

export default usePlayerMountStatus;
