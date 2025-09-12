import { dispatch } from "@designcombo/events";
import { DESIGN_LOAD } from "@designcombo/state";
import { validateDesignLoadPayload } from "./state-validation";

/**
 * Utility functions for granular state dispatching
 * Each function handles a specific piece of state independently
 * Using DESIGN_LOAD with validated and properly structured payloads
 */

export function dispatchLoadTracks(tracks: any[]) {
  if (!tracks || !Array.isArray(tracks)) return false;
  
  try {
    // Prepare payload with correct structure
    const payload = {
      tracks,
      trackItemsMap: {}, // Use correct property name
      trackItemIds: [], // Add required ID array
      transitionsMap: {}, // Use correct property name
      transitionIds: [], // Add required ID array
      compositions: [],
      fps: 30, // Add default fps
      size: { width: 1920, height: 1080 }, // Add default size
    };

    // Validate before dispatch
    const validation = validateDesignLoadPayload(payload);
    if (!validation.valid) {
      console.error("Invalid payload for dispatchLoadTracks:", validation.errors);
      return false;
    }

    // Use fixed payload if available
    const finalPayload = validation.fixedPayload || payload;
    
    // Dispatch with validated payload
    dispatch(DESIGN_LOAD, { payload: finalPayload });
    
    return true;
  } catch (error) {
    console.error("Failed to load tracks:", error);
    return false;
  }
}

export function dispatchLoadTrackItems(
  trackItems: Record<string, any>,
  existingTracks?: any[]
) {
  if (!trackItems || typeof trackItems !== "object") return false;

  try {
    // Filter out any items with blob URLs before dispatching
    const filtered = { ...trackItems };
    const itemsToRemove: string[] = [];

    for (const key in filtered) {
      const item = filtered[key];
      if (item?.details?.src && typeof item.details.src === "string") {
        if (item.details.src.startsWith("blob:")) {
          console.warn(`Filtering out item with blob URL: ${key}`);
          itemsToRemove.push(key);
          delete filtered[key];
        }
      }
    }

    if (Object.keys(filtered).length === 0) {
      console.warn("No valid track items to load after filtering");
      return false;
    }

    // Prepare payload with correct structure
    const payload = {
      tracks: existingTracks || [],
      trackItemsMap: filtered, // Use correct property name
      trackItemIds: Object.keys(filtered), // Generate IDs from map
      transitionsMap: {}, // Use correct property name
      transitionIds: [], // Add required ID array
      compositions: [],
      fps: 30, // Add default fps
      size: { width: 1920, height: 1080 }, // Add default size
    };

    // Validate before dispatch
    const validation = validateDesignLoadPayload(payload);
    if (!validation.valid) {
      console.error("Invalid payload for dispatchLoadTrackItems:", validation.errors);
      return false;
    }

    // Use fixed payload if available
    const finalPayload = validation.fixedPayload || payload;
    
    // Dispatch with validated payload
    dispatch(DESIGN_LOAD, { payload: finalPayload });
    
    return true;
  } catch (error) {
    console.error("Failed to load track items:", error);
    return false;
  }
}

export function dispatchLoadTransitions(
  transitions: Record<string, any>,
  existingData?: any
) {
  if (!transitions || typeof transitions !== "object") return false;

  try {
    // Prepare payload with correct structure
    const payload = {
      tracks: existingData?.tracks || [],
      trackItemsMap: existingData?.trackItemsMap || existingData?.trackItems || {}, // Handle both property names
      trackItemIds: existingData?.trackItemIds || Object.keys(existingData?.trackItemsMap || existingData?.trackItems || {}),
      transitionsMap: transitions, // Use correct property name
      transitionIds: Object.keys(transitions), // Generate IDs from map
      compositions: existingData?.compositions || [],
      fps: existingData?.fps || 30,
      size: existingData?.size || { width: 1920, height: 1080 },
    };

    // Validate before dispatch
    const validation = validateDesignLoadPayload(payload);
    if (!validation.valid) {
      console.error("Invalid payload for dispatchLoadTransitions:", validation.errors);
      return false;
    }

    // Use fixed payload if available
    const finalPayload = validation.fixedPayload || payload;
    
    // Dispatch with validated payload
    dispatch(DESIGN_LOAD, { payload: finalPayload });
    
    return true;
  } catch (error) {
    console.error("Failed to load transitions:", error);
    return false;
  }
}

