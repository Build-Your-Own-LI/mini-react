// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
	base: process.env.GITHUB_PAGES ? "mini-react/" : "./",
	esbuild: {
		jsxFactory: "miniReact.createElement", // <div> → h('div', ...)
		jsxFragment: "miniReact.Fragment", // <> → Fragment(...)
	},
});
