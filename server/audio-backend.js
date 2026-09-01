/**
 * Story audio backend: SuperCollider OSC (default) or afplay fallback.
 *
 * AUDIO_BACKEND=osc   → server/sc-osc.js  (default)
 * AUDIO_BACKEND=afplay → server/story-audio.js
 */

const backend = (process.env.AUDIO_BACKEND || "osc").toLowerCase();

if (backend === "afplay" || backend === "mp3") {
  module.exports = require("./story-audio");
} else {
  module.exports = require("./sc-osc");
}
