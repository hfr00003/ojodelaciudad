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
    `--outfile=${OUT}/functions/ssr.func/server.mjs`,
    "--format=esm",
    "--platform=node",
    "--target=node22",
    '--external:node:*',
  ].join(" "),
  { stdio: "inherit" }
);

// Step 5: Create the function entry point with Node-to-Web adapter
fs.writeFileSync(
  `${OUT}/functions/ssr.func/index.mjs`,
  `import server from './server.mjs';

export default async function handler(req, res) {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'];
    const url = new URL(req.url, \`\${protocol}://\${host}\`);

    // Basic body handling
    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = req;
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: body,
      // @ts-ignore
      duplex: body ? 'half' : undefined,
    });

    if (!server || !server.fetch) {
      throw new Error('SSR Server or fetch handler not found in bundle');
    }

    const response = await server.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error('SSR Critical Error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('SSR Critical Error: ' + err.message + '\\n' + err.stack);
  }
}
`
);

// Step 6: Create function config
fs.writeFileSync(
  `${OUT}/functions/ssr.func/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      supportsResponseStreaming: true,
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
