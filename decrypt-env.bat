@echo off

set "KEY_FILE=%~dp0AGE_SECRET_KEY.txt"
set "ENCRYPTED_FILE=%~dp0mirageml-backend\.env.age"
set "DECRYPTED_FILE=%~dp0mirageml-backend\.env"
set "AGE_DIR=%~dp0age"
set "AGE_EXE=%AGE_DIR%\age\age.exe"

if not exist "%KEY_FILE%" (
    echo ERROR: Age secret key not found at %KEY_FILE%
    echo Please copy AGE_SECRET_KEY.txt to project root
    pause
    exit /b 1
)

if not exist "%ENCRYPTED_FILE%" (
    echo ERROR: Encrypted .env.age not found at %ENCRYPTED_FILE%
    pause
    exit /b 1
)

if not exist "%AGE_EXE%" (
    echo Downloading age...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/FiloSottile/age/releases/download/v1.1.1/age-v1.1.1-windows-amd64.zip' -OutFile 'age.zip'"
    powershell -Command "Expand-Archive -Path age.zip -DestinationPath %AGE_DIR% -Force"
    del age.zip 2>nul
)

if not exist "%AGE_EXE%" (
    echo ERROR: Failed to download age
    pause
    exit /b 1
)

echo Decrypting .env...
"%AGE_EXE%" --decrypt -i "%KEY_FILE%" -o "%DECRYPTED_FILE%" -- "%ENCRYPTED_FILE%"

if errorlevel 1 (
    echo ERROR: Failed to decrypt .env
    echo Make sure AGE_SECRET_KEY.txt is correct
    pause
    exit /b 1
)

echo SUCCESS: .env has been decrypted
echo .
echo Contents of .env:
type "%DECRYPTED_FILE%"
pause