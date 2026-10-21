$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$report = Get-Content -LiteralPath '.tmp/gym-csv-consumer/latest.json' -Raw -Encoding UTF8 | ConvertFrom-Json
if (!$report.success) { throw 'Conversões nativas ainda não passaram.' }
$runFolder = Split-Path -Parent $report.file
$officeNs = 'urn:oasis:names:tc:opendocument:xmlns:office:1.0'
$tableNs = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0'
$textNs = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
function Read-Text($node) {
  if ($node.NodeType -eq [System.Xml.XmlNodeType]::Text) { return $node.Value }
  if ($node.NamespaceURI -eq $textNs) {
    if ($node.LocalName -eq 'tab') { return "`t" }
    if ($node.LocalName -eq 'line-break') { return "`n" }
    if ($node.LocalName -eq 's') {
      $count = $node.GetAttribute('c', $textNs)
      if (!$count) { $count = 1 }
      return (' ' * [int]$count)
    }
  }
  $parts = @($node.ChildNodes | ForEach-Object { Read-Text $_ })
  return ($parts -join '')
}
function Read-Cells([string]$file) {
  $archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $file).Path)
  try {
    $stream = $archive.GetEntry('content.xml').Open()
    $reader = New-Object System.IO.StreamReader($stream)
    try { [xml]$document = $reader.ReadToEnd() } finally { $reader.Dispose(); $stream.Dispose() }
    $namespaces = New-Object System.Xml.XmlNamespaceManager($document.NameTable)
    $namespaces.AddNamespace('table', $tableNs)
    $namespaces.AddNamespace('office', $officeNs)
    $rows = @()
    foreach ($row in $document.SelectNodes('//table:table/table:table-row', $namespaces)) {
      $cells = @()
      foreach ($cell in $row.SelectNodes('table:table-cell', $namespaces)) {
        $value = @{ type = $cell.GetAttribute('value-type', $officeNs); value = $cell.GetAttribute('value', $officeNs); date = $cell.GetAttribute('date-value', $officeNs); formula = $cell.GetAttribute('formula', $tableNs); text = (Read-Text $cell) }
        $repeat = $cell.GetAttribute('number-columns-repeated', $tableNs)
        if (!$repeat) { $repeat = 1 }
        if ([int]$repeat -gt 100) { throw 'Unexpected repeated columns in bounded test export.' }
        for ($index = 0; $index -lt [int]$repeat; $index++) { $cells += $value }
      }
      if ($cells | Where-Object { $_.type -ne '' }) { $rows += ,$cells }
    }
    return ,$rows
  } finally { $archive.Dispose() }
}
$result = @{ consumer = $report.consumer; files = @(); nativeConversions = $report.conversions.Count }
foreach ($kind in @('students', 'invoices')) {
  foreach ($stage in @('opened', 'reopened')) {
    $file = Join-Path $runFolder ($stage + '/' + $kind + '.ods')
    $result.files += @{ kind = $kind; stage = $stage; file = $file; rows = (Read-Cells $file) }
  }
}
$result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $runFolder 'cells.json') -Encoding UTF8
Write-Output (Join-Path $runFolder 'cells.json')
