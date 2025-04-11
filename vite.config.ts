// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
	esbuild: {
		jsxFactory: "h", // <div> → h('div', ...)
		jsxFragment: "Fragment", // <> → Fragment(...)
	},
});
