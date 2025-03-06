import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import vercel from "vite-plugin-vercel";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: process.env.PORT as unknown as number,
  },
  plugins: [
    react(),
    tailwindcss(),
    vercel(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "ryOS",
        short_name: "ryOS",
        description: "A web-based operating system experience",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        icons: [
          {
            src: "/icons/mac.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/mac.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}",
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  vercel: {
    defaultSupportsResponseStreaming: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
          ],
          audio: ["tone", "wavesurfer.js", "audio-buffer-utils"],
        },
      },
    },
    sourcemap: false,
    minify: true,
  },
});
