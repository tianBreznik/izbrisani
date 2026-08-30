#!/usr/bin/env node
/**
 * Convert plain-text subtitle drafts into WebVTT with dummy timings for layout tests.
 * Usage: node scripts/vtt-dummy-time.js content/subtitles/desk-1.vtt
 */

const fs = require("fs");
const path = require("path");

const SEC_PER_CHAR = 0.045;
const MIN_SEC = 4;
const MAX_SEC = 14;

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(whole).padStart(2, "0") +
    "." +
    String(ms).padStart(3, "0")
  );
}

function splitIntoCues(text) {
  const cues = [];
  const blocks = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  for (const block of blocks) {
    if (block.length <= 180) {
      cues.push(block);
      continue;
    }
    const parts = block.split(/(?<=[.!?…»])\s+/);
    let chunk = "";
    for (const part of parts) {
      const next = chunk ? `${chunk} ${part}` : part;
      if (next.length > 180 && chunk) {
        cues.push(chunk.trim());
        chunk = part;
      } else {
        chunk = next;
      }
    }
    if (chunk.trim()) cues.push(chunk.trim());
  }
  return cues;
}

function durationFor(text) {
  const byChar = text.length * SEC_PER_CHAR;
  return Math.min(MAX_SEC, Math.max(MIN_SEC, byChar));
}

function toVtt(cues) {
  let t = 0;
  const lines = ["WEBVTT", ""];
  for (const text of cues) {
    const dur = durationFor(text);
    const start = formatTime(t);
    const end = formatTime(t + dur);
    lines.push(`${start} --> ${end}`);
    lines.push(text);
    lines.push("");
    t += dur + 0.3;
  }
  return lines.join("\n").trimEnd() + "\n";
}

const file = process.argv[2];
const force = process.argv.includes("--force");
if (!file || file.startsWith("-")) {
  console.error("Usage: node scripts/vtt-dummy-time.js <path.vtt> [--force]");
  process.exit(1);
}

const abs = path.resolve(file);
const raw = fs.readFileSync(abs, "utf8");
if (!force && /^WEBVTT/m.test(raw) && /-->\s*\d/.test(raw)) {
  console.error(`${file}: already timed — use --force to replace from cue text only`);
  process.exit(0);
}

const cues = splitIntoCues(raw);
const out = toVtt(cues);
fs.writeFileSync(abs, out);
console.log(`${file}: ${cues.length} cues, ${formatTime(cues.reduce((acc, c) => acc + durationFor(c) + 0.3, 0))} total`);
