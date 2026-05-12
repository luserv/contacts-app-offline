import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const input = join(__dirname, '../assets/images/icon.png').replace(/\\/g, '/');
const output = join(__dirname, '../assets/images/icon.ico').replace(/\\/g, '/');

const pyScript = join(os.tmpdir(), '_gen_ico.py');
writeFileSync(pyScript, `
from PIL import Image
import sys

src, dst = sys.argv[1], sys.argv[2]
sizes = [(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)]

img = Image.open(src).convert('RGBA')
img.save(dst, format='ICO', sizes=sizes)
print("ICO generado con tamanos: " + str([s[0] for s in sizes]))
`);

try {
  execSync(`python3 "${pyScript}" "${input}" "${output}"`, { stdio: 'inherit' });
  console.log('✓ icon.ico generado en assets/images/icon.ico');
} catch {
  console.error('Error: asegurate de tener Python y Pillow instalados (pip install Pillow).');
  process.exit(1);
} finally {
  try { unlinkSync(pyScript); } catch {}
}
