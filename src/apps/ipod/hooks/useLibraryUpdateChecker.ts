import { useEffect, useRef } from "react";
import { useIpodStore } from "@/stores/useIpodStore";
import { toast } from "sonner";

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export function useLibraryUpdateChecker(isActive: boolean) {
  const checkForLibraryUpdate = useIpodStore(
    (state) => state.checkForLibraryUpdate
  );
  const mergeLibraryUpdate = useIpodStore((state) => state.mergeLibraryUpdate);
  const syncLibrary = useIpodStore((state) => state.syncLibrary);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      // Clear interval when app is not active
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkForUpdates = async () => {
      try {
        // Use track-based comparison instead of version-based to avoid timing issues
        const { tracks: serverTracks, version: serverVersion } =
          await (async () => {
            const res = await fetch("/data/ipod-videos.json");
            const data = await res.json();
            const videos: unknown[] = data.videos || data;
            const version = data.version || 1;
            const tracks = videos.map((v) => {
              const video = v as Record<string, unknown>;
              return {
                id: video.id as string,
                url: video.url as string,
                title: video.title as string,
                artist: video.artist as string | undefined,
                album: (video.album as string | undefined) ?? "",
                lyricOffset: video.lyricOffset as number | undefined,
              };
            });
            return { tracks, version };
          })();

        const currentTracks = useIpodStore.getState().tracks;
        const existingIds = new Set(currentTracks.map((track) => track.id));

        // Find tracks that are on the server but not in the user's library
        const tracksToAdd = serverTracks.filter(
          (track) => !existingIds.has(track.id)
        );

        // Also check for track updates (metadata changes)
        let tracksUpdated = 0;
        const serverTrackMap = new Map(
          serverTracks.map((track) => [track.id, track])
        );
        currentTracks.forEach((currentTrack) => {
          const serverTrack = serverTrackMap.get(currentTrack.id);
          if (serverTrack) {
            const hasChanges =
              currentTrack.title !== serverTrack.title ||
              currentTrack.artist !== serverTrack.artist ||
              currentTrack.album !== serverTrack.album ||
              currentTrack.url !== serverTrack.url ||
              currentTrack.lyricOffset !== serverTrack.lyricOffset;
            if (hasChanges) tracksUpdated++;
          }
        });

        const newTracksCount = tracksToAdd.length;
        const wasEmpty = currentTracks.length === 0;

        console.log("[iPod] Library update check result:", {
          serverVersion,
          newTracksCount,
          tracksUpdated,
          currentLastKnownVersion: useIpodStore.getState().lastKnownVersion,
          currentTracksCount: currentTracks.length,
          serverTracksCount: serverTracks.length,
        });

        if (newTracksCount > 0 || tracksUpdated > 0) {
          if (newTracksCount > 0) {
            toast.info("Library Update Available", {
              description: `${newTracksCount} new song${
                newTracksCount === 1 ? "" : "s"
              }${
                tracksUpdated > 0
                  ? ` and ${tracksUpdated} track update${
                      tracksUpdated === 1 ? "" : "s"
                    }`
                  : ""
              } available`,
              action: {
                label: "Update Library",
                onClick: async () => {
                  try {
                    const result = await syncLibrary();
                    const message =
                      wasEmpty && result.newTracksAdded > 0
                        ? `Added ${result.newTracksAdded} song${
                            result.newTracksAdded === 1 ? "" : "s"
                          }. First song ready to play!`
                        : `Added ${result.newTracksAdded} new song${
                            result.newTracksAdded === 1 ? "" : "s"
                          }${
                            result.tracksUpdated
                              ? ` and updated ${result.tracksUpdated} track${
                                  result.tracksUpdated === 1 ? "" : "s"
                                }`
                              : ""
                          }`;

                    toast.success("Library Updated", {
                      description: message,
                    });
                  } catch (error) {
                    console.error("Error updating library:", error);
                    toast.error("Update Failed", {
                      description: "Failed to update library",
                    });
                  }
                },
              },
              duration: 8000, // Give user time to see and act on the notification
            });
          } else if (tracksUpdated > 0) {
            // Silent update for metadata changes only
            try {
              await syncLibrary();
              console.log(
                `[iPod] Auto-updated ${tracksUpdated} track metadata`
              );
            } catch (error) {
              console.error("Error auto-updating track metadata:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error checking for library updates:", error);
      }
    };

    // Always check immediately when app becomes active (with a small delay to allow store to rehydrate)
    const immediateCheckTimeout = setTimeout(() => {
      console.log(
        "[iPod] Running immediate library update check on app activation"
      );
      checkForUpdates();
      lastCheckedRef.current = Date.now();
    }, 100);

    // Set up periodic checking
    intervalRef.current = setInterval(() => {
      checkForUpdates();
      lastCheckedRef.current = Date.now();
    }, CHECK_INTERVAL);

    return () => {
      clearTimeout(immediateCheckTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, checkForLibraryUpdate, mergeLibraryUpdate]);

  // Manual check function that can be called externally
  const manualCheck = async () => {
    try {
      const result = await checkForLibraryUpdate();
      if (result.hasUpdate && result.newTracks.length > 0) {
        const currentTracks = useIpodStore.getState().tracks;
        const existingIds = new Set(currentTracks.map((track) => track.id));
        const newTracksCount = result.newTracks.filter(
          (track) => !existingIds.has(track.id)
        ).length;

        if (newTracksCount > 0) {
          mergeLibraryUpdate(result.newTracks, result.newVersion);
          toast.success("Library Updated", {
            description: `Added ${newTracksCount} new song${
              newTracksCount === 1 ? "" : "s"
            } to your library`,
          });
          return true;
        } else {
          mergeLibraryUpdate(result.newTracks, result.newVersion);
          toast.info("No Updates", {
            description: "Your library is already up to date",
          });
          return false;
        }
      } else {
        toast.info("No Updates", {
          description: "Your library is already up to date",
        });
        return false;
      }
    } catch (error) {
      console.error("Error during manual library update check:", error);
      toast.error("Update Check Failed", {
        description: "Failed to check for library updates",
      });
      return false;
    }
  };

  // Manual sync function that syncs with server library
  const manualSync = async () => {
    try {
      const wasEmptyBefore = useIpodStore.getState().tracks.length === 0;
      const result = await syncLibrary();

      if (result.newTracksAdded > 0 || result.tracksUpdated > 0) {
        const message =
          wasEmptyBefore && result.newTracksAdded > 0
            ? `Added ${result.newTracksAdded} song${
                result.newTracksAdded === 1 ? "" : "s"
              }. First song ready to play!`
            : `Added ${result.newTracksAdded} new song${
                result.newTracksAdded === 1 ? "" : "s"
              }${
                result.tracksUpdated > 0
                  ? ` and updated ${result.tracksUpdated} track${
                      result.tracksUpdated === 1 ? "" : "s"
                    }`
                  : ""
              }. Total: ${result.totalTracks} songs`;

        toast.success("Library Synced", {
          description: message,
        });
      } else {
        toast.info("Library Synced", {
          description: `Library is up to date with ${result.totalTracks} songs`,
        });
      }
      return true;
    } catch (error) {
      console.error("Error during library sync:", error);
      toast.error("Sync Failed", {
        description: "Failed to sync with server library",
      });
      return false;
    }
  };

  return { manualCheck, manualSync };
}
