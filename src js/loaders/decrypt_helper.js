'use strict';

const { execFileSync } = require('child_process');
const fs  = require('fs');
const os  = require('os');
const path = require('path');

function decryptXlsx(filePath, password) {
  const tmp = path.join(os.tmpdir(), `mms_decrypt_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`);
  const script = `
import msoffcrypto, sys
with open(sys.argv[1],'rb') as f:
    of = msoffcrypto.OfficeFile(f)
    of.load_key(password=sys.argv[2])
    with open(sys.argv[3],'wb') as g:
        of.decrypt(g)
`;
  try {
    execFileSync('python3', ['-c', script, filePath, password, tmp]);
    return tmp;
  } catch (e) {
    throw new Error(`decrypt failed for ${filePath}: ${e.message}`);
  }
}

function cleanupDecrypt(tmpPath) {
  try { if (tmpPath) fs.unlinkSync(tmpPath); } catch (_) {}
}

module.exports = { decryptXlsx, cleanupDecrypt };
