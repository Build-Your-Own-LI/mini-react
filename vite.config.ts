// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
	esbuild: {
		jsxFactory: "miniReact.createElement", // <div> → h('div', ...)
		jsxFragment: "miniReact.Fragment", // <> → Fragment(...)
	},
});
