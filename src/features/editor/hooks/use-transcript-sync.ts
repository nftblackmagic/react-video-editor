import { useEffect } from "react";
import { filter, subject } from "@designcombo/events";
import { dispatch } from "@designcombo/events";
import useTranscriptStore from "../store/use-transcript-store";
import { 
  TRANSCRIPT_SELECT, 
  PLAYER_SEEK,
  PLAYER_TIME_UPDATE 
} from "../constants/events";
import { TIMELINE_SEEK } from "@designcombo/timeline";

export const useTranscriptSync = () => {
  const { setActiveSegmentByTime, setActiveSegmentById } = useTranscriptStore();

  useEffect(() => {
    // Listen for Transcript selection → trigger seek
    const selectSubscription = subject.pipe(
      filter(({ key }) => key === TRANSCRIPT_SELECT)
    ).subscribe((event) => {
      const { segmentId, time } = event.value?.payload || {};
      if (segmentId) {
        // Set the active segment immediately by ID
        setActiveSegmentById(segmentId);
      }
      if (typeof time === 'number') {
        // Dispatch seek event to player (reuse existing PLAYER_SEEK)
        dispatch(PLAYER_SEEK, { payload: { time } });
      }
    });

    // Listen for Player time updates → update transcript highlight
    const timeUpdateSubscription = subject.pipe(
      filter(({ key }) => key === PLAYER_TIME_UPDATE)
    ).subscribe((event) => {
      const { time } = event.value?.payload || {};
      if (typeof time === 'number') {
        setActiveSegmentByTime(time);
      }
    });

    // Listen for Timeline seek → update transcript highlight
    const timelineSeekSubscription = subject.pipe(
      filter(({ key }) => key === TIMELINE_SEEK)
    ).subscribe((event) => {
      const { time } = event.value?.payload || {};
      if (typeof time === 'number') {
        setActiveSegmentByTime(time);
      }
    });

    return () => {
      selectSubscription.unsubscribe();
      timeUpdateSubscription.unsubscribe();
      timelineSeekSubscription.unsubscribe();
    };
  }, [setActiveSegmentByTime, setActiveSegmentById]);
};