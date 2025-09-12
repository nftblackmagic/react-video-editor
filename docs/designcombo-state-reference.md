# @designcombo/state Integration Reference

## Quick Reference

### Core Events Import
```typescript
import { dispatch } from "@designcombo/events";
import {
  // Add Events
  ADD_TEXT, ADD_IMAGE, ADD_VIDEO, ADD_AUDIO,
  ADD_SHAPE, ADD_ILLUSTRATION, ADD_TEMPLATE,
  ADD_CAPTIONS, ADD_ANIMATION, ADD_COMPOSITION,
  ADD_RECT, ADD_PROGRESS_BAR, ADD_PROGRESS_FRAME,
  ADD_PROGRESS_SQUARE, ADD_RADIAL_AUDIO_BARS,
  ADD_LINEAL_AUDIO_BARS, ADD_WAVE_AUDIO_BARS,
  ADD_HILL_AUDIO_BARS,
  
  // Edit Events
  EDIT_OBJECT, REPLACE_MEDIA, EDIT_BACKGROUND_EDITOR,
  
  // Layer Events
  LAYER_SELECT, LAYER_COPY, LAYER_DELETE,
  LAYER_CLONE, LAYER_REPLACE, LAYER_MOVE,
  LAYER_RENAME, LAYER_LOCKED, LAYER_HIDDEN,
  
  // Design Events
  DESIGN_LOAD, DESIGN_RESIZE,
  
  // History Events
  HISTORY_UNDO, HISTORY_REDO,
  
  // Active Object Events
  ACTIVE_PASTE, ACTIVE_SPLIT,
  
  // Timeline Scale Events
  TIMELINE_SCALE_CHANGED
} from "@designcombo/state";
```

## Common Usage Patterns

### 1. Adding Media Elements

#### Add Text
```typescript
import { generateId } from "@designcombo/timeline";

dispatch(ADD_TEXT, {
  payload: {
    id: generateId(),
    type: "text",
    details: {
      text: "Hello World",
      fontSize: 24,
      color: "#000000",
      fontFamily: "Arial",
      textAlign: "center"
    },
    display: {
      from: 0,
      to: 5000
    }
  },
  options: {
    targetTrackIndex: 0,
    isSelected: true
  }
});
```

#### Add Image
```typescript
dispatch(ADD_IMAGE, {
  payload: {
    id: generateId(),
    type: "image",
    details: {
      src: "https://example.com/image.jpg",
      alt: "Sample image",
      width: 1920,
      height: 1080
    },
    display: {
      from: 0,
      to: 5000
    }
  },
  options: {
    scaleMode: "fit",
    isSelected: true
  }
});
```

#### Add Video
```typescript
dispatch(ADD_VIDEO, {
  payload: {
    id: generateId(),
    type: "video",
    details: {
      src: "https://example.com/video.mp4"
    },
    metadata: {
      duration: 10000,
      previewUrl: "https://example.com/preview.jpg"
    }
  },
  options: {
    resourceId: "main",
    scaleMode: "fit"
  }
});
```

#### Add Audio
```typescript
dispatch(ADD_AUDIO, {
  payload: {
    id: generateId(),
    type: "audio",
    details: {
      src: "https://example.com/audio.mp3"
    },
    metadata: {
      duration: 5000
    }
  },
  options: {}
});
```

### 2. Audio Visualizations

#### Add Linear Audio Bars
```typescript
dispatch(ADD_LINEAL_AUDIO_BARS, {
  payload: {
    id: generateId(),
    type: "linealAudioBars",
    details: {
      height: 96,
      width: 1080,
      linealBarColor: "#F3B3DC",
      lineThickness: 5,
      gapSize: 7,
      roundness: 2
    },
    display: {
      from: 0,
      to: 10000
    }
  },
  options: {}
});
```

#### Add Radial Audio Bars
```typescript
dispatch(ADD_RADIAL_AUDIO_BARS, {
  payload: {
    id: generateId(),
    type: "radialAudioBars",
    details: {
      radialBarColor: "#F3B3DC",
      barAmount: 50,
      radius: 250
    },
    display: {
      from: 0,
      to: 10000
    }
  },
  options: {}
});
```

#### Add Wave Audio Bars
```typescript
dispatch(ADD_WAVE_AUDIO_BARS, {
  payload: {
    id: generateId(),
    type: "waveAudioBars",
    details: {
      strokeColor: "#71E4A5",
      strokeWidth: 3,
      copies: 3
    },
    display: {
      from: 0,
      to: 10000
    }
  },
  options: {}
});
```

#### Add Hill Audio Bars
```typescript
dispatch(ADD_HILL_AUDIO_BARS, {
  payload: {
    id: generateId(),
    type: "hillAudioBars",
    details: {
      strokeColor: "#E9AB6C",
      strokeWidth: 2,
      fillColor: "rgba(70, 90, 200, 0.2)"
    },
    display: {
      from: 0,
      to: 10000
    }
  },
  options: {}
});
```

### 3. Editing Operations

#### Edit Object Properties
```typescript
dispatch(EDIT_OBJECT, {
  payload: {
    [itemId]: {
      details: {
        text: "Updated text",
        fontSize: 32,
        color: "#ff0000"
      },
      display: {
        from: 0,
        to: 5000
      },
      playbackRate: 1.5
    }
  }
});
```

#### Replace Media
```typescript
dispatch(REPLACE_MEDIA, {
  payload: {
    itemId: "item-123",
    newSrc: "https://example.com/new-image.jpg",
    alt: "New image"
  }
});
```

