import { useEffect, useRef } from "react";
import StateManager from "@designcombo/state";
import { subject, filter } from "@designcombo/events";
import { createStateSnapshot } from "../utils/state-validation";

/**
 * Hook to monitor and verify state changes
 * Silently tracks state for consistency without logging
 */
export function useStateVerification(stateManager: StateManager) {
	const lastSnapshotRef = useRef<any>(null);
	const operationCountRef = useRef(0);

	useEffect(() => {
		// Create initial snapshot
		const initialState = stateManager.getState();
		lastSnapshotRef.current = createStateSnapshot(initialState);

		// Subscribe to all state changes
		const stateSubscription = stateManager.subscribeToState((newState) => {
			operationCountRef.current++;

			// Create new snapshot
			const newSnapshot = createStateSnapshot(newState);

			// Update last snapshot
			lastSnapshotRef.current = newSnapshot;
		});

		// Subscribe to DESIGN_LOAD events specifically
		const designLoadSubscription = subject
			.pipe(filter(({ key }) => key === "DESIGN_LOAD"))
			.subscribe((event) => {
				const payload = event.value?.payload;

				// Silently validate payload structure
				if (payload) {
					const issues = [];

					// Check for correct property names
					if (payload.trackItems && !payload.trackItemsMap) {
						issues.push("Using 'trackItems' instead of 'trackItemsMap'");
					}
					if (payload.transitions && !payload.transitionsMap) {
						issues.push("Using 'transitions' instead of 'transitionsMap'");
					}

					// Check for required arrays
					if (!payload.trackItemIds) {
						issues.push("Missing 'trackItemIds' array");
					}
					if (!payload.transitionIds) {
						issues.push("Missing 'transitionIds' array");
					}

					// Check for required properties
					if (!payload.fps) {
						issues.push("Missing 'fps' property");
					}
					if (!payload.size) {
						issues.push("Missing 'size' property");
					}

					// Only log errors if there are critical issues
					if (issues.length > 0) {
						console.error("DESIGN_LOAD payload issues:", issues);
					}
				}
			});

		// Cleanup
		return () => {
			stateSubscription.unsubscribe();
			designLoadSubscription.unsubscribe();
		};
	}, [stateManager]);
}

/**
 * Helper to manually verify state consistency
 * Returns issues array for programmatic use
 */
export function verifyCurrentState(stateManager: StateManager): string[] {
	const state = stateManager.getState();
	const issues: string[] = [];

	// Verify trackItemIds match trackItemsMap
	if (state.trackItemIds && state.trackItemsMap) {
		const mapKeys = Object.keys(state.trackItemsMap);
		const missingInMap = state.trackItemIds.filter(
			(id: string) => !mapKeys.includes(id),
		);
		const missingInIds = mapKeys.filter(
			(id: string) => !state.trackItemIds.includes(id),
		);

		if (missingInMap.length > 0) {
			issues.push(`IDs not in map: ${missingInMap.join(", ")}`);
		}
		if (missingInIds.length > 0) {
			issues.push(`Map keys not in IDs: ${missingInIds.join(", ")}`);
		}
	}

	// Verify transitionIds match transitionsMap
	if (state.transitionIds && state.transitionsMap) {
		const mapKeys = Object.keys(state.transitionsMap);
		const missingInMap = state.transitionIds.filter(
			(id: string) => !mapKeys.includes(id),
		);
		const missingInIds = mapKeys.filter(
			(id: string) => !state.transitionIds.includes(id),
		);

		if (missingInMap.length > 0) {
			issues.push(`Transition IDs not in map: ${missingInMap.join(", ")}`);
		}
		if (missingInIds.length > 0) {
			issues.push(`Transition map keys not in IDs: ${missingInIds.join(", ")}`);
		}
	}

	// Check track items in tracks
	if (state.tracks && state.trackItemsMap) {
		for (const track of state.tracks) {
			if (track.items) {
				for (const itemId of track.items) {
					if (!state.trackItemsMap[itemId]) {
						issues.push(`Track ${track.id} references missing item: ${itemId}`);
					}
				}
			}
		}
	}

	return issues;
}
