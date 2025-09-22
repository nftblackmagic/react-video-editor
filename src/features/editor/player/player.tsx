import { useEffect, useRef } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";

const Player = () => {
	const playerRef = useRef<PlayerRef>(null);
	const { setPlayerRef, duration, fps, size, background } = useStore();

	useEffect(() => {
		setPlayerRef(playerRef as React.RefObject<PlayerRef>);

		// Check if ref gets populated and reset volume/mute state
		const checkInterval = setInterval(() => {
			if (playerRef.current) {
				// Reset persisted volume/mute state from localStorage
				try {
					// Check current volume/mute state
					const currentVolume = (playerRef.current as any).getVolume?.();
					const isMuted = (playerRef.current as any).isMuted?.();

					// Fix persisted volume=0 issue
					if (typeof currentVolume === "number" && currentVolume === 0) {
						(playerRef.current as any).setVolume?.(1);
					}

					// Fix persisted mute state
					if (isMuted === true) {
						(playerRef.current as any).unmute?.();
					}
				} catch (error) {
					// Silently handle any errors
				}

				clearInterval(checkInterval);
			}
		}, 100);

		// Clean up after 5 seconds if player never mounts
		const timeout = setTimeout(() => {
			clearInterval(checkInterval);
		}, 5000);

		return () => {
			clearInterval(checkInterval);
			clearTimeout(timeout);
		};
	}, []);

	return (
		<RemotionPlayer
			ref={playerRef}
			component={Composition}
			durationInFrames={Math.round((duration / 1000) * fps) || 1}
			compositionWidth={size.width}
			compositionHeight={size.height}
			className={`h-full w-full bg-[${background.value}]`}
			fps={fps}
			overflowVisible
			numberOfSharedAudioTags={0}
			allowFullscreen={false}
			clickToPlay={false}
			doubleClickToFullscreen={false}
			spaceKeyToPlayOrPause={false}
			moveToBeginningWhenEnded={false}
		/>
	);
};
export default Player;
