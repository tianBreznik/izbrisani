/**
 * USB HID relay — pulse a channel (Kodak wired remote Forward / Reverse).
 */

const HID = require("node-hid");

const DEFAULT_VID = 0x16c0;
const DEFAULT_PID = 0x05df;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findRelay(vid, pid) {
  const devices = HID.devices().filter(
    (d) => d.vendorId === vid && d.productId === pid
  );
  if (!devices.length) {
    throw new Error(
      `No USB relay ${vid.toString(16)}:${pid.toString(16)} — plug in HID relay`
    );
  }
  return devices[0];
}

function setRelay(hid, channel, on) {
  const buf = Buffer.alloc(9);
  buf[0] = 0;
  buf[1] = on ? 0xff : 0xfd;
  buf[2] = channel;
  hid.write(buf);
}

async function pulseChannel(options = {}) {
  const vid = Number(options.vid ?? DEFAULT_VID);
  const pid = Number(options.pid ?? DEFAULT_PID);
  const channel = Number(options.channel ?? 1);
  const pulseMs = Number(options.pulseMs ?? 300);

  const device = findRelay(vid, pid);
  const hid = new HID.HID(device.path);
  try {
    setRelay(hid, channel, true);
    await sleep(pulseMs);
    setRelay(hid, channel, false);
  } finally {
    try {
      setRelay(hid, channel, false);
      hid.close();
    } catch {
      /* ignore */
    }
  }
}

/** Alias for scripts / older callers */
async function pulseForward(options = {}) {
  return pulseChannel(options);
}

module.exports = {
  pulseChannel,
  pulseForward,
  DEFAULT_VID,
  DEFAULT_PID,
};
