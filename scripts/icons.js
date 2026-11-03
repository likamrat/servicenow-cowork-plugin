const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

function checkIcons(root = path.join(__dirname, "..", "plugin")) {
  for (const [name, size, sha256] of [
    ["color", 192, "47b1ebe5ac0882605f6238a19ef986d38268fc4a92ae7d52014085b0f8c2d00d"],
    ["outline", 32, "28189d1dce7b97ed63999904d548a32858eef7a7f2b5c56c6b46694a1eaf02f0"],
  ]) {
    const data = fs.readFileSync(path.join(root, `${name}.png`));
    if (createHash("sha256").update(data).digest("hex") !== sha256 ||
        data.readUInt32BE(16) !== size || data.readUInt32BE(20) !== size) {
      throw new Error(`${name}.png differs from the reviewed ServiceNow branding asset. Restore it from Git; do not regenerate neutral artwork.`);
    }
  }
}

if (require.main === module) {
  checkIcons();
  console.log("Verified ServiceNow color and white/transparent outline assets; no files changed.");
}

module.exports = { checkIcons };
