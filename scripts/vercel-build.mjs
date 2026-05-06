import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const OUT = ".vercel/output";

// Step 1: Run vite build
console.log("⚡ Running vite build...");
execSync("npx vite build", { stdio: "inherit" });

// Step 2: Clean & create output structure
console.log("\n📦 Creating Vercel Build Output...");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(`${OUT}/static`, { recursive: true });
fs.mkdirSync(`${OUT}/functions/ssr.func`, { recursive: true });

// Step 3: Copy client assets to static directory
fs.cpSync("dist/client", `${OUT}/static`, { recursive: true });
console.log("  ✅ Static assets copied");

// Step 4: Bundle server into a self-contained file with esbuild
console.log("  📦 Bundling server with esbuild...");
execSync(
  [
    "npx esbuild dist/server/server.js",
    "--bundle",
    `--outdir=${OUT}/functions/ssr.func`,
    "--format=esm",
    "--platform=node",
    "--target=node22",
    "--splitting",
    '--external:node:*',
    "--out-extension:.js=.mjs",
  ].join(" "),
  { stdio: "inherit" }
);

// Step 5: Create the function entry point
fs.writeFileSync(
  `${OUT}/functions/ssr.func/index.mjs`,
  `import server from './server.mjs';
export default server.fetch;
`
);

// Step 6: Create function config
fs.writeFileSync(
  `${OUT}/functions/ssr.func/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "edge",
      entrypoint: "index.mjs",
    },
    null,
    2
  )
);

// Step 7: Create output config with routing
fs.writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: "/assets/(.*)",
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        },
        {
          src: "/(.*\\.wasm)",
          headers: {
            "Content-Type": "application/wasm",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        },
        {
          src: "/(.*\\.onnx)",
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/ssr" },
      ],
    },
    null,
    2
  )
);

console.log("\n✅ Vercel Build Output created successfully!");
console.log(`   Static files: ${OUT}/static/`);
console.log(`   SSR function: ${OUT}/functions/ssr.func/`);
