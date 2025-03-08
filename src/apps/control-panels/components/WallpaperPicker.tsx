import { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWallpaper } from "@/hooks/useWallpaper";
import { useSound, Sounds } from "@/hooks/useSound";
import {
  DisplayMode,
  loadDisplayMode,
  applyDisplayMode,
} from "@/utils/displayMode";
import { Upload } from "lucide-react";

// Import constants from useFileSystem
const DB_NAME = "ryOS";
const DB_VERSION = 2;
const CUSTOM_WALLPAPERS_STORE = "custom_wallpapers";

interface WallpaperItemProps {
  path: string;
  isSelected: boolean;
  onClick: () => void;
  isTile?: boolean;
}

function WallpaperItem({
  path,
  isSelected,
  onClick,
  isTile = false,
}: WallpaperItemProps) {
  const { play: playClick } = useSound(Sounds.BUTTON_CLICK, 0.3);

  const handleClick = () => {
    playClick();
    onClick();
  };

  return (
    <div
      className={`w-full ${
        isTile ? "aspect-square" : "aspect-video"
      } border-2 cursor-pointer hover:opacity-90 ${
        isSelected ? "ring-2 ring-black border-white" : "border-transparent"
      }`}
      style={{
        backgroundImage: `url(${path})`,
        backgroundSize: isTile ? "64px 64px" : "cover",
        backgroundPosition: isTile ? undefined : "center",
        backgroundRepeat: isTile ? "repeat" : undefined,
      }}
      onClick={handleClick}
    />
  );
}

type PhotoCategory =
  | "3d_graphics"
  | "convergency"
  | "foliage"
  | "landscapes"
  | "nostalgia"
  | "objects"
  | "structures"
  | "custom";

const TILE_WALLPAPERS = [
  "default",
  "macos",
  "bondi",
  "bondi_dark",
  "bondi_light",
  "bondi_medium",
  "bondi_extra_dark",
  "french_blue_dark",
  "french_blue_light",
  "sunny",
  "sunny_dark",
  "sunny_light",
  "poppy",
  "poppy_dark",
  "poppy_light",
  "poppy_medium",
  "azul_dark",
  "azul_light",
  "azul_extra_light",
  "pistachio_dark",
  "pistachio_light",
  "pistachio_medium",
  "candy_bar",
  "candy_bar_sunny",
  "candy_bar_pistachio",
  "candy_bar_azul",
  "waves_sunny",
  "waves_bondi",
  "waves_azul",
  "ripple_poppy",
  "ripple_bondi",
  "ripple_azul",
  "rio_pistachio",
  "rio_azul",
  "bubbles_poppy",
  "bubbles_bondi",
  "bossanova_poppy",
  "bossanova_poppy_2",
  "bossanova_bondi",
  "diagonals_poppy",
  "diagonals_bondi",
  "diagonals_bondi_dark",
  "flat_peanuts",
  "flat_peanuts_poppy",
  "peanuts_pistachio",
  "peanuts_azul",
].map((name) => `/wallpapers/tiles/${name}.png`);

const PHOTO_WALLPAPERS: Record<PhotoCategory, string[]> = {
  "3d_graphics": [
    "capsule",
    "capsule_azul",
    "capsule_pistachio",
    "tub",
    "tub_azul",
    "tub_bondi",
    "ufo_1",
    "ufo_2",
    "ufo_3",
  ],
  convergency: Array.from({ length: 15 }, (_, i) => `convergence_${i + 1}`),
  foliage: [
    "blue_flowers",
    "cactus",
    "golden_poppy",
    "red_cyclamens",
    "red_tulips",
    "rose",
    "spider_lily",
    "waterdrops_on_leaf",
    "yellow_tulips",
  ],
  landscapes: [
    "beach",
    "clouds",
    "french_alps",
    "ganges_river",
    "golden_gate_at_dusk",
    "mono_lake",
    "palace_on_lake_in_jaipur",
    "rain_god_mesa",
    "refuge-col_de_la_grasse-alps",
    "zabriskie_point",
  ],
  nostalgia: [
    "acropolis",
    "beach_on_ko_samui",
    "birds_in_flight",
    "cancun_sunset",
    "cliffs_of_moher",
    "fish_eagle",
    "galway_bay",
    "glacier_national_park",
    "highway_395",
    "hong_kong_at_night",
    "islamorada_sunrise",
    "lily_pad",
    "long_island_sound",
    "mac_os_background",
    "midsummer_night",
    "moraine_lake",
    "oasis_in_baja",
    "red_clouds",
    "toronto_skyline",
    "tuolumne_meadows",
    "yosemite_valley",
    "yucatan",
  ],
  objects: [
    "alpine_granite",
    "bicycles",
    "bottles",
    "burmese_claypots",
    "burning_candle",
    "chairs",
    "faucet_handle",
    "neon",
    "salt_shaker_top",
    "shamus",
  ],
  structures: [
    "gate",
    "gate_lock",
    "glass_door_knob",
    "padlock",
    "rusty_lock",
    "shutters",
    "stone_wall",
    "wall_of_stones",
  ],
  custom: [], // This will be populated dynamically
};

