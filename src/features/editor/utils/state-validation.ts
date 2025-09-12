/**
 * State validation and verification utilities for DESIGN_LOAD and other state operations
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixedPayload?: any;
}

interface StateChangeLog {
  operation: string;
  timestamp: number;
  payload: any;
  result: any;
  duration: number;
}

/**
 * Validates DESIGN_LOAD payload structure and fixes common issues
 */
export function validateDesignLoadPayload(payload: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fixedPayload = { ...payload };

  // Check for required fields
  if (!payload) {
    errors.push("Payload is null or undefined");
    return { valid: false, errors, warnings };
  }

  // Validate and fix tracks
  if (!payload.tracks) {
    warnings.push("Missing tracks array, using empty array");
    fixedPayload.tracks = [];
  } else if (!Array.isArray(payload.tracks)) {
    errors.push("tracks must be an array");
  }

  // Validate trackItemsMap
  if (!fixedPayload.trackItemsMap) {
    warnings.push("Missing trackItemsMap, using empty object");
    fixedPayload.trackItemsMap = {};
  } else if (typeof fixedPayload.trackItemsMap !== "object") {
    errors.push("trackItemsMap must be an object");
  }

  // Generate missing trackItemIds
  if (!fixedPayload.trackItemIds) {
    const ids = Object.keys(fixedPayload.trackItemsMap || {});
    if (ids.length > 0) {
      warnings.push(
        `Generated trackItemIds from trackItemsMap: ${ids.length} items`
      );
    }
    fixedPayload.trackItemIds = ids;
  }

  // Validate transitionsMap
  if (!fixedPayload.transitionsMap) {
    warnings.push("Missing transitionsMap, using empty object");
    fixedPayload.transitionsMap = {};
  }

  // Generate missing transitionIds
  if (!fixedPayload.transitionIds) {
    const ids = Object.keys(fixedPayload.transitionsMap || {});
    if (ids.length > 0) {
      warnings.push(
        `Generated transitionIds from transitionsMap: ${ids.length} items`
      );
    }
    fixedPayload.transitionIds = ids;
  }

  // Add default fps if missing
  if (!fixedPayload.fps) {
    warnings.push("Missing fps, using default: 30");
    fixedPayload.fps = 30;
  }

  // Add default size if missing
  if (!fixedPayload.size) {
    warnings.push("Missing size, using default: 1920x1080");
    fixedPayload.size = { width: 1920, height: 1080 };
  }

  // Validate size structure
  if (
    fixedPayload.size &&
    (!fixedPayload.size.width || !fixedPayload.size.height)
  ) {
    errors.push("size must have width and height properties");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fixedPayload: errors.length === 0 ? fixedPayload : undefined,
  };
}

/**
 * Generates missing ID arrays from maps
 */
export function generateMissingIds(payload: any): any {
  const fixed = { ...payload };

  // Generate trackItemIds if missing
  if (payload.trackItemsMap && !payload.trackItemIds) {
    fixed.trackItemIds = Object.keys(payload.trackItemsMap);
  }

  // Generate transitionIds if missing
  if (payload.transitionsMap && !payload.transitionIds) {
    fixed.transitionIds = Object.keys(payload.transitionsMap);
  }

  return fixed;
}

/**
 * Verifies state update after DESIGN_LOAD dispatch
 */
export function verifyStateUpdate(
  oldState: any,
  newState: any,
  expectedChanges?: string[]
): boolean {
  const issues: string[] = [];

  // Check if state actually changed
  if (oldState === newState) {
    issues.push("State reference didn't change");
  }

  // Verify expected properties were updated
  if (expectedChanges) {
    for (const prop of expectedChanges) {
      if (JSON.stringify(oldState[prop]) === JSON.stringify(newState[prop])) {
        issues.push(`Expected ${prop} to change but it didn't`);
      }
    }
  }

  // Check for data integrity
  if (newState.trackItemIds && newState.trackItemsMap) {
    const mapKeys = Object.keys(newState.trackItemsMap);
    const idsMatch = newState.trackItemIds.every((id: string) =>
      mapKeys.includes(id)
    );
    if (!idsMatch) {
      issues.push("trackItemIds doesn't match trackItemsMap keys");
    }
  }

  // Check tracks have valid structure
  if (newState.tracks && Array.isArray(newState.tracks)) {
    for (const track of newState.tracks) {
      if (!track.id) {
        issues.push(`Track missing ID: ${JSON.stringify(track)}`);
      }
    }
  }

  return issues.length === 0;
}

/**
 * Creates a state snapshot for comparison
 */
export function createStateSnapshot(state: any) {
  return {
    timestamp: Date.now(),
    tracksCount: state.tracks?.length || 0,
    trackItemsCount: Object.keys(state.trackItemsMap || {}).length,
    transitionsCount: Object.keys(state.transitionsMap || {}).length,
    activeIds: [...(state.activeIds || [])],
    duration: state.duration,
    fps: state.fps,
  };
}

/**
 * Compares two state snapshots and returns differences
 */
export function compareSnapshots(before: any, after: any) {
  const changes: string[] = [];

  if (before.tracksCount !== after.tracksCount) {
    changes.push(`Tracks: ${before.tracksCount} → ${after.tracksCount}`);
  }
  if (before.trackItemsCount !== after.trackItemsCount) {
    changes.push(
      `Track Items: ${before.trackItemsCount} → ${after.trackItemsCount}`
    );
  }
  if (before.transitionsCount !== after.transitionsCount) {
    changes.push(
      `Transitions: ${before.transitionsCount} → ${after.transitionsCount}`
    );
  }
  if (before.duration !== after.duration) {
    changes.push(`Duration: ${before.duration} → ${after.duration}`);
  }
  if (before.fps !== after.fps) {
    changes.push(`FPS: ${before.fps} → ${after.fps}`);
  }

  return changes;
}

/**
 * Validates track item structure
 */
export function validateTrackItem(item: any): string[] {
  const errors: string[] = [];

  if (!item.id) errors.push("Missing item ID");
  if (!item.type) errors.push("Missing item type");
  if (!item.display) errors.push("Missing display property");
  if (
    item.display &&
    (item.display.from === undefined || item.display.to === undefined)
  ) {
    errors.push("Display must have 'from' and 'to' properties");
  }
  if (!item.details) errors.push("Missing details property");

  // Type-specific validation
  if (item.type === "video" || item.type === "audio") {
    if (!item.details?.src)
      errors.push(`${item.type} must have src in details`);
    if (!item.trim) errors.push(`${item.type} should have trim property`);
  }

  return errors;
}

/**
 * Batch validates all track items
 */
export function validateAllTrackItems(trackItemsMap: Record<string, any>): {
  valid: boolean;
  itemErrors: Record<string, string[]>;
} {
  const itemErrors: Record<string, string[]> = {};
  let hasErrors = false;

  for (const [id, item] of Object.entries(trackItemsMap)) {
    const errors = validateTrackItem(item);
    if (errors.length > 0) {
      itemErrors[id] = errors;
      hasErrors = true;
    }
  }

  return {
    valid: !hasErrors,
    itemErrors,
  };
}
