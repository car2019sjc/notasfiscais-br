    Script de Backup NF-v1
$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupName = "NF-v1_$date"
$sourceDir = "."
$backupDir = ".\backups"
$excludeDirs = @("node_modules", ".git", "backups")

# Criar diretório de backup se não existir
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# Criar arquivo ZIP do backup
$zipFile = Join-Path $backupDir "$backupName.zip"

# Criar lista de arquivos para backup
$files = Get-ChildItem -Path $sourceDir -Recurse | Where-Object {
    $isExcluded = $false
    foreach ($excludeDir in $excludeDirs) {
        if ($_.FullName -like "*\$excludeDir*") {
            $isExcluded = $true
            break
        }
    }
    -not $isExcluded
}

# Criar arquivo ZIP
Compress-Archive -Path $files.FullName -DestinationPath $zipFile -Force

Write-Host "Backup criado com sucesso: $zipFile" 