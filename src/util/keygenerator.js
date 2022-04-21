const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const crypto = require("crypto");

module.exports = {
  privateKey: ec.keyFromPrivate(
    "7c4c45907dec40c91bab3480c39032e90049f1a44f3e18c3e07c23e3273995cf"
  ),
  getHashOfData: (data) => {
    return crypto.createHash("sha256").update(data).digest("hex");
  },
};
