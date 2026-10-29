const fs = require("node:fs");
const path = require("node:path");
const { deflateSync, crc32 } = require("node:zlib");

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function icon(size, outline) {
  const pixels = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const frame = u >= 0.20 && u <= 0.80 && v >= 0.26 && v <= 0.74 &&
        (u < 0.25 || u > 0.75 || v < 0.31 || v > 0.69);
      const rule = u >= 0.33 && u <= 0.67 &&
        ((v >= 0.41 && v <= 0.46) || (v >= 0.54 && v <= 0.59));
      const rgba = frame || rule ? [255, 255, 255, 255] : outline ? [0, 0, 0, 0] : [36, 54, 75, 255];
      pixels.set(rgba, y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

if (require.main === module) {
  for (const [name, size, outline] of [["color", 192, false], ["outline", 32, true]]) {
    fs.writeFileSync(path.join(__dirname, "..", "..", "plugin", `${name}.png`), icon(size, outline));
  }
  console.log("Generated neutral ticket icons (192px color, 32px white/transparent outline).");
}

module.exports = { icon };
