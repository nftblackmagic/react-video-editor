import { useEffect, useRef } from "react";
import { dispatch, filter, subject } from "@designcombo/events";
import useStore from "../store/use-store";
import { 
  PLAYER_PLAY, 
  PLAYER_PAUSE, 
  PLAYER_TIME_UPDATE 
} from "../constants/events";

/**
 * PlayerTimeEmitter component that emits time update events during playback
 * This allows other components to sync with the current playback position
 */
const PlayerTimeEmitter = () => {
  const { playerRef, fps } = useStore();
  const animationIdRef = useRef<number | null>(null);
  const lastEmittedTimeRef = useRef<number>(-1);
  const isPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    const emitTimeUpdate = () => {
      if (playerRef?.current && isPlayingRef.current) {
        try {
          const currentFrame = playerRef.current.getCurrentFrame();
          const currentTimeMs = Math.floor((currentFrame / fps) * 1000);
          
          // Emit update every 100ms or when time changes significantly
          if (Math.abs(currentTimeMs - lastEmittedTimeRef.current) >= 100) {
            lastEmittedTimeRef.current = currentTimeMs;
            
            dispatch(PLAYER_TIME_UPDATE, {
              payload: { 
                time: currentTimeMs,
                frame: currentFrame
              }
            });
          }
          
          // Continue the animation loop
          animationIdRef.current = requestAnimationFrame(emitTimeUpdate);
        } catch (error) {
          console.error('Error emitting time update:', error);
        }
      }
    };

    const startEmitting = () => {
      isPlayingRef.current = true;
      // Cancel any existing animation frame
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      emitTimeUpdate();
    };

    const stopEmitting = () => {
      isPlayingRef.current = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };

    // Listen for play event
    const playSubscription = subject.pipe(
      filter(({ key }) => key === PLAYER_PLAY)
    ).subscribe(() => {
      startEmitting();
    });

    // Listen for pause event
    const pauseSubscription = subject.pipe(
      filter(({ key }) => key === PLAYER_PAUSE)
    ).subscribe(() => {
      stopEmitting();
    });

    // Check initial playing state
    if (playerRef?.current?.isPlaying()) {
      startEmitting();
    }

    return () => {
      playSubscription.unsubscribe();
      pauseSubscription.unsubscribe();
      stopEmitting();
    };
  }, [playerRef, fps]);

  // Also emit on manual seeks
  useEffect(() => {
    const seekSubscription = subject.pipe(
      filter(({ key }) => key === 'player:seek' || key === 'timeline:seek')
    ).subscribe((event) => {
      const { time } = event.value?.payload || {};
      if (typeof time === 'number' && !isPlayingRef.current) {
        // Emit time update even when paused after a seek
        dispatch(PLAYER_TIME_UPDATE, {
          payload: { 
            time,
            frame: Math.floor((time / 1000) * fps)
          }
        });
      }
    });

    return () => {
      seekSubscription.unsubscribe();
    };
  }, [fps]);

  return null; // This component doesn't render anything
};

export default PlayerTimeEmitter;