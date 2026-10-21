$ErrorActionPreference = 'Stop'
$taskRoot = Join-Path (Get-Location).Path '.tmp/gym-stabilization'
$archive = Join-Path $taskRoot 'postgresql.zip'
$binaryRoot = Join-Path $taskRoot 'pgsql'
$dataRoot = Join-Path $taskRoot 'pgdata'
if (-not (Test-Path -LiteralPath $archive)) { throw 'Baixe o arquivo oficial PostgreSQL antes de iniciar.' }
if (-not (Test-Path -LiteralPath (Join-Path $binaryRoot 'bin/initdb.exe'))) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
  try {
    foreach ($entry in $zip.Entries) {
      if ($entry.FullName -notmatch '^pgsql/(bin|lib|share)/' -or $entry.FullName.EndsWith('/')) { continue }
      $destination = [System.IO.Path]::GetFullPath((Join-Path $taskRoot $entry.FullName))
      if (-not $destination.StartsWith($taskRoot + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Caminho inválido no arquivo compactado.' }
      [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($destination)) | Out-Null
      [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination, $true)
    }
  } finally { $zip.Dispose() }
}
if (-not (Test-Path -LiteralPath (Join-Path $dataRoot 'PG_VERSION'))) {
  & (Join-Path $binaryRoot 'bin/initdb.exe') '-D' $dataRoot '-U' 'atlasfit_test' '--auth=trust' '--encoding=UTF8' '--locale=C'
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao inicializar o banco descartável.' }
}
$pgArguments = @('-D', $dataRoot, '-l', (Join-Path $taskRoot 'postgres.log'), '-o', '"-h 127.0.0.1 -p 56432"', '-w', 'start')
$server = Start-Process -FilePath (Join-Path $binaryRoot 'bin/pg_ctl.exe') -ArgumentList $pgArguments -WindowStyle Hidden -PassThru
if (-not $server.WaitForExit(60000)) { throw 'Tempo limite ao iniciar o banco isolado.' }
if ($server.ExitCode -ne 0) { throw 'Falha ao iniciar PostgreSQL isolado; consulte .tmp/gym-stabilization/postgres.log.' }
Write-Output 'PostgreSQL descartável iniciado em 127.0.0.1:56432; nenhum banco do ambiente foi acessado.'
