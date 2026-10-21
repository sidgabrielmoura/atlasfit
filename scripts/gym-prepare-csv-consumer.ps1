$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$consumerFolder = Join-Path (Get-Location).Path '.tmp/gym-csv-consumer'
New-Item -ItemType Directory -Path $consumerFolder -Force | Out-Null
$installer = Join-Path $consumerFolder 'LibreOffice_26.8.1_Win_x86-64.msi'
$packageUrl = 'https://download.documentfoundation.org/libreoffice/stable/26.8.1/win/x86_64/LibreOffice_26.8.1_Win_x86-64.msi'
if (!(Test-Path -LiteralPath $installer)) { Invoke-WebRequest -Uri $packageUrl -UseBasicParsing -OutFile $installer }
$expectedContent = (Invoke-WebRequest -Uri ($packageUrl + '.sha256') -UseBasicParsing).Content
$expectedHash = [regex]::Match($expectedContent, '[a-fA-F0-9]{64}').Value.ToLowerInvariant()
$actualHash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
if (!$expectedHash -or $actualHash -ne $expectedHash) { throw 'O checksum do pacote oficial não confere.' }
$target = Join-Path $consumerFolder 'libreoffice'
New-Item -ItemType Directory -Path $target -Force | Out-Null
$process = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/a', ('"' + $installer + '"'), '/qn', ('TARGETDIR="' + $target + '"')) -PassThru -Wait -WindowStyle Hidden
if ($process.ExitCode -ne 0) { throw "Extração administrativa falhou: $($process.ExitCode)." }
$executable = Get-ChildItem -LiteralPath $target -Filter 'soffice.exe' -File -Recurse | Select-Object -First 1 -ExpandProperty FullName
if (!$executable) { throw 'Executável do LibreOffice não encontrado no pacote extraído.' }
# The administrative image keeps its redistributable DLLs in System64. Load the
# package's own versions beside soffice instead of changing Windows system files.
$runtimeFolder = Join-Path $target 'System64'
foreach ($runtimeFile in (Get-ChildItem -LiteralPath $runtimeFolder -Filter '*.dll' -File)) {
  Copy-Item -LiteralPath $runtimeFile.FullName -Destination (Join-Path (Split-Path -Parent $executable) $runtimeFile.Name) -Force
}
$result = @{ packageUrl = $packageUrl; sha256 = $actualHash; executable = $executable; installedGlobally = $false }
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $consumerFolder 'consumer.json') -Encoding UTF8
$result | ConvertTo-Json
