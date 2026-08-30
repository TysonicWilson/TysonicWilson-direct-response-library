import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./", // relative base so the built app is portable to any subpath (e.g. GitHub Pages project sites)
  plugins: [react()],
});
