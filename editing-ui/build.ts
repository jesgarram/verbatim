import { copyFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

const outdir = join(import.meta.dir, "public", "dist");

// Bundle the React app
const result = await Bun.build({
  entrypoints: [join(import.meta.dir, "src", "index.tsx")],
  outdir,
  minify: false,
  sourcemap: "inline",
  target: "browser",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`Built ${result.outputs.length} files to ${outdir}`);
for (const output of result.outputs) {
  console.log(`  ${output.path}`);
}
