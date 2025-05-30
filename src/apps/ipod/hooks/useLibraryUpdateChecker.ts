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
        const result = await checkForLibraryUpdate();
        if (result.hasUpdate && result.newTracks.length > 0) {
          const currentTracks = useIpodStore.getState().tracks;
          const existingIds = new Set(currentTracks.map((track) => track.id));
          const newTracksCount = result.newTracks.filter(
            (track) => !existingIds.has(track.id)
          ).length;
          const wasEmpty = currentTracks.length === 0;

          if (newTracksCount > 0) {
            toast.info("Library Update Available", {
              description: `${newTracksCount} new song${
                newTracksCount === 1 ? "" : "s"
              } available`,
              action: {
                label: "Update Library",
                onClick: () => {
                  mergeLibraryUpdate(result.newTracks, result.newVersion);
                  const message =
                    wasEmpty && newTracksCount > 0
                      ? `Added ${newTracksCount} song${
                          newTracksCount === 1 ? "" : "s"
                        }. First song ready to play!`
                      : `Added ${newTracksCount} new song${
                          newTracksCount === 1 ? "" : "s"
                        } to your library`;

                  toast.success("Library Updated", {
                    description: message,
                  });
                },
              },
              duration: 8000, // Give user time to see and act on the notification
            });
          } else {
            // Version updated but no new tracks to add
            mergeLibraryUpdate(result.newTracks, result.newVersion);
          }
        }
      } catch (error) {
        console.error("Error checking for library updates:", error);
      }
    };

    // Check immediately if we haven't checked recently
    const now = Date.now();
    if (now - lastCheckedRef.current > CHECK_INTERVAL) {
      checkForUpdates();
      lastCheckedRef.current = now;
    }

    // Set up periodic checking
    intervalRef.current = setInterval(() => {
      checkForUpdates();
      lastCheckedRef.current = Date.now();
    }, CHECK_INTERVAL);

    return () => {
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

      if (result.newTracksAdded > 0) {
        const message =
          wasEmptyBefore && result.newTracksAdded > 0
            ? `Added ${result.newTracksAdded} song${
                result.newTracksAdded === 1 ? "" : "s"
              }. First song ready to play!`
            : `Added ${result.newTracksAdded} new song${
                result.newTracksAdded === 1 ? "" : "s"
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
