@echo off
setlocal enabledelayedexpansion

set "KEY_FILE=%~dp0AGE_SECRET_KEY.txt"
set "ENCRYPTED_FILE=%~dp0mirageml-backend\.env.age"
set "DECRYPTED_FILE=%~dp0mirageml-backend\.env"
set "AGE_DIR=%~dp0age"

if not exist "%KEY_FILE%" (
    echo ERROR: Age secret key not found at %KEY_FILE%
    echo Please restore your AGE_SECRET_KEY.txt file
    exit /b 1
)

if not exist "%ENCRYPTED_FILE%" (
    echo ERROR: Encrypted .env.age not found at %ENCRYPTED_FILE%
    exit /b 1
)

if not exist "%AGE_DIR%\age\age.exe" (
    echo Downloading age...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/FiloSottile/age/releases/download/v1.1.1/age-v1.1.1-windows-amd64.zip' -OutFile 'age.zip'"
    powershell -Command "Expand-Archive -Path age.zip -DestinationPath age -Force"
    del age.zip
)

echo Decrypting .env...
"%AGE_DIR%\age\age.exe" --decrypt -i "%KEY_FILE%" "%ENCRYPTED_FILE%" -o "%DECRYPTED_FILE%"

if errorlevel 1 (
    echo ERROR: Failed to decrypt .env
    exit /b 1
)

echo SUCCESS: .env has been decrypted