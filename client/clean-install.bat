@echo off
echo Cleaning up client dependencies...
if exist node_modules (
    rmdir /s /q node_modules
    echo Removed node_modules folder
)
if exist package-lock.json (
    del package-lock.json
    echo Removed package-lock.json
)

echo Installing fresh dependencies...
npm install

echo Done! Client dependencies have been refreshed.
pause