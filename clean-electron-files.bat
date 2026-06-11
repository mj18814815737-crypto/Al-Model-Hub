@echo off
setlocal

echo This script will delete scattered Electron runtime files from the current directory:
echo.
echo   electron.exe
echo   *.dll
echo   *.pak
echo   *.bin
echo   icudtl.dat
echo   version
echo   LICENSE*
echo.
echo It will NOT delete node_modules or source files.
echo.

set /p CONFIRM=Continue? Type Y to proceed: 

if /I not "%CONFIRM%"=="Y" (
  echo Cancelled.
  exit /b 0
)

echo Cleaning Electron runtime files...

del /f /q "electron.exe" 2>nul
del /f /q "*.dll" 2>nul
del /f /q "*.pak" 2>nul
del /f /q "*.bin" 2>nul
del /f /q "icudtl.dat" 2>nul
del /f /q "version" 2>nul
del /f /q "LICENSE*" 2>nul

echo Done.
endlocal
