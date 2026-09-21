param(
  [Parameter(Mandatory = $true)][string]$ApkPath,
  [string]$OutputPath = 'library-data/authorized-abdomen-index.json'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ApkPath))
try {
  $entry = $zip.GetEntry('assets/public/abdomen_data.js')
  if (-not $entry) { throw 'APK 中未找到腹部图谱数据。' }
  $reader = [IO.StreamReader]::new($entry.Open())
  try { $source = $reader.ReadToEnd() } finally { $reader.Dispose() }
} finally { $zip.Dispose() }

# This is an owner-authorized data import. Parse only the JSON assignment; do
# not execute JavaScript embedded in the APK.
$payload = ($source -replace '^\s*window\.ABDOMEN_DATA\s*=\s*', '').Trim().TrimEnd(';').Trim()
$catalog = $payload | ConvertFrom-Json -Depth 100
$records = foreach ($category in $catalog.categories) {
  foreach ($group in $category.groups) {
    foreach ($disease in $group.diseases) {
      [ordered]@{
        id = [string]$disease.id
        name = [string]$disease.name
        nameEn = [string]$disease.nameEn
        category = [string]$category.name
        group = [string]$group.name
        brief = [string]$disease.brief
        imageCount = @($disease.images).Count
      }
    }
  }
}

$output = [ordered]@{
  schemaVersion = 1
  import = [ordered]@{
    source = '影研社授权内容库 · 知影 App 腹部疾病索引'
    importedAt = (Get-Date).ToUniversalTime().ToString('o')
    apkSha256 = (Get-FileHash -LiteralPath $ApkPath -Algorithm SHA256).Hash.ToLowerInvariant()
    sourceVersion = [string]$catalog.meta.version
  }
  system = '腹部'
  title = [string]$catalog.meta.title
  categories = @($catalog.categories | ForEach-Object { [ordered]@{ id = [string]$_.id; name = [string]$_.name } })
  records = @($records)
}

$target = Join-Path (Get-Location) $OutputPath
$folder = Split-Path -Parent $target
if (-not (Test-Path -LiteralPath $folder)) { New-Item -ItemType Directory -Path $folder | Out-Null }
$output | ConvertTo-Json -Depth 8 -Compress | Set-Content -LiteralPath $target -Encoding utf8NoBOM
Write-Output ("Imported {0} authorized abdomen index records to {1}" -f $records.Count, $target)
