import { useMemo } from "react";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAppStoreShallow } from "@/stores/helpers";
import { ThemedIcon } from "@/components/shared/ThemedIcon";
import { AppId, getAppIconPath } from "@/config/appRegistry";

function MacDock() {

  const {
    instances,
    instanceOrder,
    bringInstanceToForeground,
    launchOrFocusApp,
  } = useAppStoreShallow((s) => ({
    instances: s.instances,
    instanceOrder: s.instanceOrder,
    bringInstanceToForeground: s.bringInstanceToForeground,
    launchOrFocusApp: s.launchOrFocusApp,
  }));

  // Pinned apps on the left side
  const pinnedLeft: AppId[] = ["finder"] as AppId[];

  // Compute unique open apps (excluding pinned to avoid duplicates)
  const openAppIds = useMemo(() => {
    const openByApp: Record<string, { appId: AppId; firstCreatedAt: number }[]> = {};
    Object.values(instances)
      .filter((i) => i.isOpen)
      .forEach((i) => {
        if (!openByApp[i.appId]) openByApp[i.appId] = [];
        openByApp[i.appId].push({ appId: i.appId as AppId, firstCreatedAt: i.createdAt || 0 });
      });
    const unique: { appId: AppId; sortKey: number }[] = Object.entries(openByApp).map(
      ([appId, arr]) => ({ appId: appId as AppId, sortKey: arr[0]?.firstCreatedAt ?? 0 })
    );
    // Sort by first created time to keep a stable order
    unique.sort((a, b) => a.sortKey - b.sortKey);
    return unique.map((u) => u.appId).filter((id) => !pinnedLeft.includes(id));
  }, [instances]);

  const focusMostRecentInstanceOfApp = (appId: AppId) => {
    // Walk instanceOrder from end to find most recent open instance for appId
    for (let i = instanceOrder.length - 1; i >= 0; i--) {
      const id = instanceOrder[i];
      const inst = instances[id];
      if (inst && inst.appId === appId && inst.isOpen) {
        bringInstanceToForeground(id);
        return;
      }
    }
    // Fallback: launch or focus
    launchOrFocusApp(appId);
  };

  const IconButton = ({
    label,
    onClick,
    icon,
  }: {
    label: string;
    onClick: () => void;
    icon: string;
  }) => {
    return (
      <button
        aria-label={label}
        title={label}
        onClick={onClick}
        className="relative flex items-center justify-center w-12 h-12 mx-1"
        style={{
          transition: "transform 120ms ease, filter 120ms ease",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          willChange: "transform",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.15)";
          (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.05)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.0)";
          (e.currentTarget as HTMLButtonElement).style.filter = "none";
        }}
      >
        <ThemedIcon
          name={icon}
          alt={label}
          className="w-10 h-10 select-none pointer-events-none"
          draggable={false}
          style={{ imageRendering: "-webkit-optimize-contrast" }}
        />
      </button>
    );
  };

  return (
    <div
      className="fixed left-0 right-0 z-50"
      style={{
        bottom: 0,
        pointerEvents: "none",
      }}
    >
      <div
        className="flex w-full items-end justify-center"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div
          className="flex items-center px-2 py-1"
          style={{
            pointerEvents: "auto",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            background: "rgba(248, 248, 248, 0.85)",
            backgroundImage: "var(--os-pinstripe-menubar)",
            border: "none",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            height: 56,
            maxWidth: "min(92vw, 980px)",
          }}
        >
          {/* Left pinned */}
          {pinnedLeft.map((appId) => {
            const icon = getAppIconPath(appId);
            return (
              <IconButton
                key={appId}
                label={appId}
                icon={icon}
                onClick={() => {
                  if (appId === "finder") {
                    window.dispatchEvent(
                      new CustomEvent("launchApp", {
                        detail: { appId: "finder", initialPath: "/" },
                      })
                    );
                  } else {
                    focusMostRecentInstanceOfApp(appId);
                  }
                }}
              />
            );
          })}
          
          {/* Open apps dynamically (excluding pinned) */}
          {openAppIds.map((appId) => {
            const icon = getAppIconPath(appId);
            return (
              <IconButton
                key={appId}
                label={appId}
                icon={icon}
                onClick={() => focusMostRecentInstanceOfApp(appId)}
              />
            );
          })}
          
          {/* Trash (right side) */}
          <IconButton
            label="Trash"
            icon="trash-empty.png"
            onClick={() => {
              // Open Finder at Trash
              window.dispatchEvent(
                new CustomEvent("launchApp", {
                  detail: { appId: "finder", initialPath: "/Trash" },
                })
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function Dock() {
  const currentTheme = useThemeStore((s) => s.current);
  if (currentTheme !== "macosx") return null;
  return <MacDock />;
}