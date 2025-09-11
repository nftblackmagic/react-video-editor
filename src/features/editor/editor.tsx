"use client";
import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import { TranscriptEditor } from "./transcript";
import PlayerTimeEmitter from "./components/PlayerTimeEmitter";
import { SceneRef } from "./scene/scene.types";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import MenuList from "./menu-list";
import { MenuItem } from "./menu-item";
import { ControlItem } from "./control-item";
import CropModal from "./crop-modal/crop-modal";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import FloatingControl from "./control-item/floating-controls/floating-control";
import { useSceneStore } from "@/store/use-scene-store";
import { dispatch } from "@designcombo/events";
import MenuListHorizontal from "./menu-list-horizontal";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { ITrackItem } from "@designcombo/types";
import useLayoutStore from "./store/use-layout-store";
import ControlItemHorizontal from "./control-item-horizontal";
import { ADD_VIDEO, ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import useProjectStore from "./store/use-project-store";
import useTranscriptStore from "./store/use-transcript-store";
import { useRouter } from "next/navigation";

const stateManager = new StateManager({
  size: {
    width: 1080,
    height: 1920,
  },
});

const Editor = ({
  tempId,
  id,
  projectId,
}: {
  tempId?: string;
  id?: string;
  projectId?: string;
}) => {
  const [projectName, setProjectName] = useState<string>("Untitled video");
  const {
    loadProject,
    projectData,
    initialMediaUrl,
    updateProjectTimeline,
    updateProjectTranscripts,
  } = useProjectStore();
  const router = useRouter();
  const { segments, initSegments } = useTranscriptStore();
  const { scene } = useSceneStore();
  const timelinePanelRef = useRef<ImperativePanelHandle>(null);
  const sceneRef = useRef<SceneRef>(null);
  const {
    timeline,
    playerRef,
    tracks,
    trackItemsMap,
    transitionsMap,
    compositions,
  } = useStore();
  const { activeIds } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
  const {
    setTrackItem: setLayoutTrackItem,
    setFloatingControl,
    setLabelControlItem,
    setTypeControlItem,
  } = useLayoutStore();
  const isLargeScreen = useIsLargeScreen();

  useTimelineEvents();

  // Load project from localStorage if projectId is provided
  useEffect(() => {
    if (projectId) {
      // Clear previous load flags when mounting with a new project
      localStorage.removeItem(`media-added-${projectId}`);
      localStorage.removeItem(`timeline-loaded-${projectId}`);

      const success = loadProject(projectId);
      if (!success) {
        console.error("Failed to load project, redirecting to home");
        router.push("/");
        return;
      }
    }

    // Cleanup function to clear flags when unmounting
    return () => {
      if (projectId) {
        localStorage.removeItem(`media-added-${projectId}`);
        localStorage.removeItem(`timeline-loaded-${projectId}`);
      }
    };
  }, [projectId, loadProject, router]);

  // Set project name and add initial media when project data is loaded
  useEffect(() => {
    if (projectData) {
      setProjectName(projectData.name);

      // Add initial media to timeline if it exists and timeline is ready
      if (projectData.initialMedia && timeline) {
        const { type, url } = projectData.initialMedia;

        // Check if media already added to prevent duplicates
        const mediaAdded = localStorage.getItem(`media-added-${projectId}`);
        if (!mediaAdded && url) {
          try {
            // Check if the URL is a blob URL that may have expired
            const isBlob = url.startsWith("blob:");
            if (isBlob) {
              console.warn(
                "Blob URL detected, it may have expired. Skipping initial media load."
              );
              // Mark as added to prevent repeated attempts
              localStorage.setItem(`media-added-${projectId}`, "true");
              return;
            }

            // Dispatch appropriate action based on media type
            if (type === "video") {
              dispatch(ADD_VIDEO, {
                payload: {
                  id: generateId(),
                  details: {
                    src: url,
                  },
                  metadata: {
                    previewUrl:
                      "https://cdn.designcombo.dev/caption_previews/static_preset1.webp",
                  },
                },
                options: {
                  resourceId: "main",
                  scaleMode: "fit",
                },
              });
            } else if (type === "audio") {
              dispatch(ADD_AUDIO, {
                payload: {
                  id: generateId(),
                  type: "audio",
                  details: {
                    src: url,
                  },
                  metadata: {},
                },
                options: {},
              });
            }
            // Mark as added to prevent re-adding on remount
            localStorage.setItem(`media-added-${projectId}`, "true");
          } catch (error) {
            console.error("Error adding initial media:", error);
            // Mark as added to prevent repeated attempts
            localStorage.setItem(`media-added-${projectId}`, "true");
          }
        }
      }
    }
  }, [projectData, timeline, projectId]);

  // Save timeline state to project whenever it changes
  useEffect(() => {
    if (
      projectId &&
      timeline &&
      tracks &&
      tracks.length > 0 &&
      trackItemsMap &&
      typeof trackItemsMap === "object" &&
      trackItemsMap !== null &&
      Object.keys(trackItemsMap).length > 0
    ) {
      // Debounce saving to avoid too many writes
      const timeoutId = setTimeout(() => {
        updateProjectTimeline({
          tracks: tracks || [],
          trackItems: trackItemsMap || {},
          transitions: transitionsMap || {},
          compositions: compositions || [],
        });
      }, 1000); // Save after 1 second of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [
    projectId,
    timeline,
    tracks,
    trackItemsMap,
    transitionsMap,
    compositions,
    updateProjectTimeline,
  ]);

  // Load timeline state from project when project data is loaded
  useEffect(() => {
    if (projectData && timeline) {
      // Check if we have valid timeline data to load
      const hasValidTracks =
        projectData.timeline?.tracks &&
        Array.isArray(projectData.timeline.tracks) &&
        projectData.timeline.tracks.length > 0;

      const hasValidTrackItems =
        projectData.timeline?.trackItems &&
        typeof projectData.timeline.trackItems === "object" &&
        projectData.timeline.trackItems !== null &&
        Object.keys(projectData.timeline.trackItems).length > 0;

      if (hasValidTracks && hasValidTrackItems) {
        // Check if we've already loaded this project's timeline
        const timelineLoaded = localStorage.getItem(
          `timeline-loaded-${projectId}`
        );
        if (!timelineLoaded) {
          try {
            // Ensure all objects are properly initialized
            // Deep clone to avoid any reference issues
            const clonedTracks = JSON.parse(
              JSON.stringify(projectData.timeline.tracks || [])
            );
            const clonedTrackItems = JSON.parse(
              JSON.stringify(projectData.timeline.trackItems || {})
            );

            // Filter out expired blob URLs from track items
            const itemsToRemove: string[] = [];
            for (const key in clonedTrackItems) {
              const item = clonedTrackItems[key];
              if (item?.details?.src && typeof item.details.src === "string") {
                if (item.details.src.startsWith("blob:")) {
                  console.error(
                    `⚠️ Media with expired blob URL detected for track item "${
                      item.name || key
                    }"`
                  );
                  console.error(`   Blob URL: ${item.details.src}`);
                  itemsToRemove.push(key);
                  // Remove the track item with expired blob URL
                  delete clonedTrackItems[key];
                }
              }
            }

            // Remove items from tracks
            if (itemsToRemove.length > 0) {
              console.error(
                `❌ Removed ${itemsToRemove.length} track item(s) with expired blob URLs`
              );
              console.error(`   Affected items: ${itemsToRemove.join(", ")}`);
              for (const track of clonedTracks) {
                if (track.items && Array.isArray(track.items)) {
                  track.items = track.items.filter(
                    (itemId: string) => !itemsToRemove.includes(itemId)
                  );
                }
              }
            }

            const payload = {
              tracks: clonedTracks,
              trackItems: clonedTrackItems,
              transitions: JSON.parse(
                JSON.stringify(
                  projectData.timeline.transitions &&
                    typeof projectData.timeline.transitions === "object" &&
                    projectData.timeline.transitions !== null
                    ? projectData.timeline.transitions
                    : {}
                )
              ),
              compositions: JSON.parse(
                JSON.stringify(
                  Array.isArray(projectData.timeline.compositions)
                    ? projectData.timeline.compositions
                    : []
                )
              ),
            };

            // Validate payload before dispatching
            // Only dispatch if we have track items remaining after filtering
            if (
              payload.tracks &&
              payload.trackItems &&
              Object.keys(payload.trackItems).length > 0
            ) {
              try {
                // Restore timeline state from project
                dispatch(DESIGN_LOAD, { payload });
                // Mark as loaded to prevent re-loading
                localStorage.setItem(`timeline-loaded-${projectId}`, "true");
              } catch (dispatchError) {
                console.error(
                  "Error during DESIGN_LOAD dispatch:",
                  dispatchError
                );
                console.error("Payload that caused error:", payload);
              }
            } else {
              // Mark as loaded even if no items to prevent re-attempting
              localStorage.setItem(`timeline-loaded-${projectId}`, "true");
            }
          } catch (error) {
            console.error("Error loading timeline state:", error);
          }
        }
      }
    }
  }, [projectData, timeline, projectId]);

  // Load transcripts from project when project data is loaded
  useEffect(() => {
    if (projectData?.transcripts && projectData.transcripts.length > 0) {
      // Load transcripts into the transcript store
      initSegments(projectData.transcripts);
    }
  }, [projectData, initSegments]);

  // Save transcripts to project whenever they change
  useEffect(() => {
    if (projectId && segments.length > 0) {
      // Debounce saving to avoid too many writes
      const timeoutId = setTimeout(() => {
        updateProjectTranscripts(segments);
      }, 1000); // Save after 1 second of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [projectId, segments, updateProjectTranscripts]);

  const { setCompactFonts, setFonts } = useDataState();

  useEffect(() => {
    if (tempId) {
      const fetchVideoJson = async () => {
        try {
          const response = await fetch(
            `https://scheme.combo.sh/video-json/${id}`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();

          const payload = data.videoJson.json;
          if (payload) {
            dispatch(DESIGN_LOAD, { payload });
          }
        } catch (error) {
          console.error("Error fetching video JSON:", error);
        }
      };
      fetchVideoJson();
    }

    if (id) {
      const fetchSceneById = async () => {
        try {
          const response = await fetch(`/api/scene/${id}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log("Fetched scene data:", data);

          if (data.success && data.scene) {
            // Set project name if available
            if (data.project?.name) {
              setProjectName(data.project.name);
            }

            // Load the scene content into the editor
            if (data.scene.content) {
              dispatch(DESIGN_LOAD, { payload: data.scene.content });
            }
          } else {
            console.error("Failed to fetch scene:", data.error);
          }
        } catch (error) {
          console.error("Error fetching scene by ID:", error);
        }
      };
      fetchSceneById();
    }
  }, [id, tempId]);

  useEffect(() => {
    console.log("scene", scene);
    console.log("timeline", timeline);
    if (scene && timeline) {
      console.log("scene", scene);
      dispatch(DESIGN_LOAD, { payload: scene });
    }
  }, [scene, timeline]);

  useEffect(() => {
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
  }, []);

  useEffect(() => {
    loadFonts([
      {
        name: SECONDARY_FONT,
        url: SECONDARY_FONT_URL,
      },
    ]);
  }, []);

  useEffect(() => {
    const screenHeight = window.innerHeight;
    const desiredHeight = 300;
    const percentage = (desiredHeight / screenHeight) * 100;
    timelinePanelRef.current?.resize(percentage);
  }, []);

  const handleTimelineResize = () => {
    const timelineContainer = document.getElementById("timeline-container");
    if (!timelineContainer) return;

    timeline?.resize(
      {
        height: timelineContainer.clientHeight - 90,
        width: timelineContainer.clientWidth - 40,
      },
      {
        force: true,
      }
    );

    // Trigger zoom recalculation when timeline is resized
    setTimeout(() => {
      sceneRef.current?.recalculateZoom();
    }, 100);
  };

  useEffect(() => {
    const onResize = () => handleTimelineResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [timeline]);

  useEffect(() => {
    if (activeIds.length === 1) {
      const [id] = activeIds;
      const trackItem = trackItemsMap[id];
      if (trackItem) {
        setTrackItem(trackItem);
        setLayoutTrackItem(trackItem);
      } else console.log(transitionsMap[id]);
    } else {
      setTrackItem(null);
      setLayoutTrackItem(null);
    }
  }, [activeIds, trackItemsMap]);

  useEffect(() => {
    setFloatingControl("");
    setLabelControlItem("");
    setTypeControlItem("");
  }, [isLargeScreen]);

  useEffect(() => {
    setLoaded(true);
  }, []);

  // State for showing/hiding transcript
  const [showTranscript] = useState(true);

  return (
    <div className="flex h-screen w-screen flex-col">
      <PlayerTimeEmitter />
      <Navbar
        projectName={projectName}
        user={null}
        stateManager={stateManager}
        setProjectName={setProjectName}
      />
      <div className="flex flex-1">
        {/* {isLargeScreen && (
					<div className="bg-muted  flex flex-none border-r border-border/80 h-[calc(100vh-44px)]">
						<MenuList />
						<MenuItem />
					</div>
				)} */}
        <ResizablePanelGroup style={{ flex: 1 }} direction="vertical">
          <ResizablePanel className="relative" defaultSize={70}>
            <FloatingControl />
            <div className="flex h-full flex-1">
              {/* Scene and Transcript side by side */}
              <div className="flex w-full h-full">
                {/* Scene/Preview area */}
                <div
                  style={{
                    width:
                      showTranscript && isLargeScreen
                        ? "calc(100% - 400px)"
                        : "100%",
                    height: "100%",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <CropModal />
                  <Scene ref={sceneRef} stateManager={stateManager} />
                </div>

                {/* Transcript panel - only on large screens */}
                {showTranscript && isLargeScreen && (
                  <div style={{ width: "400px", height: "100%" }}>
                    <TranscriptEditor />
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            className="min-h-[50px]"
            ref={timelinePanelRef}
            defaultSize={30}
            onResize={handleTimelineResize}
          >
            {playerRef && <Timeline stateManager={stateManager} />}
          </ResizablePanel>
          {!isLargeScreen && !trackItem && loaded && <MenuListHorizontal />}
          {!isLargeScreen && trackItem && <ControlItemHorizontal />}
        </ResizablePanelGroup>
        <ControlItem />
      </div>
    </div>
  );
};

export default Editor;
