import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from "@tailwindcss/vite"
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: "/karakokey/",
  plugins: [
    svelte(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      }, manifest: {
        name: "Karakokey",
        short_name: "Karakokey",
        description: "A digitalized KTV Machine",
        theme_color: "#121212",
        icons: [{
          src: "karakokey.png",
          sizes: '192x192',
          type: "image/png"
        }, {
          src: "karakokey.png",
          sizes: '512x512',
          type: "image/png"
        }]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
})
