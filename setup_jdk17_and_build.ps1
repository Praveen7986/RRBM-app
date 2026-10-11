$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   RRBM Android APK Builder with OpenJDK 17" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$javaHome = "C:\Users\USER\.jdks\jdk17_clean\jdk-17.0.12+7"
Write-Host "JDK 17 found at: $javaHome" -ForegroundColor Green

# Set environment variables for this process
$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

Write-Host "Checking Java Version:" -ForegroundColor Yellow
& "$javaHome\bin\java.exe" -version

Write-Host "Step 1: Building production web assets..." -ForegroundColor Yellow
Set-Location "c:\Users\USER\Desktop\RRBM APP"
npm run build

Write-Host "Step 2: Syncing Capacitor Android assets..." -ForegroundColor Yellow
npx cap sync android

# Ensure Java 17 compatibility in capacitor.build.gradle
(Get-Content 'android\app\capacitor.build.gradle') -replace 'VERSION_21', 'VERSION_17' | Set-Content 'android\app\capacitor.build.gradle'

# Remove any old APK artifacts
$outputApk = "c:\Users\USER\Desktop\RRBM APP\android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $outputApk) {
    Remove-Item $outputApk -Force
}

Write-Host "Step 3: Compiling Standalone Android APK (assembleDebug)..." -ForegroundColor Yellow
Set-Location "c:\Users\USER\Desktop\RRBM APP\android"

# Execute Gradle with JDK 17
& ".\gradlew.bat" assembleDebug

if (Test-Path $outputApk) {
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "SUCCESS! RRBM Android APK Created!" -ForegroundColor Green
    Write-Host "APK File: $outputApk" -ForegroundColor Green
    
    # Also copy to root workspace for easy access
    $shareableApk = "c:\Users\USER\Desktop\RRBM APP\RRBM-Festival-2026.apk"
    Copy-Item -Path $outputApk -Destination $shareableApk -Force
    Write-Host "Sharable Copy Created at: $shareableApk" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Error "APK file was not created. Please check Gradle logs."
}