// Transform photo paths
Object.entries(PHOTO_WALLPAPERS).forEach(([category, photos]) => {
  PHOTO_WALLPAPERS[category as PhotoCategory] = photos.map(
    (name) => `/wallpapers/photos/${category}/${name}.jpg`
  );
});

const PHOTO_CATEGORIES = Object.keys(PHOTO_WALLPAPERS) as PhotoCategory[];

interface WallpaperPickerProps {
  onSelect?: (path: string) => void;
}

export function WallpaperPicker({ onSelect }: WallpaperPickerProps) {
  const { currentWallpaper, setWallpaper } = useWallpaper();
  const { play: playClick } = useSound(Sounds.BUTTON_CLICK, 0.3);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() =>
    loadDisplayMode()
  );
  const [customWallpapers, setCustomWallpapers] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<
    "tiles" | PhotoCategory
  >(() => {
    // Set initial category based on current wallpaper
    if (currentWallpaper.includes("/wallpapers/tiles/")) {
      return "tiles";
    }
    if (currentWallpaper.includes("/custom-wallpapers/")) {
      return "custom";
    }
    for (const category of PHOTO_CATEGORIES) {
      if (currentWallpaper.includes(`/wallpapers/photos/${category}/`)) {
        return category;
      }
    }
    return "tiles";
  });

  // Load custom wallpapers from IndexedDB
  useEffect(() => {
    const loadCustomWallpapers = async () => {
      try {
        // Use IndexedDB to get custom wallpapers
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, DB_VERSION);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(CUSTOM_WALLPAPERS_STORE)) {
              db.createObjectStore(CUSTOM_WALLPAPERS_STORE, {
                keyPath: "name",
              });
            }
          };
        });

        // Check if the store exists before attempting to use it
        if (db.objectStoreNames.contains(CUSTOM_WALLPAPERS_STORE)) {
          const transaction = db.transaction(
            CUSTOM_WALLPAPERS_STORE,
            "readonly"
          );
          const store = transaction.objectStore(CUSTOM_WALLPAPERS_STORE);
          const request = store.getAll();

          request.onsuccess = () => {
            const wallpapers = request.result;
            if (wallpapers && wallpapers.length > 0) {
              setCustomWallpapers(wallpapers.map((wp) => wp.content));
            }
          };
        }
      } catch (error) {
        console.error("Error loading custom wallpapers:", error);
      }
    };

    loadCustomWallpapers();
  }, []);

  const handleWallpaperSelect = (path: string) => {
    setWallpaper(path);
    playClick();
    if (onSelect) {
      onSelect(path);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    try {
      // Read the file as data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Save to IndexedDB - always use version 2
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        // This is crucial - we need to create the store during an upgrade
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(CUSTOM_WALLPAPERS_STORE)) {
            db.createObjectStore(CUSTOM_WALLPAPERS_STORE, { keyPath: "name" });
          }
        };
      });

      // Check if the store exists
      if (!db.objectStoreNames.contains(CUSTOM_WALLPAPERS_STORE)) {
        // If it doesn't exist, we need to close the database and reopen it with a higher version
        db.close();
        const upgradeRequest = indexedDB.open(DB_NAME, 3);

        upgradeRequest.onupgradeneeded = (event) => {
          const upgradedDb = (event.target as IDBOpenDBRequest).result;
          if (!upgradedDb.objectStoreNames.contains(CUSTOM_WALLPAPERS_STORE)) {
            upgradedDb.createObjectStore(CUSTOM_WALLPAPERS_STORE, {
              keyPath: "name",
            });
          }
        };

        await new Promise<void>((resolve, reject) => {
          upgradeRequest.onsuccess = () => {
            resolve();
          };
          upgradeRequest.onerror = () => reject(upgradeRequest.error);
        });

        // Now reopen the database with the new version
        db.close();
        const reopenRequest = indexedDB.open(DB_NAME, 3);
        const reopenedDb = await new Promise<IDBDatabase>((resolve, reject) => {
          reopenRequest.onsuccess = () => resolve(reopenRequest.result);
          reopenRequest.onerror = () => reject(reopenRequest.error);
        });

        const transaction = reopenedDb.transaction(
          CUSTOM_WALLPAPERS_STORE,
          "readwrite"
        );
        const store = transaction.objectStore(CUSTOM_WALLPAPERS_STORE);
        const wallpaper = {
          name: `custom_${Date.now()}_${file.name}`,
          content: dataUrl,
          type: file.type,
        };

        const request = store.put(wallpaper);

        request.onsuccess = () => {
          // Update state with new wallpaper
          setCustomWallpapers((prev) => [...prev, dataUrl]);
          // Automatically select the new wallpaper
          setWallpaper(dataUrl);
          setSelectedCategory("custom");
          playClick();
        };

        request.onerror = () => {
          console.error("Error saving custom wallpaper:", request.error);
        };
      } else {
        // If the store exists, proceed normally
        const transaction = db.transaction(
          CUSTOM_WALLPAPERS_STORE,
          "readwrite"
        );
        const store = transaction.objectStore(CUSTOM_WALLPAPERS_STORE);
        const wallpaper = {
          name: `custom_${Date.now()}_${file.name}`,
          content: dataUrl,
          type: file.type,
        };

        const request = store.put(wallpaper);

        request.onsuccess = () => {
          // Update state with new wallpaper
          setCustomWallpapers((prev) => [...prev, dataUrl]);
          // Automatically select the new wallpaper
          setWallpaper(dataUrl);
          setSelectedCategory("custom");
          playClick();
        };

        request.onerror = () => {
          console.error("Error saving custom wallpaper:", request.error);
        };
      }
    } catch (error) {
      console.error("Error processing file:", error);
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Force rerender when wallpaper changes
  useEffect(() => {
    if (currentWallpaper.includes("/wallpapers/tiles/")) {
      setSelectedCategory("tiles");
    } else if (customWallpapers.includes(currentWallpaper)) {
      setSelectedCategory("custom");
    } else {
      for (const category of PHOTO_CATEGORIES) {
        if (currentWallpaper.includes(`/wallpapers/photos/${category}/`)) {
          setSelectedCategory(category);
          break;
        }
      }
    }
  }, [currentWallpaper, customWallpapers]);

  const formatCategoryLabel = (category: string) => {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
    applyDisplayMode(mode);
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center gap-2">
        <div className="flex-[3]">
          <Select
            value={selectedCategory}
            onValueChange={(value) =>
              setSelectedCategory(value as typeof selectedCategory)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tiles">Tiled Patterns</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              {PHOTO_CATEGORIES.filter((cat) => cat !== "custom").map(
                (category) => (
                  <SelectItem key={category} value={category}>
                    {formatCategoryLabel(category)}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <Select value={displayMode} onValueChange={handleDisplayModeChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="color">Color</SelectItem>
            <SelectItem value="monotone">Mono</SelectItem>
            <SelectItem value="crt">CRT</SelectItem>
            <SelectItem value="sepia">Sepia</SelectItem>
            <SelectItem value="high-contrast">High Contrast</SelectItem>
            <SelectItem value="dream">Dream</SelectItem>
            <SelectItem value="invert">Invert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedCategory === "custom" && (
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      )}

      <ScrollArea className="flex-1 h-[200px]">
        <div
          className={`grid gap-2 p-1 ${
            selectedCategory === "tiles" ? "grid-cols-8" : "grid-cols-3"
          }`}
        >
          {selectedCategory === "tiles" ? (
            TILE_WALLPAPERS.map((path) => (
              <WallpaperItem
                key={path}
                path={path}
                isSelected={currentWallpaper === path}
                onClick={() => handleWallpaperSelect(path)}
                isTile
              />
            ))
          ) : selectedCategory === "custom" ? (
            <>
              <div
                className="w-full aspect-video border-[2px] border-dotted border-gray-400 cursor-pointer hover:opacity-90 flex items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-5 w-5 text-gray-500" />
              </div>
              {customWallpapers.length > 0 ? (
                customWallpapers.map((path) => (
                  <WallpaperItem
                    key={path}
                    path={path}
                    isSelected={currentWallpaper === path}
                    onClick={() => handleWallpaperSelect(path)}
                  />
                ))
              ) : (
                <></>
              )}
            </>
          ) : PHOTO_WALLPAPERS[selectedCategory] ? (
            PHOTO_WALLPAPERS[selectedCategory].map((path) => (
              <WallpaperItem
                key={path}
                path={path}
                isSelected={currentWallpaper === path}
                onClick={() => handleWallpaperSelect(path)}
              />
            ))
          ) : (
            <div className="col-span-4 text-center py-8 text-gray-500">
              Photos coming soon for this category...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
