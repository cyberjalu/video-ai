#!/usr/bin/env node
/**
 * Pre-generates Tailwind v4 utility CSS for the ClipNews AI app.
 * Run: node generate-tailwind.cjs
 * Then build normally with: npm run build (or tauri dev/build)
 */

const { readFileSync, writeFileSync, readdirSync } = require("fs");
const { resolve, extname, dirname } = require("path");

const ROOT = resolve(__dirname);
const TWDir = resolve(ROOT, "node_modules", "tailwindcss");

function resolveStylesheetPath(id, base) {
  if (id.startsWith("./") || id.startsWith("../")) {
    const p = resolve(base, id);
    return p.endsWith(".css") ? p : p + ".css";
  }
  if (id === "tailwindcss") return resolve(TWDir, "index.css");
  if (id.startsWith("tailwindcss/")) {
    const rel = id.replace("tailwindcss/", "");
    return resolve(TWDir, rel.endsWith(".css") ? rel : rel + ".css");
  }
  // Bare node_modules path
  return resolve(ROOT, "node_modules", id, "index.css");
}

function collectFiles(dir, exts, files = []) {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", "dist", ".git", ".remotion-bundle", "worker"].includes(entry.name)) continue;
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) collectFiles(full, exts, files);
      else if (exts.includes(extname(entry.name))) files.push(full);
    }
  } catch {}
  return files;
}

function extractCandidates(source) {
  const candidates = new Set();
  // Extract class candidates from JSX className props, cn() calls, etc.
  const tokenRe = /[\w:./\[\]#,()%'"-]+/g;
  let m;
  while ((m = tokenRe.exec(source)) !== null) {
    const token = m[0];
    if (token.length >= 2 && token.length <= 80) {
      candidates.add(token);
    }
  }
  return candidates;
}

async function main() {
  console.log("📂 Collecting source files...");
  const sourceFiles = collectFiles(resolve(ROOT, "src"), [".tsx", ".ts", ".jsx", ".js"]);
  sourceFiles.push(resolve(ROOT, "index.html"));

  const allCandidates = new Set();
  for (const file of sourceFiles) {
    try {
      const content = readFileSync(file, "utf-8");
      for (const c of extractCandidates(content)) allCandidates.add(c);
    } catch {}
  }

  console.log(`   Found ${allCandidates.size} candidate tokens from ${sourceFiles.length} files`);

  console.log("🎨 Compiling Tailwind v4 CSS...");

  const tw = await import("tailwindcss");
  const entryContent = readFileSync(resolve(TWDir, "index.css"), "utf-8");

  let compiler;
  try {
    compiler = await tw.compile(entryContent, {
      base: TWDir,
      onDependency: () => {},
      loadStylesheet: async (id, base) => {
        const filePath = resolveStylesheetPath(id, base);
        try {
          const content = readFileSync(filePath, "utf-8");
          return { base: dirname(filePath), content };
        } catch {
          return { base, content: "" };
        }
      },
      loadModule: async (_id, base) => ({ base, module: {} }),
    });
  } catch (e) {
    console.error("❌ Compile error:", e.message);
    process.exit(1);
  }

  // build() takes an array of candidate strings (Tailwind class tokens)
  const candidateArray = Array.from(allCandidates);
  const css = compiler.build(candidateArray);

  const outPath = resolve(ROOT, "src", "tailwind-generated.css");
  writeFileSync(outPath, css);
  const kb = (css.length / 1024).toFixed(1);
  console.log(`✅ Generated ${kb}KB of CSS → src/tailwind-generated.css`);
  console.log('   Import it in main.tsx or styles.css to use.');
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