#### Edit Background
```typescript
// Color background
dispatch(EDIT_BACKGROUND_EDITOR, {
  payload: {
    type: "color",
    value: "#ffffff"
  }
});

// Image background
dispatch(EDIT_BACKGROUND_EDITOR, {
  payload: {
    type: "image",
    value: "https://example.com/bg.jpg"
  }
});
```

### 4. Layer Management

#### Select Layers
```typescript
dispatch(LAYER_SELECT, {
  payload: {
    trackItemIds: ["item-1", "item-2", "item-3"]
  }
});
```

#### Delete Layers
```typescript
dispatch(LAYER_DELETE, {
  payload: {
    trackItemIds: ["item-1", "item-2"]
  }
});
```

#### Clone Layers
```typescript
dispatch(LAYER_CLONE, {
  payload: {
    trackItemIds: ["item-1"]
  }
});
```

### 5. Design Operations

#### Load Complete Design
```typescript
import { validateDesignLoadPayload } from "./utils/state-validation";

const payload = {
  fps: 30,
  size: { width: 1920, height: 1080 },
  tracks: [...],
  trackItemIds: [...],
  trackItemsMap: {...},
  transitionIds: [...],
  transitionsMap: {...},
  compositions: [...]
};

// Validate before dispatch
const validation = validateDesignLoadPayload(payload);
if (validation.valid) {
  dispatch(DESIGN_LOAD, {
    payload: validation.fixedPayload || payload
  });
}
```

#### Resize Design
```typescript
dispatch(DESIGN_RESIZE, {
  payload: {
    width: 1920,
    height: 1080
  }
});
```

### 6. History Management

```typescript
// Undo last action
dispatch(HISTORY_UNDO, {});

// Redo last undone action
dispatch(HISTORY_REDO, {});
```

### 7. Timeline Scale

```typescript
dispatch(TIMELINE_SCALE_CHANGED, {
  payload: {
    scale: {
      index: 7,
      unit: 300,
      zoom: 1 / 300,
      segments: 5
    }
  }
});
```

## Current Implementation Examples

### From elements.tsx
```typescript
const handleAddLinealAudioBars = (details: any) => {
  dispatch(ADD_LINEAL_AUDIO_BARS, {
    payload: {
      id: generateId(),
      type: "linealAudioBars",
      details,
      display: {
        from: 0,
        to: 10000,
      },
    },
    options: {},
  });
};
```

### From texts.tsx
```typescript
const handleAddText = () => {
  dispatch(ADD_TEXT, {
    payload: { 
      ...TEXT_ADD_PAYLOAD, 
      id: nanoid() 
    },
    options: {},
  });
};
```

### From uploads.tsx
```typescript
const handleAddVideo = (video: any) => {
  const srcVideo = video.metadata?.uploadedUrl || video.url;
  
  dispatch(ADD_VIDEO, {
    payload: {
      id: generateId(),
      details: {
        src: srcVideo,
      },
      metadata: {
        previewUrl: "preview.webp"
      }
    },
    options: {
      resourceId: "main",
      scaleMode: "fit",
    },
  });
};
```

### From granular-dispatch.ts
```typescript
export function loadTimelineGranularly(timelineData: {
  tracks?: any[];
  trackItems?: Record<string, any>;
  transitions?: Record<string, any>;
  compositions?: any[];
  fps?: number;
  size?: { width: number; height: number };
}) {
  // Filter and validate data
  const payload = {
    tracks: filteredTracks,
    trackItemsMap: filteredTrackItems,
    trackItemIds: Object.keys(filteredTrackItems),
    transitionsMap: timelineData.transitions || {},
    transitionIds: Object.keys(timelineData.transitions || {}),
    compositions: timelineData.compositions || [],
    fps: timelineData.fps || 30,
    size: timelineData.size || { width: 1920, height: 1080 },
  };

  // Validate and dispatch
  const validation = validateDesignLoadPayload(payload);
  if (validation.valid) {
    dispatch(DESIGN_LOAD, {
      payload: validation.fixedPayload || payload,
    });
  }
}
```

## Important Notes

1. **Always use generateId() or nanoid() for unique IDs**
2. **Include display property with from/to for timeline items**
3. **Validate DESIGN_LOAD payloads before dispatch**
4. **Use proper property names: trackItemsMap, transitionsMap (not trackItems, transitions)**
5. **Include required fields: fps, size, all ID arrays**
6. **Filter out blob URLs before dispatching**
7. **Use options for track targeting and selection**

## Common Payload Structure

### Track Item
```typescript
{
  id: string;
  type: string;
  display: {
    from: number;
    to: number;
  };
  details: Record<string, any>;
  metadata?: Record<string, any>;
  animations?: Record<string, any>;
  playbackRate?: number;
}
```

### Trimable Item (Video/Audio)
```typescript
{
  ...trackItem,
  trim: {
    from: number;
    to: number;
  };
  isMain: boolean;
}
```

### Event Options
```typescript
{
  targetTrackIndex?: number;
  targetTrackId?: string;
  isNewTrack?: boolean;
  isSelected?: boolean;
  scaleMode?: "fit" | "fill" | "stretch";
  scaleAspectRatio?: number;
  resourceId?: string;
}
```

## State Structure
```typescript
{
  size: { width: number; height: number };
  fps: number;
  duration: number;
  tracks: ITrack[];
  trackItemIds: string[];
  trackItemsMap: Record<string, ITrackItem>;
  transitionIds: string[];
  transitionsMap: Record<string, ITransition>;
  activeIds: string[];
  scale: ITimelineScaleState;
  background: { type: "color" | "image"; value: string };
  structure: ItemStructure[];
  compositions: IComposition[];
}
```