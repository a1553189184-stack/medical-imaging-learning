import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../dicom-series.js',import.meta.url),'utf8');
const studies = JSON.parse(vm.runInNewContext(source + '\nJSON.stringify(DICOM_STUDIES)'));
const endpoint = 'https://proxy.imaging.datacommons.cancer.gov/current/viewer-only-no-downloads-see-tinyurl-dot-com-slash-3j3d9jyp/dicomWeb';

async function verify(study) {
  const url = endpoint + '/studies?StudyInstanceUID=' + encodeURIComponent(study.uid) + '&limit=1';
  const response = await fetch(url,{headers:{Accept:'application/dicom+json'}});
  if (!response.ok) throw new Error(study.uid + ' returned HTTP ' + response.status);
  const metadata = await response.json();
  const returned = metadata[0]?.['0020000D']?.Value?.[0];
  if (returned !== study.uid) throw new Error(study.uid + ' was not found in IDC');
  return {title:study.title,uid:study.uid};
}

const verified = [];
for (let index = 0; index < studies.length; index += 4) {
  verified.push(...await Promise.all(studies.slice(index,index + 4).map(verify)));
}
console.log(JSON.stringify({count:verified.length,verified},null,2));
