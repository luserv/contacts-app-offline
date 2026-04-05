import pngToIco from 'png-to-ico';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const input = join(__dirname, '../assets/images/icon.png');
const output = join(__dirname, '../assets/images/icon.ico');

pngToIco(input)
  .then(buf => {
    writeFileSync(output, buf);
    console.log('✓ icon.ico generado en assets/images/icon.ico');
  })
  .catch(err => {
    console.error('Error:', err.message);
    console.error('Asegúrate de que assets/images/icon.png existe.');
  });
