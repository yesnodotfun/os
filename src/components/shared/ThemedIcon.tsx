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

  // Simple passthrough for remote resources (avoid theming logic entirely)
  if (/^https?:\/\//i.test(name)) {
    return <img src={name} alt={alt || name} {...imgProps} />;
  }

  // Legacy-aware initial resolution (may already be themed path or absolute /icons/...)
  const resolved = resolveIconLegacyAware(name, themeOverride ?? currentTheme);

  // If result is a remote URL (in case resolver passed one through) just use it.
  if (/^https?:\/\//i.test(resolved)) {
    return <img src={resolved} alt={alt || name} {...imgProps} />;
  }

  // Derive logical name for async theming only if inside /icons/ path.
  // Strip any query string to avoid duplicating cache-busting params downstream.
  const withoutQuery = resolved.split("?")[0];
  const logical = withoutQuery.startsWith("/icons/")
    ? withoutQuery
        .replace("/icons/default/", "")
        .replace(/^(?:\/icons\/[^/]+\/)/, "")
    : withoutQuery;

  const themedPath = useIconPath(logical, themeOverride ?? currentTheme);

  // Keep it simple: if async path still pending, show resolved immediately. Avoid switching for remote URLs.
  const src = themedPath || resolved;

  return (
    <img
      src={src}
      data-initial-src={resolved}
      alt={alt || name}
      {...imgProps}
    />
  );
};
