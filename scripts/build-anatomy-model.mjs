// Derive a compact educational subset from the CC BY 4.0 BodyParts3D 4.0
// browser package by ashemag/human-atlas. The source archive is not bundled.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const source = process.argv[2];
const output = process.argv[3] || 'assets/anatomy/model';
if (!source) throw new Error('Usage: node scripts/build-anatomy-model.mjs <human-atlas/public/models> [output]');
const atlas = JSON.parse(await readFile(join(source, 'atlas.json'), 'utf8'));
const majorArteries = /(?:aorta|carotid artery|vertebral artery|subclavian artery|axillary artery|brachial artery|radial artery|ulnar artery|femoral artery|popliteal artery|anterior tibial artery|posterior tibial artery|fibular artery|common iliac artery|external iliac artery|internal iliac artery|renal artery|celiac trunk|superior mesenteric artery|inferior mesenteric artery|basilar artery|anterior cerebral artery|middle cerebral artery|posterior cerebral artery|anterior communicating artery|posterior communicating artery|ophthalmic artery|superficial temporal artery|facial artery|dorsalis pedis artery|palmar arch)/i;
const majorVeins = /(?:superior vena cava|inferior vena cava|jugular vein|subclavian vein|axillary vein|brachial vein|cephalic vein|basilic vein|radial vein|ulnar vein|femoral vein|popliteal vein|great saphenous vein|small saphenous vein|renal vein|portal vein|common iliac vein|external iliac vein|internal iliac vein)/i;
const selected = atlas.parts.filter(part => {
  const name = part.name;
  if (part.id === 'FJ2810') return true; // adult reference skin surface
  if (part.system === 'skeletal') return !/(?:fibularis|iliotibial tract|tibialis anterior|tibialis posterior|subscapularis|levator scapulae|gingiva)/i.test(name);
  if (part.system === 'digestive') return /^(Pancreas|Stomach|Gallbladder|Esophagus|Duodenum|Appendix|Rectum|Ascending colon|Descending colon|Transverse colon|Caudate lobe of liver|Hepatovenous segment)/i.test(name);
  if (part.system === 'urinary') return /^(Left kidney|Right kidney|Urinary bladder|Left ureter|Right ureter)$/i.test(name);
  if (part.system === 'cardiac') return /^(Wall of ventricle|Wall of left atrium|Wall of right atrium|Cavity of left ventricle|Cavity of right ventricle)/i.test(name);
  if (part.system === 'respiratory') return /^(Trachea|Left main bronchus|Right main bronchus proper)$/i.test(name);
  if (part.system === 'nervous') return true;
  if (part.system === 'arterial') return majorArteries.test(name);
  if (part.system === 'venous') return majorVeins.test(name);
  return false;
});
const chunks = new Map();
for (const index of new Set(selected.map(part => part.chunk))) chunks.set(index, await readFile(join(source, atlas.chunks[index].url.split('/').pop())));
const pieces = [];
const parts = [];
let offset = 0;
for (const part of selected) {
  const old = chunks.get(part.chunk);
  const next = { id:part.id, name:part.name, system:part.system, bounds:part.bounds, vertexCount:part.vertexCount, indexCount:part.indexCount };
  for (const [key, bytes] of [['positions',part.vertexCount*3*4],['normals',part.vertexCount*3*2],['indices',part.indexCount*4]]) {
    offset = (offset + 3) & ~3;
    next[key] = offset;
    pieces.push({offset, data:old.subarray(part[key],part[key]+bytes)});
    offset += bytes;
  }
  parts.push(next);
}
const packed = Buffer.alloc(offset);
for (const piece of pieces) piece.data.copy(packed, piece.offset);
await mkdir(output, {recursive:true});
await writeFile(join(output,'body.bin'),packed);
await writeFile(join(output,'body.json'),JSON.stringify({version:'BodyParts3D 4.0',reference:'adult male',license:'CC BY 4.0',attribution:'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',parts},null,2)+'\n');
console.log(`Selected ${parts.length} meshes, ${(packed.length/1048576).toFixed(1)} MiB`);
