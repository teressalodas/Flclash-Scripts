import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const DIR = fileURLToPath(new URL('../legacy', import.meta.url));
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').map(l => l.replace(/\s+$/, ''));

function diff(aName, bName) {
  const a = read(aName), b = read(bName);
  const setA = new Set(a.map(l => l.trim()).filter(Boolean));
  const setB = new Set(b.map(l => l.trim()).filter(Boolean));
  const onlyA = [...setA].filter(l => !setB.has(l));
  const onlyB = [...setB].filter(l => !setA.has(l));
  console.log(`\n########## ${aName}  ->  ${bName} ##########`);
  console.log(`lines: ${a.length} -> ${b.length}`);
  console.log(`--- only in ${aName} (${onlyA.length}) ---`);
  onlyA.forEach(l => console.log('  - ' + l));
  console.log(`--- only in ${bName} (${onlyB.length}) ---`);
  onlyB.forEach(l => console.log('  + ' + l));
}

// the modern lineage
diff('scripts17.js', 'scripts18.js');
diff('scripts18.js', 'scripts19.js');
diff('scripts19.js', 'scripts20.js');
// the "duplicate" pair
diff('scripts3.js', 'scripts4.js');
// the big simplification steps
diff('scripts16.js', 'scripts17.js');
diff('scripts10.js', 'scripts11.js');
diff('scripts12.js', 'scripts13.js');
diff('scripts13.js', 'scripts14.js');
diff('scripts14.js', 'scripts15.js');
diff('scripts15.js', 'scripts16.js');

// targeted assertions
console.log('\n\n=== TARGETED CHECKS ===');
const files = fs.readdirSync(DIR).filter(f => /^scripts\d+\.js$/.test(f))
  .sort((x, y) => parseInt(x.match(/\d+/)[0]) - parseInt(y.match(/\d+/)[0]));
for (const f of files) {
  const s = fs.readFileSync(path.join(DIR, f), 'utf8');
  const urlTest = (s.match(/type:\s*"url-test"/g) || []).length;
  const lazy = /lazy:\s*false/.test(s);
  const autoSpeed = /autoSpeedConfig/.test(s);
  const ratio = /ratioRe|ratioRegex|maxRatio/.test(s);
  const hasLazy = /lazy/.test(s);
  console.log(
    f.padEnd(12),
    'url-test:' + String(urlTest).padEnd(3),
    'autoSpeedConfig:' + (autoSpeed ? 'Y' : '.').padEnd(3),
    'lazy:false:' + (lazy ? 'Y' : '.').padEnd(3),
    'anyLazy:' + (hasLazy ? 'Y' : '.').padEnd(3),
    'ratioFilter:' + (ratio ? 'Y' : '.'),
  );
}

// does autoSpeedConfig actually make groups url-test?
console.log('\n=== scripts20 autoSpeedConfig spread site ===');
const s20 = fs.readFileSync(path.join(DIR, 'scripts20.js'), 'utf8').split('\n');
s20.forEach((l, i) => { if (/autoSpeedConfig|type:|\'节点选择\'|其他节点/.test(l)) console.log(String(i + 1).padStart(3), l); });
