@echo off
title RRBM Android APK Builder
echo ========================================================
echo    RRBM - Revival for Re-Built Ministries 2026
echo    Building Android APK Package...
echo ========================================================

echo Step 1: Building production web assets...
call npm run build

echo Step 2: Syncing assets with native Android project...
call npx cap sync android

powershell -Command "(Get-Content 'android\app\capacitor.build.gradle') -replace 'VERSION_21', 'VERSION_17' | Set-Content 'android\app\capacitor.build.gradle'"

echo Step 3: Compiling Android APK with Gradle (Java 17)...
set "JAVA_HOME=C:\Users\USER\.jdks\jdk17_clean\jdk-17.0.12+7"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd android
call gradlew.bat assembleDebug

if exist "app\build\outputs\apk\debug\app-debug.apk" (
    copy /y "app\build\outputs\apk\debug\app-debug.apk" "..\RRBM-Festival-2026.apk"
    echo ========================================================
    echo SUCCESS! RRBM Android APK Created!
    echo Location 1: android\app\build\outputs\apk\debug\app-debug.apk
    echo Location 2: RRBM-Festival-2026.apk (in project root)
    echo ========================================================
) else (
    echo ========================================================
    echo Build finished. Check output above for details.
    echo ========================================================
)

pause
