/**
 * USB serial bridge: Pico → show API on Mac Mini.
 *
 * Usage:
 *   npm start          # terminal 1
 *   npm run io         # terminal 2
 *
 * Env:
 *   SERIAL_PATH   e.g. /dev/cu.usbmodem14101  (macOS)
 *   SHOW_URL      default http://127.0.0.1:3847
 */

const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const SHOW_URL = process.env.SHOW_URL || "http://127.0.0.1:3847";
const BAUD = 115200;

async function post(path) {
  const res = await fetch(`${SHOW_URL}${path}`, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  console.log(`[io] POST ${path} →`, body);
}

async function findPort() {
  if (process.env.SERIAL_PATH) return process.env.SERIAL_PATH;
  const ports = await SerialPort.list();
  const pico = ports.find(
    (p) =>
      /usbmodem|usbserial|ttyACM|ttyUSB/i.test(p.path) ||
      /pico|micropython|raspberry/i.test(`${p.manufacturer} ${p.friendlyName}`)
  );
  if (!pico) {
    console.error("[io] No serial device found. Plug in Pico or set SERIAL_PATH=");
    console.error(
      "[io] Available:",
      ports.map((p) => p.path).join(", ") || "(none)"
    );
    process.exit(1);
  }
  return pico.path;
}

async function main() {
  const path = await findPort();
  console.log(`[io] Opening ${path}`);
  const port = new SerialPort({ path, baudRate: BAUD });
  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  parser.on("data", async (line) => {
    const msg = String(line).trim();
    if (!msg) return;
    console.log(`[io] ← ${msg}`);
    try {
      if (msg === "PICO_READY") return;
      if (msg === "CLOSE") {
        await post("/api/channel/close");
        return;
      }
      const open = msg.match(/^OPEN:(\d+)$/);
      if (open) {
        await post(`/api/channel/${open[1]}/open`);
      }
    } catch (err) {
      console.error("[io] request failed", err.message || err);
    }
  });

  port.on("error", (err) => {
    console.error("[io] serial error", err.message || err);
  });
}

main();
