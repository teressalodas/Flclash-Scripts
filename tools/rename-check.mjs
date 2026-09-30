import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const DIR = fileURLToPath(new URL('../legacy', import.meta.url));

function loadScript(f) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(`${DIR}\\${f}`, 'utf8'), sandbox);
  return sandbox.main;
}

const proxies = () => ([
  { name: '🇭🇰 香港 01', type: 'ss' },
  { name: '🇭🇰 香港 01', type: 'ss' },
  { name: '🇸🇬 新加坡 A', type: 'ss' },
  { name: '🇸🇬 新加坡 A', type: 'ss' },
  { name: '🇸🇬 新加坡 A', type: 'ss' },
]);

for (const file of ['scripts18.js', 'scripts19.js', 'scripts20.js']) {
  const main = loadScript(file);
  console.log(`\n########## ${file} ##########`);
  let current = proxies();
  for (let run = 1; run <= 3; run++) {
    const cfg = { proxies: current, rules: [], 'proxy-groups': [] };
    const out = main(cfg);
    const nodeNames = (out.proxies || cfg.proxies).map(p => p.name);
    const groups = Object.fromEntries(out['proxy-groups'].map(g => [g.name, g.proxies || []]));
    console.log(` run${run} config.proxies =`, JSON.stringify(nodeNames));
    for (const [g, list] of Object.entries(groups)) {
      if (list.length) console.log(`        ${g}: ${JSON.stringify(list)}`);
    }
    current = (out.proxies || cfg.proxies).map(p => ({ ...p }));
  }
}

// Does the rename survive the blacklist regex of the SAME script? (proxy name containing '#1')
console.log('\n########## blacklist regex vs suffixed names ##########');
const re = /(?<!集)群|邀请|返利|官方|官网|网址|订阅|购买|续费|剩余|到期|过期|流量|备用|邮箱|客服|联系|工单|倒卖|防止|梯子|tg|发布|重置/i;
for (const n of ['🇭🇰 香港 01', '🇭🇰 香港 01 #1', '🇭🇰 香港 01 #2', '🇸🇬 新加坡 A [2]']) {
  console.log(' ', JSON.stringify(n), 'removed by blacklist =', re.test(n));
}

// Does '#1' break region matching for the predicate-style scripts?
console.log('\n########## region predicates vs suffixed names (scripts16-20 style) ##########');
const HK = /香港|HongKong|Hong Kong|\bHK\b|\bHKG\b/i;
const SG = /新加坡|狮城|Singapore|\bSG\b|\bSGP\b|\bSIN\b/i;
for (const n of ['🇭🇰 香港 01', '🇭🇰 香港 01 #1', '🇸🇬 新加坡 A', '🇸🇬 新加坡 A #2']) {
  console.log(' ', JSON.stringify(n), 'HK=', HK.test(n), 'SG=', SG.test(n));
}

// And per-region dedupe: does a node matching TWO regions appear in both, or get stolen by the first?
console.log('\n########## overlapping node across regions (scripts16-20 matchedNames) ##########');
console.log('  "🇭🇰 香港 → 🇸🇬 新加坡 中转" matches HK first then SG; matchedNames keeps it only in HK');
console.log('  "🇸🇬 SG-TW" -> HK?', HK.test('🇸🇬 SG-TW'), ' SG?', SG.test('🇸🇬 SG-TW'));