export function dispatchLoadCompositions(
  compositions: any[],
  existingData?: any
) {
  if (!compositions || !Array.isArray(compositions)) return false;

  try {
    // Prepare payload with correct structure
    const payload = {
      tracks: existingData?.tracks || [],
      trackItemsMap: existingData?.trackItemsMap || existingData?.trackItems || {},
      trackItemIds: existingData?.trackItemIds || Object.keys(existingData?.trackItemsMap || existingData?.trackItems || {}),
      transitionsMap: existingData?.transitionsMap || existingData?.transitions || {},
      transitionIds: existingData?.transitionIds || Object.keys(existingData?.transitionsMap || existingData?.transitions || {}),
      compositions,
      fps: existingData?.fps || 30,
      size: existingData?.size || { width: 1920, height: 1080 },
    };

    // Validate before dispatch
    const validation = validateDesignLoadPayload(payload);
    if (!validation.valid) {
      console.error("Invalid payload for dispatchLoadCompositions:", validation.errors);
      return false;
    }

    // Use fixed payload if available
    const finalPayload = validation.fixedPayload || payload;
    
    // Dispatch with validated payload
    dispatch(DESIGN_LOAD, { payload: finalPayload });
    
    return true;
  } catch (error) {
    console.error("Failed to load compositions:", error);
    return false;
  }
}

/**
 * Load timeline data with proper filtering and validation
 * Uses a single DESIGN_LOAD with properly structured and validated data
 */
export function loadTimelineGranularly(timelineData: {
  tracks?: any[];
  trackItems?: Record<string, any>;
  transitions?: Record<string, any>;
  compositions?: any[];
  fps?: number;
  size?: { width: number; height: number };
}) {
  try {
    // Filter track items for blob URLs
    const filteredTrackItems = { ...(timelineData.trackItems || {}) };
    const filteredTracks = [...(timelineData.tracks || [])];
    const itemsToRemove: string[] = [];

    for (const key in filteredTrackItems) {
      const item = filteredTrackItems[key];
      if (item?.details?.src && typeof item.details.src === "string") {
        if (item.details.src.startsWith("blob:")) {
          console.warn(`Filtering out item with blob URL: ${key}`);
          itemsToRemove.push(key);
          delete filteredTrackItems[key];
        }
      }
    }

    // Remove filtered items from tracks
    if (itemsToRemove.length > 0) {
      for (const track of filteredTracks) {
        if (track.items && Array.isArray(track.items)) {
          track.items = track.items.filter(
            (itemId: string) => !itemsToRemove.includes(itemId)
          );
        }
      }
    }

    // Check if we have valid data to load
    const hasValidData =
      filteredTracks.length > 0 ||
      Object.keys(filteredTrackItems).length > 0 ||
      Object.keys(timelineData.transitions || {}).length > 0 ||
      (timelineData.compositions?.length || 0) > 0;

    if (!hasValidData) {
      console.warn("No valid timeline data to load");
      return {
        valid: false,
        tracks: false,
        trackItems: false,
        transitions: false,
        compositions: false,
      };
    }

    // Prepare payload with CORRECT structure
    const payload = {
      tracks: filteredTracks,
      trackItemsMap: filteredTrackItems, // FIXED: Use trackItemsMap, not trackItems
      trackItemIds: Object.keys(filteredTrackItems), // FIXED: Generate IDs array
      transitionsMap: timelineData.transitions || {}, // FIXED: Use transitionsMap
      transitionIds: Object.keys(timelineData.transitions || {}), // FIXED: Generate IDs array
      compositions: timelineData.compositions || [],
      fps: timelineData.fps || 30, // FIXED: Add fps with default
      size: timelineData.size || { width: 1920, height: 1080 }, // FIXED: Add size with default
    };

    // Validate payload before dispatch
    const validation = validateDesignLoadPayload(payload);
    
    if (!validation.valid) {
      console.error("❌ Invalid DESIGN_LOAD payload:", validation.errors);
      return {
        valid: false,
        tracks: false,
        trackItems: false,
        transitions: false,
        compositions: false,
        errors: validation.errors,
      };
    }

    // Use the fixed payload from validation
    const finalPayload = validation.fixedPayload || payload;

    // Dispatch with VALIDATED and CORRECTLY STRUCTURED payload
    dispatch(DESIGN_LOAD, {
      payload: finalPayload,
    });

    return {
      valid: true,
      tracks: filteredTracks.length > 0,
      trackItems: Object.keys(filteredTrackItems).length > 0,
      transitions: Object.keys(timelineData.transitions || {}).length > 0,
      compositions: (timelineData.compositions?.length || 0) > 0,
    };
  } catch (error) {
    console.error("Failed to load timeline data:", error);
    return {
      valid: false,
      tracks: false,
      trackItems: false,
      transitions: false,
      compositions: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
