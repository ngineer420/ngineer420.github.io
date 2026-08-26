#!/usr/bin/env node
// Render one 1200x630 og-image.png per site.
//
// The script reads sites.json. For each site it reads the tagline from the
// homepage <meta name="description"> and the colours from the first :root
// block of the site stylesheet. It fills template.html and takes a screenshot
// with headless Chrome. It writes the PNG into the site repo.
//
// Usage:
//   node tools/og-image/build.mjs                 # every site
//   node tools/og-image/build.mjs --site qrmint   # one site (repeatable)
//   node tools/og-image/build.mjs --out-dir /tmp/og   # preview, do not touch the repos
//   node tools/og-image/build.mjs --root /Users/max/Code  # the folder that holds the site repos
//
// Set OG_CHROME to use a different Chrome binary.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME =
  process.env.OG_CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const WIDTH = 1200;
const HEIGHT = 630;

const FONTS = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  rounded: 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
};

function parseArgs(argv) {
  const args = { sites: [], outDir: null, root: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--site") args.sites.push(argv[++i]);
    else if (a === "--out-dir") args.outDir = path.resolve(argv[++i]);
    else if (a === "--root") args.root = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function decodeEntities(s) {
  const named = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    mdash: "—", ndash: "–", hellip: "…", copy: "©",
    rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => (n in named ? named[n] : m));
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readDescription(file) {
  const html = fs.readFileSync(file, "utf8");
  const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (!m) throw new Error(`No <meta name="description"> in ${file}`);
  return decodeEntities(m[1]).replace(/\s+/g, " ").trim();
}

// Cut a long description at the last sentence end that fits in three lines.
// If no sentence end fits, cut at the last word and add an ellipsis.
// Monospace glyphs are wider, so they get a smaller budget.
const TAGLINE_MAX = { sans: 170, rounded: 165, serif: 160, mono: 128 };
function shorten(text, font) {
  const max = TAGLINE_MAX[font];
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const sentenceEnd = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (sentenceEnd > 60) return head.slice(0, sentenceEnd + 1);
  const wordEnd = head.lastIndexOf(" ");
  return head.slice(0, wordEnd).replace(/[,;:—–-]+$/, "") + "…";
}

// Return the custom properties of the first :root block, as a Map.
function readRootVars(cssFile) {
  const css = fs.readFileSync(cssFile, "utf8");
  const start = css.search(/:root\s*\{/);
  if (start < 0) throw new Error(`No :root block in ${cssFile}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const block = css.slice(open + 1, close);
  const vars = new Map();
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    if (!vars.has(m[1])) vars.set(m[1], m[2].trim());
  }
  return vars;
}

function resolveVar(vars, name, depth = 0) {
  if (depth > 10) throw new Error(`Circular var: ${name}`);
  const raw = vars.get(name);
  if (raw === undefined) throw new Error(`Missing CSS var ${name}`);
  return raw.replace(/var\((--[a-z0-9-]+)(?:\s*,\s*([^)]*))?\)/gi, (_, ref, fallback) =>
    vars.has(ref) ? resolveVar(vars, ref, depth + 1) : (fallback ?? "").trim()
  );
}

function siteColors(site, repoDir) {
  if (site.colors) return site.colors;
  const cssFile = site.css.map((p) => path.join(repoDir, p)).find((p) => fs.existsSync(p));
  if (!cssFile) throw new Error(`No stylesheet for ${site.repo}`);
  const vars = readRootVars(cssFile);
  return {
    bg: resolveVar(vars, site.vars.bg),
    fg: resolveVar(vars, site.vars.fg),
    accent: resolveVar(vars, site.vars.accent),
  };
}

// "Flick*Trainer*" -> Flick<span class="accent">Trainer</span>
function renderWordmark(mark) {
  return escapeHtml(mark).replace(/\*([^*]+)\*/g, '<span class="accent">$1</span>');
}

function fillTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in data)) throw new Error(`Template key ${k} not set`);
    return data[k];
  });
}

function pngSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString("ascii", 1, 4) !== "PNG") throw new Error(`${file} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Chrome writes the PNG and then does not always exit, so wait for the file
// and then stop the whole process group.
function screenshot(htmlFile, pngFile, profileDir) {
  return new Promise((resolve, reject) => {
    fs.rmSync(pngFile, { force: true });
    const child = spawn(
      CHROME,
      [
        "--headless=new",
        `--screenshot=${pngFile}`,
        `--window-size=${WIDTH},${HEIGHT}`,
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        `--user-data-dir=${profileDir}`,
        "--no-first-run",
        "--disable-gpu",
        `file://${htmlFile}`,
      ],
      { detached: true, stdio: "ignore" }
    );
    const started = Date.now();
    let lastSize = -1;
    const stop = () => {
      try { process.kill(-child.pid, "SIGKILL"); } catch {}
    };
    const poll = setInterval(() => {
      let size = -1;
      try { size = fs.statSync(pngFile).size; } catch {}
      if (size > 0 && size === lastSize) {
        clearInterval(poll);
        stop();
        resolve();
      } else if (Date.now() - started > 30000) {
        clearInterval(poll);
        stop();
        reject(new Error("Chrome did not write the screenshot within 30 s"));
      }
      lastSize = size;
    }, 250);
    child.on("error", (err) => { clearInterval(poll); reject(err); });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = JSON.parse(fs.readFileSync(path.join(HERE, "sites.json"), "utf8"));
  const template = fs.readFileSync(path.join(HERE, "template.html"), "utf8");
  const root = args.root || path.resolve(HERE, config.root);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "og-image-"));
  const profileDir = path.join(tmp, "chrome-profile");

  let sites = config.sites.map((s) => ({ ...config.defaults, ...s }));
  if (args.sites.length) {
    const unknown = args.sites.filter((r) => !sites.some((s) => s.repo === r));
    if (unknown.length) throw new Error(`Unknown site: ${unknown.join(", ")}`);
    sites = sites.filter((s) => args.sites.includes(s.repo));
  }

  let failures = 0;
  for (const site of sites) {
    try {
      const repoDir = path.join(root, site.repo);
      const cnameFile = path.join(repoDir, "CNAME");
      if (fs.existsSync(cnameFile)) {
        const cname = fs.readFileSync(cnameFile, "utf8").trim();
        if (cname !== site.domain) {
          throw new Error(`CNAME says ${cname} but sites.json says ${site.domain}`);
        }
      }
      const colors = siteColors(site, repoDir);
      const tagline = shorten(readDescription(path.join(repoDir, site.description)), site.font);
      const html = fillTemplate(template, {
        bg: colors.bg,
        fg: colors.fg,
        accent: colors.accent,
        font: FONTS[site.font],
        wordmark: renderWordmark(site.wordmark),
        tagline: escapeHtml(tagline),
        domain: escapeHtml(site.domain),
      });
      const htmlFile = path.join(tmp, `${site.repo}.html`);
      fs.writeFileSync(htmlFile, html);

      const pngFile = args.outDir
        ? path.join(args.outDir, `${site.repo}.png`)
        : path.join(repoDir, site.out);
      fs.mkdirSync(path.dirname(pngFile), { recursive: true });
      await screenshot(htmlFile, pngFile, profileDir);

      const size = pngSize(pngFile);
      if (size.width !== WIDTH || size.height !== HEIGHT) {
        throw new Error(`${pngFile} is ${size.width}x${size.height}, not ${WIDTH}x${HEIGHT}`);
      }
      console.log(`ok   ${site.repo.padEnd(24)} ${site.domain.padEnd(24)} ${pngFile}`);
    } catch (err) {
      failures++;
      console.error(`FAIL ${site.repo}: ${err.message}`);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (failures) process.exit(1);
}

await main();
