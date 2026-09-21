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
} catch { $zip.Dispose(); throw }

# This is an owner-authorized data import. Parse only the JSON assignment; do
# not execute JavaScript embedded in the APK.
$payload = ($source -replace '^\s*window\.ABDOMEN_DATA\s*=\s*', '').Trim().TrimEnd(';').Trim()
$catalog = $payload | ConvertFrom-Json -Depth 100
$imageImports = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$records = foreach ($category in $catalog.categories) {
  foreach ($group in $category.groups) {
    foreach ($disease in $group.diseases) {
      $images = foreach ($image in @($disease.images)) {
        $sourcePath = [string]$image.src
        if (-not $sourcePath -or $sourcePath.Contains('..') -or -not $sourcePath.StartsWith('assets/')) { continue }
        $relative = $sourcePath.Substring('assets/'.Length).Replace('\','/')
        $imageImports.Add($sourcePath) | Out-Null
        [ordered]@{ type = [string]$image.type; caption = [string]$image.caption; src = 'assets/authorized/abdomen/' + $relative }
      }
      [ordered]@{
        id = [string]$disease.id
        name = [string]$disease.name
        nameEn = [string]$disease.nameEn
        category = [string]$category.name
        group = [string]$group.name
        brief = [string]$disease.brief
        imageCount = @($images).Count
        images = @($images)
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
foreach ($sourcePath in $imageImports) {
  $archivePath = 'assets/public/' + $sourcePath
  $imageEntry = $zip.GetEntry($archivePath)
  if (-not $imageEntry) { throw "APK 中缺少已关联影像：$sourcePath" }
  $destination = Join-Path (Get-Location) ('assets/authorized/abdomen/' + $sourcePath.Substring('assets/'.Length))
  $destinationFolder = Split-Path -Parent $destination
  if (-not (Test-Path -LiteralPath $destinationFolder)) { New-Item -ItemType Directory -Path $destinationFolder -Force | Out-Null }
  $input = $imageEntry.Open()
  $outputFile = [IO.File]::Open($destination,[IO.FileMode]::Create,[IO.FileAccess]::Write)
  try { $input.CopyTo($outputFile) } finally { $input.Dispose(); $outputFile.Dispose() }
}
$zip.Dispose()
Write-Output ("Imported {0} authorized abdomen index records and {1} explicitly linked images" -f $records.Count, $imageImports.Count)
