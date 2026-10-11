$destinationDir = "C:\Users\USER\.jdks"
if (!(Test-Path -Path $destinationDir)) {
    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
}

$zipPath = Join-Path $destinationDir "jdk17.zip"
$url = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.12%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.12_7.zip"

Write-Host "Downloading OpenJDK 17 zip from $url ..."
$client = New-Object System.Net.WebClient
$client.DownloadFile($url, $zipPath)

Write-Host "Extracting to $destinationDir ..."
Expand-Archive -Path $zipPath -DestinationPath $destinationDir -Force
Remove-Item -Path $zipPath -Force

$installedJdk = Get-ChildItem -Path $destinationDir -Directory | Where-Object { $_.Name -like "*17*" } | Select-Object -First 1
Write-Host "JDK 17 installed at: $($installedJdk.FullName)"
