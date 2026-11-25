import fs from 'node:fs';
const v = process.env.COSTEAN_VERSION || '1.0.4.4-costean.10';
fs.writeFileSync(new URL('../public/version.json', import.meta.url), JSON.stringify({ www: v, ui: 'Costean OS control center (NexusL1)', base: 'BitLuck nexus.v1.0.4.4 + Costean OS LCD layout (costean.4 app, 6x BM1491 art, copper Lode LCD colours), Lode copper web theme' }) + '\n');
console.log('www version', v);
