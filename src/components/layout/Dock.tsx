import { useMemo, useRef, useState, useCallback } from "react";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAppStoreShallow } from "@/stores/helpers";
import { ThemedIcon } from "@/components/shared/ThemedIcon";
import { AppId, getAppIconPath } from "@/config/appRegistry";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { AnimatePresence, motion } from "framer-motion";

function MacDock() {

  const {
    instances,
    instanceOrder,
    bringInstanceToForeground,
  } = useAppStoreShallow((s) => ({
    instances: s.instances,
    instanceOrder: s.instanceOrder,
    bringInstanceToForeground: s.bringInstanceToForeground,
  }));

  const launchApp = useLaunchApp();

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
    // No open instance found
  };

  // Finder-specific: bring existing to foreground, otherwise launch one
  const focusOrLaunchFinder = useCallback(
    (initialPath?: string) => {
      // Try focusing existing Finder instance
      for (let i = instanceOrder.length - 1; i >= 0; i--) {
        const id = instanceOrder[i];
        const inst = instances[id];
        if (inst && inst.appId === "finder" && inst.isOpen) {
          bringInstanceToForeground(id);
          return;
        }
      }
      // None open; launch new Finder instance (multi-window supported by hook)
      if (initialPath) launchApp("finder", { initialPath });
      else launchApp("finder", { initialPath: "/" });
    },
    [instances, instanceOrder, bringInstanceToForeground, launchApp]
  );

  // Dock magnification state/logic
  const iconRefs = useRef<HTMLButtonElement[]>([]);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const SIGMA = 40; // spread of magnification effect (px)
  const MAX_SCALE = 1.8; // peak scale at cursor center

  const getScaleForIndex = useCallback(
    (index: number) => {
      if (mouseX == null) return 1;
      const el = iconRefs.current[index];
      if (!el) return 1;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const distance = Math.abs(mouseX - centerX);
      const gaussian = Math.exp(-(distance * distance) / (2 * SIGMA * SIGMA));
      return 1 + (MAX_SCALE - 1) * gaussian;
    },
    [mouseX]
  );

  let runningIndex = 0; // single pass index to keep refs/scales aligned across sections

  const IconButton = ({
    label,
    onClick,
    icon,
    index,
  }: {
    label: string;
    onClick: () => void;
    icon: string;
    index: number;
  }) => {
    const scale = getScaleForIndex(index);
    return (
      <motion.button
        aria-label={label}
        title={label}
        onClick={onClick}
        ref={(el) => {
          if (el) iconRefs.current[index] = el;
        }}
        className="relative flex items-center justify-center w-12 h-12 mx-1"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, mass: 0.6 }}
        style={{
          transformOrigin: "bottom center",
          willChange: "transform",
        }}
      >
        <ThemedIcon
          name={icon}
          alt={label}
          className="w-10 h-10 select-none pointer-events-none"
          draggable={false}
          style={{ imageRendering: "-webkit-optimize-contrast" }}
        />
      </motion.button>
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
          onMouseMove={(e) => setMouseX(e.clientX)}
          onMouseLeave={() => setMouseX(null)}
        >
          {/* Left pinned */}
          {pinnedLeft.map((appId) => {
            const icon = getAppIconPath(appId);
            const idx = runningIndex++;
            return (
              <IconButton
                key={appId}
                index={idx}
                label={appId}
                icon={icon}
                onClick={() => {
                  if (appId === "finder") {
                    focusOrLaunchFinder("/");
                  } else {
                    focusMostRecentInstanceOfApp(appId);
                  }
                }}
              />
            );
          })}
          
          {/* Open apps dynamically (excluding pinned) */}
          <AnimatePresence initial={false}>
            {openAppIds.map((appId) => {
              const icon = getAppIconPath(appId);
              const idx = runningIndex++;
              return (
                <IconButton
                  key={appId}
                  index={idx}
                  label={appId}
                  icon={icon}
                  onClick={() => focusMostRecentInstanceOfApp(appId)}
                />
              );
            })}
          </AnimatePresence>
          
          {/* Trash (right side) */}
          {(() => {
            const idx = runningIndex++;
            return (
              <IconButton
                index={idx}
                label="Trash"
                icon="trash-empty.png"
                onClick={() => {
                  // Bring existing Finder to foreground if any; otherwise launch at Trash
                  for (let i = instanceOrder.length - 1; i >= 0; i--) {
                    const id = instanceOrder[i];
                    const inst = instances[id];
                    if (inst && inst.appId === "finder" && inst.isOpen) {
                      bringInstanceToForeground(id);
                      return;
                    }
                  }
                  launchApp("finder", { initialPath: "/Trash" });
                }}
              />
            );
          })()}
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