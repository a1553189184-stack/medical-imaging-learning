param(
  [Parameter(Mandatory = $true)][string]$ApkPath,
  [string]$OutputDirectory = 'library-data'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$systems = @(
  [ordered]@{ key='abdomen'; file='abdomen_data.js'; variable='ABDOMEN_DATA'; name='腹部'; supplements=@([ordered]@{file='abdomen_images_20260904.js'; images='IMAGE_GROUPS'; kind='groups'; new='NEW_DISEASES'}) },
  [ordered]@{ key='chest'; file='chest_data.js'; variable='CHEST_DATA'; name='胸部'; supplements=@([ordered]@{file='chest_images_20260828.js'; images='IMAGE_ROWS'; kind='rows'; new='NEW_DISEASE'},[ordered]@{file='chest_images_20260904.js'; images='IMAGE_GROUPS'; kind='groups'; new='NEW_DISEASES'}) },
  [ordered]@{ key='maxillofacial'; file='maxillofacial_data.js'; variable='MAXILLOFACIAL_DATA'; name='颌面' },
  [ordered]@{ key='msk'; file='msk_data.js'; variable='MSK_DATA'; name='骨肌' },
  [ordered]@{ key='neck'; file='neck_data.js'; variable='NECK_DATA'; name='颈部' },
  [ordered]@{ key='ns'; file='ns_data.js'; variable='NS_DATA'; name='神经'; supplements=@([ordered]@{file='ns_image_additions_20260905.js'; images='targetPayload'; kind='payload'}) },
  [ordered]@{ key='oral'; file='oral_data.js'; variable='ORAL_DATA'; name='口腔' },
  [ordered]@{ key='otology'; file='otology_data.js'; variable='OTOLOGY_DATA'; name='耳科' },
  [ordered]@{ key='pelvis'; file='pelvis_data.js'; variable='PELVIS_DATA'; name='盆腔'; supplements=@([ordered]@{file='pelvis_images_20260904.js'; images='IMAGE_GROUPS'; kind='groups'; new='NEW_DISEASES'}) }
)

function Get-ObjectValues($value) {
  if ($null -eq $value) { return @() }
  if ($value -is [array]) { return @($value) }
  return @($value.PSObject.Properties | ForEach-Object { $_.Value })
}

function Get-PropertyValue($object, [string]$name) {
  if ($null -eq $object) { return $null }
  $property = $object.PSObject.Properties[$name]
  if ($property) { return $property.Value }
  return $null
}

function Get-Text($object, [string[]]$names, [string]$fallback = '') {
  foreach ($name in $names) {
    $value = Get-PropertyValue $object $name
    if ($null -ne $value -and [string]$value) { return [string]$value }
  }
  return $fallback
}

function Merge-Record($summary, $detail) {
  $merged = [ordered]@{}
  foreach ($source in @($summary, $detail)) {
    if ($null -eq $source) { continue }
    foreach ($property in $source.PSObject.Properties) { $merged[$property.Name] = $property.Value }
  }
  return $merged
}

function Get-JsonLiteral([string]$source, [string]$variableName) {
  if (-not $variableName) { return $null }
  $match = [regex]::Match($source, '\b(?:const|let|var)\s+' + [regex]::Escape($variableName) + '\s*=\s*')
  if (-not $match.Success) { return $null }
  $start = $match.Index + $match.Length
  $open = $source[$start]
  $close = if ($open -eq '{') { '}' } elseif ($open -eq '[') { ']' } else { throw "$variableName 不是 JSON 对象或数组" }
  $depth = 0; $inString = $false; $escaped = $false
  for ($index = $start; $index -lt $source.Length; $index++) {
    $character = $source[$index]
    if ($inString) {
      if ($escaped) { $escaped = $false }
      elseif ($character -eq '\') { $escaped = $true }
      elseif ($character -eq '"') { $inString = $false }
      continue
    }
    if ($character -eq '"') { $inString = $true; continue }
    if ($character -eq $open) { $depth++ }
    elseif ($character -eq $close) {
      $depth--
      if ($depth -eq 0) { return $source.Substring($start,$index-$start+1) }
    }
  }
  throw "无法完整解析 $variableName"
}

function Convert-Images($images, $systemKey, $zip, $imageImports, $missingImages) {
  $mappedImages = [Collections.Generic.List[object]]::new()
  foreach ($image in (Get-ObjectValues $images)) {
    $sourcePath = Get-Text $image @('src')
    if (-not $sourcePath -or $sourcePath.Contains('..') -or -not $sourcePath.StartsWith('assets/')) { continue }
    $imageEntry = $zip.GetEntry('assets/public/' + $sourcePath)
    if (-not $imageEntry) { $missingImages.Add($sourcePath); continue }
    $relative = $sourcePath.Substring('assets/'.Length).Replace('\','/')
    $publicPath = 'assets/authorized/' + $systemKey + '/' + $relative
    $imageImports[$sourcePath] = $publicPath
    $mapped = [ordered]@{}
    foreach ($property in $image.PSObject.Properties) {
      if ($property.Name -ne 'src') { $mapped[$property.Name] = $property.Value }
    }
    $mapped['src'] = $publicPath
    $mappedImages.Add([pscustomobject]$mapped)
  }
  return @($mappedImages)
}

$resolvedApk = (Resolve-Path -LiteralPath $ApkPath).Path
$apkHash = (Get-FileHash -LiteralPath $resolvedApk -Algorithm SHA256).Hash.ToLowerInvariant()
$targetRoot = Join-Path (Get-Location) $OutputDirectory
if (-not (Test-Path -LiteralPath $targetRoot)) { New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null }

$zip = [IO.Compression.ZipFile]::OpenRead($resolvedApk)
$manifestSystems = @()
try {
  foreach ($system in $systems) {
    $entry = $zip.GetEntry('assets/public/' + $system.file)
    if (-not $entry) { throw "APK 中未找到分类数据：$($system.file)" }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { $source = $reader.ReadToEnd() } finally { $reader.Dispose() }

    # Owner-authorized import. Parse the JSON assignment only; never execute APK JavaScript.
    $prefix = '^\s*window\.' + [regex]::Escape($system.variable) + '\s*=\s*'
    $payload = ($source -replace $prefix, '').Trim().TrimEnd(';').Trim()
    $catalog = $payload | ConvertFrom-Json -Depth 100

    $supplementalImages = @{}
    $supplementalDiseases = [Collections.Generic.List[object]]::new()
    foreach ($supplement in @($system.supplements)) {
      if (-not $supplement) { continue }
      $supplementEntry = $zip.GetEntry('assets/public/' + $supplement.file)
      if (-not $supplementEntry) { throw "APK 中未找到补充分类数据：$($supplement.file)" }
      $supplementReader = [IO.StreamReader]::new($supplementEntry.Open())
      try { $supplementSource = $supplementReader.ReadToEnd() } finally { $supplementReader.Dispose() }
      $newLiteral = Get-JsonLiteral $supplementSource $supplement.new
      if ($newLiteral) {
        $newData = $newLiteral | ConvertFrom-Json -Depth 100
        if ($newData -is [array]) { foreach ($newDisease in $newData) { $supplementalDiseases.Add($newDisease) } }
        else { $supplementalDiseases.Add($newData) }
      }
      $imageLiteral = Get-JsonLiteral $supplementSource $supplement.images
      if (-not $imageLiteral) { continue }
      $imageData = $imageLiteral | ConvertFrom-Json -Depth 100
      if ($supplement.kind -eq 'groups') {
        foreach ($property in $imageData.PSObject.Properties) { $supplementalImages[$property.Name] = @($property.Value) }
      } elseif ($supplement.kind -eq 'rows') {
        foreach ($row in @($imageData)) {
          $diseaseId = [string]$row.diseaseId
          if (-not $supplementalImages.ContainsKey($diseaseId)) { $supplementalImages[$diseaseId] = @() }
          $supplementalImages[$diseaseId] = @($supplementalImages[$diseaseId]) + @($row)
        }
      } elseif ($supplement.kind -eq 'payload') {
        foreach ($item in @($imageData)) { $supplementalImages[[string]$item.id] = @($item.images) }
      }
    }

    $detailValues = @(Get-ObjectValues $catalog.diseases) + @($supplementalDiseases | ForEach-Object { $_ })
    $detailIndex = @{}
    foreach ($detail in $detailValues) {
      $detailId = Get-Text $detail @('id','proposedId')
      if ($detailId) { $detailIndex[$detailId] = $detail }
    }

    $records = [Collections.Generic.List[object]]::new()
    $categories = [Collections.Generic.List[object]]::new()
    $seenIds = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $imageImports = [Collections.Generic.Dictionary[string,string]]::new([StringComparer]::Ordinal)
    $missingImages = [Collections.Generic.List[string]]::new()

    $categoryProperties = if ($catalog.categories -is [array]) { @() } else { @($catalog.categories.PSObject.Properties) }
    $categoryValues = Get-ObjectValues $catalog.categories
    for ($categoryIndex = 0; $categoryIndex -lt $categoryValues.Count; $categoryIndex++) {
      $category = $categoryValues[$categoryIndex]
      $defaultCategoryId = if ($categoryProperties.Count) { [string]$categoryProperties[$categoryIndex].Name } else { 'category-' + ($categoryIndex + 1) }
      $categoryId = Get-Text $category @('id') $defaultCategoryId
      $categoryName = Get-Text $category @('name') $categoryId
      $groupValues = Get-ObjectValues $category.groups

      if ($groupValues.Count -eq 0) {
        $categoryDetails = @($detailValues | Where-Object { (Get-Text $_ @('categoryId','category')) -eq $categoryId -or (Get-Text $_ @('category')) -eq $categoryName })
        if ($categoryDetails.Count) {
          $groupValues = @([pscustomobject][ordered]@{ id = $categoryId + '-all'; name = '全部条目'; diseases = $categoryDetails })
        }
      }

      $groups = [Collections.Generic.List[object]]::new()
      foreach ($group in $groupValues) {
        $rawGroupId = Get-Text $group @('id') ('group-' + ($groups.Count + 1))
        $groupId = $categoryId + '--' + $rawGroupId
        $groupName = Get-Text $group @('name') '未分组'
        $groupCount = 0
        foreach ($summary in (Get-ObjectValues $group.diseases)) {
          $recordId = Get-Text $summary @('id','proposedId')
          if (-not $recordId) { $recordId = $system.key + '-' + ($records.Count + 1) }
          if ($seenIds.Contains($recordId)) { continue }
          $seenIds.Add($recordId) | Out-Null
          $detail = if ($detailIndex.ContainsKey($recordId)) { $detailIndex[$recordId] } else { $null }
          $record = Merge-Record $summary $detail
          $record['id'] = $recordId
          $record['name'] = Get-Text $(if ($detail) { $detail } else { $summary }) @('name','sourceName') $recordId
          $record['nameEn'] = Get-Text $(if ($detail) { $detail } else { $summary }) @('nameEn')
          $record['categoryId'] = $categoryId
          $record['category'] = $categoryName
          $record['groupId'] = $groupId
          $record['groupName'] = $groupName
          $recordImages = @($record['images'])
          if ($supplementalImages.ContainsKey($recordId)) { $recordImages += @($supplementalImages[$recordId]) }
          $recordImages = @($recordImages | Group-Object { [string]$_.src } | ForEach-Object { $_.Group[0] })
          $mappedImages = Convert-Images $recordImages $system.key $zip $imageImports $missingImages
          $record['images'] = @($mappedImages)
          $record['imageCount'] = @($mappedImages).Count
          $records.Add([pscustomobject]$record)
          $groupCount++
        }
        $groups.Add([pscustomobject][ordered]@{
          id = $groupId
          name = $groupName
          description = Get-Text $group @('desc','description')
          standard = Get-Text $group @('standard','std')
          count = $groupCount
        })
      }

      $categoryTotal = ($groups | Measure-Object -Property count -Sum).Sum
      if ($null -eq $categoryTotal) { $categoryTotal = 0 }
      $categories.Add([pscustomobject][ordered]@{
        id = $categoryId
        name = $categoryName
        nameEn = Get-Text $category @('nameEn')
        description = Get-Text $category @('desc','description')
        standard = Get-Text $category @('standard','std')
        count = $categoryTotal
        groups = @($groups)
      })
    }

    # Keep detailed category records that are absent from a group's short index.
    foreach ($detail in $detailValues) {
      $recordId = Get-Text $detail @('id','proposedId')
      if (-not $recordId -or $seenIds.Contains($recordId)) { continue }
      $categoryId = Get-Text $detail @('categoryId') 'supplemental'
      $category = @($categories | Where-Object { $_.id -eq $categoryId }) | Select-Object -First 1
      if (-not $category) {
        $categoryName = Get-Text $detail @('category') '补充分类'
        $category = [pscustomobject][ordered]@{ id=$categoryId; name=$categoryName; nameEn=''; description=''; standard=''; count=0; groups=@() }
        $categories.Add($category)
      }
      $rawGroupId = Get-Text $detail @('groupId')
      $preferredGroupId = if ($rawGroupId) { $categoryId + '--' + $rawGroupId } else { '' }
      $group = if ($preferredGroupId) { @($category.groups | Where-Object { $_.id -eq $preferredGroupId }) | Select-Object -First 1 } else { $null }
      $groupId = if ($group) { $preferredGroupId } else { $categoryId + '-supplemental' }
      if (-not $group) { $group = @($category.groups | Where-Object { $_.id -eq $groupId }) | Select-Object -First 1 }
      if (-not $group) {
        $supplementalGroupName = Get-Text $detail @('groupName') '补充条目'
        $group = [pscustomobject][ordered]@{ id=$groupId; name=$supplementalGroupName; description=''; standard=''; count=0 }
        $category.groups = @($category.groups) + @($group)
      }
      $record = Merge-Record $null $detail
      $record['id'] = $recordId
      $record['categoryId'] = $category.id
      $record['category'] = $category.name
      $record['groupId'] = $groupId
      $record['groupName'] = $group.name
      $recordImages = @($record['images'])
      if ($supplementalImages.ContainsKey($recordId)) { $recordImages += @($supplementalImages[$recordId]) }
      $recordImages = @($recordImages | Group-Object { [string]$_.src } | ForEach-Object { $_.Group[0] })
      $mappedImages = Convert-Images $recordImages $system.key $zip $imageImports $missingImages
      $record['images'] = @($mappedImages)
      $record['imageCount'] = @($mappedImages).Count
      $records.Add([pscustomobject]$record)
      $seenIds.Add($recordId) | Out-Null
      $group.count++
      $category.count++
    }

    if ($missingImages.Count) { Write-Warning "$($system.name)有 $($missingImages.Count) 个补充脚本引用的资源未随 APK 打包，已跳过，首项：$($missingImages[0])" }

    foreach ($sourcePath in $imageImports.Keys) {
      $imageEntry = $zip.GetEntry('assets/public/' + $sourcePath)
      $destination = Join-Path (Get-Location) $imageImports[$sourcePath]
      $destinationFolder = Split-Path -Parent $destination
      if (-not (Test-Path -LiteralPath $destinationFolder)) { New-Item -ItemType Directory -Path $destinationFolder -Force | Out-Null }
      $input = $imageEntry.Open()
      $outputFile = [IO.File]::Open($destination,[IO.FileMode]::Create,[IO.FileAccess]::Write)
      try { $input.CopyTo($outputFile) } finally { $input.Dispose(); $outputFile.Dispose() }
    }

    $sourceVersion = Get-Text $catalog.meta @('version') (Get-Text $catalog @('version','updatedAt'))
    $output = [ordered]@{
      schemaVersion = 2
      import = [ordered]@{
        source = '影研社授权内容库 · 知影 App 分类板块'
        importedAt = (Get-Date).ToUniversalTime().ToString('o')
        apkSha256 = $apkHash
        sourceVersion = $sourceVersion
      }
      key = $system.key
      system = $system.name
      title = Get-Text $catalog.meta @('title') ($system.name + '疾病分类')
      categoryCount = $categories.Count
      recordCount = $records.Count
      imageCount = $imageImports.Count
      categories = @($categories)
      records = @($records)
    }
    $outputPath = Join-Path $targetRoot ('authorized-' + $system.key + '-library.json')
    $output | ConvertTo-Json -Depth 100 -Compress | Set-Content -LiteralPath $outputPath -Encoding utf8NoBOM
    $manifestSystems += [pscustomobject][ordered]@{
      key=$system.key; name=$system.name; file=('library-data/authorized-' + $system.key + '-library.json')
      categoryCount=$categories.Count; recordCount=$records.Count; imageCount=$imageImports.Count
    }
    Write-Output ("Imported {0}: {1} categories, {2} records, {3} linked images" -f $system.name,$categories.Count,$records.Count,$imageImports.Count)
  }

  $manifest = [ordered]@{
    schemaVersion = 2
    importedAt = (Get-Date).ToUniversalTime().ToString('o')
    apkSha256 = $apkHash
    totals = [ordered]@{
      systems = $manifestSystems.Count
      categories = ($manifestSystems | Measure-Object -Property categoryCount -Sum).Sum
      records = ($manifestSystems | Measure-Object -Property recordCount -Sum).Sum
      images = ($manifestSystems | Measure-Object -Property imageCount -Sum).Sum
    }
    systems = $manifestSystems
  }
  $manifest | ConvertTo-Json -Depth 8 -Compress | Set-Content -LiteralPath (Join-Path $targetRoot 'authorized-library-manifest.json') -Encoding utf8NoBOM
  Write-Output ("Completed: {0} systems, {1} categories, {2} records, {3} linked images" -f $manifest.totals.systems,$manifest.totals.categories,$manifest.totals.records,$manifest.totals.images)
} finally {
  $zip.Dispose()
}
