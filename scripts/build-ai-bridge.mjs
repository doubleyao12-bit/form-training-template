import { build } from "esbuild";

await build({
  entryPoints: ["server/mcp-entry.ts"],
  outfile: "api/mcp.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  packages: "external",
  sourcemap: true,
  logLevel: "info",
});
