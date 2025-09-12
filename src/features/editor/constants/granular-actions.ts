/**
 * Granular state action constants for independent state management
 * Each action handles a specific part of the state independently
 */

// Track-related actions
export const LOAD_TRACKS = "LOAD_TRACKS";
export const ADD_TRACK = "ADD_TRACK";
export const REMOVE_TRACK = "REMOVE_TRACK";
export const UPDATE_TRACK = "UPDATE_TRACK";

// Track items actions
export const LOAD_TRACK_ITEMS = "LOAD_TRACK_ITEMS";
export const ADD_TRACK_ITEM = "ADD_TRACK_ITEM";
export const REMOVE_TRACK_ITEM = "REMOVE_TRACK_ITEM";
export const UPDATE_TRACK_ITEM = "UPDATE_TRACK_ITEM";
export const BATCH_ADD_TRACK_ITEMS = "BATCH_ADD_TRACK_ITEMS";

// Transitions actions
export const LOAD_TRANSITIONS = "LOAD_TRANSITIONS";
export const ADD_TRANSITION = "ADD_TRANSITION";
export const REMOVE_TRANSITION = "REMOVE_TRANSITION";
export const UPDATE_TRANSITION = "UPDATE_TRANSITION";

// Compositions actions
export const LOAD_COMPOSITIONS = "LOAD_COMPOSITIONS";
export const ADD_COMPOSITION = "ADD_COMPOSITION";
export const REMOVE_COMPOSITION = "REMOVE_COMPOSITION";
export const UPDATE_COMPOSITION = "UPDATE_COMPOSITION";

// Initial media actions
export const SET_INITIAL_MEDIA = "SET_INITIAL_MEDIA";
export const UPDATE_INITIAL_MEDIA_URL = "UPDATE_INITIAL_MEDIA_URL";
export const CLEAR_INITIAL_MEDIA = "CLEAR_INITIAL_MEDIA";

// Settings actions
export const LOAD_SETTINGS = "LOAD_SETTINGS";
export const UPDATE_SETTINGS = "UPDATE_SETTINGS";

// Project metadata actions
export const SET_PROJECT_METADATA = "SET_PROJECT_METADATA";
export const UPDATE_PROJECT_NAME = "UPDATE_PROJECT_NAME";
