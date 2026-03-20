import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

const resolveOptionalPeerDeps = {
  name: "resolve-optional-peer-deps",
  resolveId(id: string) {
    if (id.startsWith("__vite-optional-peer-dep:react:")) return "react";
    if (id.startsWith("__vite-optional-peer-dep:react-dom:")) return "react-dom";
  },
};

export default defineConfig({
  plugins: [resolveOptionalPeerDeps, react(), viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: "mcp-app.html",
    },
  },
});
