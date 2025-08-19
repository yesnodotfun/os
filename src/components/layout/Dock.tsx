import { useMemo } from "react";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAppStoreShallow } from "@/stores/helpers";
import { ThemedIcon } from "@/components/shared/ThemedIcon";
import { AppId, getAppIconPath } from "@/config/appRegistry";

export function Dock() {
  const currentTheme = useThemeStore((s) => s.current);
  const isMacTheme = currentTheme === "macosx";

  const {
    instances,
    instanceOrder,
    foregroundInstanceId,
    bringInstanceToForeground,
    launchOrFocusApp,
  } = useAppStoreShallow((s) => ({
    instances: s.instances,
    instanceOrder: s.instanceOrder,
    foregroundInstanceId: s.foregroundInstanceId,
    bringInstanceToForeground: s.bringInstanceToForeground,
    launchOrFocusApp: s.launchOrFocusApp,
  }));

  // Only render on macOS theme
  if (!isMacTheme) return null;

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

  const isAppOpen = (appId: AppId) => {
    return Object.values(instances).some((i) => i.appId === appId && i.isOpen);
  };

  const isAppForeground = (appId: AppId) => {
    if (!foregroundInstanceId) return false;
    const inst = instances[foregroundInstanceId];
    return Boolean(inst && inst.appId === appId);
  };

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
    open,
    active,
  }: {
    label: string;
    onClick: () => void;
    icon: string;
    open?: boolean;
    active?: boolean;
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
        {/* active indicator */}
        {open ? (
          <span
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: active ? "#0a84ff" : "rgba(255,255,255,0.95)",
              boxShadow: active ? "0 0 6px rgba(10,132,255,0.7)" : "none",
            }}
          />
        ) : null}
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
          className="flex items-center px-2 py-1 shadow-xl"
          style={{
            pointerEvents: "auto",
            backdropFilter: "saturate(120%) blur(12px)",
            WebkitBackdropFilter: "saturate(120%) blur(12px)",
            background:
              "linear-gradient(to bottom, rgba(250,250,250,0.75), rgba(210,210,210,0.65))",
            border: "1px solid rgba(0,0,0,0.2)",
            boxShadow:
              "0 6px 18px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.5)",
            height: 56,
            maxWidth: "min(92vw, 980px)",
          }}
        >
          {/* Left pinned */}
          {pinnedLeft.map((appId) => {
            const icon = getAppIconPath(appId);
            const open = isAppOpen(appId);
            const active = isAppForeground(appId);
            return (
              <IconButton
                key={appId}
                label={appId}
                icon={icon}
                open={open}
                active={active}
                onClick={() => focusMostRecentInstanceOfApp(appId)}
              />
            );
          })}
          
          {/* Open apps dynamically (excluding pinned) */}
          {openAppIds.map((appId) => {
            const icon = getAppIconPath(appId);
            const open = true;
            const active = isAppForeground(appId);
            return (
              <IconButton
                key={appId}
                label={appId}
                icon={icon}
                open={open}
                active={active}
                onClick={() => focusMostRecentInstanceOfApp(appId)}
              />
            );
          })}
          
          {/* Trash (right side) */}
          <IconButton
            label="Trash"
            icon="trash-empty.png"
            open={false}
            active={false}
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

