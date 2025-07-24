import React from "react";
import { resolveIconLegacyAware, useIconPath } from "@/utils/icons";
import { useThemeStore } from "@/stores/useThemeStore"; // assuming this exists

export interface ThemedIconProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: string; // file name or relative path within theme folder
  alt?: string;
  themeOverride?: string | null; // manual override theme id
}

export const ThemedIcon: React.FC<ThemedIconProps> = ({
  name,
  alt,
  themeOverride,
  ...imgProps
}) => {
  const currentTheme = useThemeStore?.((s: any) => s.current) || null;
  // Use legacy-aware resolution immediately for a synchronous best guess.
  const resolved = resolveIconLegacyAware(name, themeOverride ?? currentTheme);
  // Still leverage async manifest-based fine-tuning if name was relative.
  const path = useIconPath(
    resolved
      .replace("/icons/default/", "")
      .replace(/^(?:\/icons\/[^/]+\/)/, ""),
    themeOverride ?? currentTheme
  );
  return (
    <img src={resolved} data-final-src={path} alt={alt || name} {...imgProps} />
  );
};
