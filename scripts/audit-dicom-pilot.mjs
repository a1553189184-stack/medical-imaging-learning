import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = 'https://proxy.imaging.datacommons.cancer.gov/current/viewer-only-no-downloads-see-tinyurl-dot-com-slash-3j3d9jyp/dicomWeb';
const context = {};
const source = fs.readFileSync(new URL('../dicom-series.js', import.meta.url), 'utf8');
const studies = vm.runInNewContext(`${source}\nDICOM_STUDIES`, context);
const modalities = new Set(['CT', 'MR', 'CR', 'DX', 'MG', 'PT', 'NM', 'US']);

const value = (record, tag, fallback = '') => record?.[tag]?.Value?.[0] ?? fallback;
const diagnostic = record => {
  const modality = String(value(record, '00080060')).toUpperCase();
  const description = String(value(record, '0008103E')).toUpperCase();
  return modalities.has(modality) && !/(LOCALI[ZS]ER|SCOUT|SURVEY)/.test(description);
};

async function json(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/dicom+json' },
    signal: AbortSignal.timeout(30000)
  });
  assert.equal(response.status, 200, `${response.status} ${url}`);
  return response.json();
}

async function audit(study) {
  const studyUid = encodeURIComponent(study.uid);
  const series = await json(`${root}/studies/${studyUid}/series?includefield=all`);
  assert.ok(series.length > 0, `${study.title}: no series`);
  const selected = series.find(diagnostic) || series[0];
  const seriesUid = value(selected, '0020000E');
  assert.ok(seriesUid, `${study.title}: missing SeriesInstanceUID`);
  const instances = await json(`${root}/studies/${studyUid}/series/${encodeURIComponent(seriesUid)}/instances`);
  assert.ok(instances.length > 0, `${study.title}: no image instances`);
  return { title: study.title, series: series.length, instances: instances.length };
}

assert.equal(studies.length, 20);
assert.equal(new Set(studies.map(study => study.uid)).size, 20);
const results = [];
for (let index = 0; index < studies.length; index += 4) {
  results.push(...await Promise.all(studies.slice(index, index + 4).map(audit)));
}
for (const result of results) console.log(`✔ ${result.title}: ${result.series} series, ${result.instances} instances`);
console.log(`Verified ${results.length} live IDC studies.`);
