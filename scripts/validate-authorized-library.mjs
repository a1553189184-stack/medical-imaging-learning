import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'library-data', 'authorized-library-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const totals = { systems: 0, categories: 0, records: 0, images: 0 };
const errors = [];
const warnings = [];

for (const system of manifest.systems) {
  const file = path.join(root, system.file);
  if (!fs.existsSync(file)) { errors.push(`${system.name}: 缺少数据文件 ${system.file}`); continue; }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const categoryById = new Map(data.categories.map(category => [category.id, category]));
  const groupById = new Map(data.categories.flatMap(category => (category.groups || []).map(group => [group.id, { ...group, categoryId: category.id }])));
  const ids = new Set();
  const names = new Map();
  const imagePaths = new Set();

  for (const record of data.records) {
    if (!record.id || !record.name) errors.push(`${system.name}: 存在空 ID 或空名称条目`);
    if (ids.has(record.id)) errors.push(`${system.name}: 重复 ID ${record.id}`);
    ids.add(record.id);
    if (!categoryById.has(record.categoryId)) errors.push(`${system.name}/${record.name}: 分类 ${record.categoryId} 不存在`);
    const group = groupById.get(record.groupId);
    if (!group) errors.push(`${system.name}/${record.name}: 疾病组 ${record.groupId} 不存在`);
    else if (group.categoryId !== record.categoryId) errors.push(`${system.name}/${record.name}: 疾病组与分类层级不一致`);
    const normalizedName = [record.categoryId, record.groupId, record.name.trim().toLocaleLowerCase('zh-CN')].join('::');
    if (names.has(normalizedName) && names.get(normalizedName) !== record.id) warnings.push(`${system.name}/${record.category}/${record.groupName}: 同名条目“${record.name}” (${names.get(normalizedName)}, ${record.id})`);
    else names.set(normalizedName, record.id);
    for (const image of record.images || []) {
      if (image.src) imagePaths.add(image.src);
      const authorizedAsset = image.src?.startsWith(`assets/authorized/${system.key}/`);
      const auditedRelations = new Set(['同系统、同诊断名称的已审计病例图谱','同系统、诊断名称包含该疾病名称的已审计病例图谱']);
      const exactNameAudit = image.verificationStatus === 'exact-name-and-modality-reviewed'
        && image.relation?.includes(record.name);
      const auditedAtlasAsset = image.src?.startsWith('assets/images/')
        && (auditedRelations.has(image.relation) || exactNameAudit)
        && image.source && image.sourceUrl && image.license && image.type;
      if (!authorizedAsset && !auditedAtlasAsset) errors.push(`${system.name}/${record.name}: 未满足来源审计要求的图片 ${image.src || '(空)'}`);
      else if (!fs.existsSync(path.join(root, image.src))) errors.push(`${system.name}/${record.name}: 图片不存在 ${image.src}`);
    }
  }

  for (const category of data.categories) {
    const actualCategoryCount = data.records.filter(record => record.categoryId === category.id).length;
    if (actualCategoryCount !== category.count) errors.push(`${system.name}/${category.name}: 分类计数 ${category.count}，实际 ${actualCategoryCount}`);
    for (const group of category.groups || []) {
      const actualGroupCount = data.records.filter(record => record.groupId === group.id).length;
      if (actualGroupCount !== group.count) errors.push(`${system.name}/${category.name}/${group.name}: 疾病组计数 ${group.count}，实际 ${actualGroupCount}`);
    }
  }

  if (data.recordCount !== data.records.length || system.recordCount !== data.records.length) errors.push(`${system.name}: 条目总数不一致`);
  if (data.categoryCount !== data.categories.length || system.categoryCount !== data.categories.length) errors.push(`${system.name}: 分类总数不一致`);
  const imageCount = imagePaths.size;
  if (data.imageCount !== imageCount || system.imageCount !== imageCount) errors.push(`${system.name}: 去重图片计数 ${data.imageCount}，实际 ${imageCount}`);
  totals.systems += 1;
  totals.categories += data.categories.length;
  totals.records += data.records.length;
  totals.images += imageCount;
}

for (const key of Object.keys(totals)) {
  if (totals[key] !== manifest.totals[key]) errors.push(`清单 ${key}=${manifest.totals[key]}，实际 ${totals[key]}`);
}

console.log(`授权分类库校验：${totals.systems} 系统 / ${totals.categories} 分类 / ${totals.records} 条目 / ${totals.images} 图片引用`);
if (warnings.length) {
  console.log(`需人工复核的同名提示：${warnings.length}`);
  warnings.slice(0, 30).forEach(item => console.log(`  WARN ${item}`));
}
if (errors.length) {
  errors.forEach(item => console.error(`  ERROR ${item}`));
  process.exitCode = 1;
} else {
  console.log('结构、层级、计数和图片路径校验通过。');
}
