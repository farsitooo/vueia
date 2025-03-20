@echo off
echo === Script de Despliegue para Sistema de Análisis Visual ===
echo.

REM Paso 1: Instalar dependencias
echo Paso 1: Instalando dependencias...
call npm install
echo ✓ Dependencias instaladas correctamente
echo.

REM Paso 2: Construir el proyecto
echo Paso 2: Construyendo el proyecto...
call npm run build:server
echo ✓ Proyecto construido correctamente
echo.

REM Paso 3: Copiar archivos estáticos
echo Paso 3: Copiando archivos estáticos...
if not exist "dist\public" mkdir dist\public
xcopy src\public\* dist\public\ /E /Y
echo ✓ Archivos estáticos copiados correctamente
echo.

REM Paso 4: Verificar si Vercel CLI está instalado
echo Paso 4: Verificando Vercel CLI...
where vercel > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Vercel CLI no encontrado. ¿Desea instalarlo? (s/n)
    set /p instalar=
    if /i "%instalar%"=="s" (
        call npm install -g vercel
        echo ✓ Vercel CLI instalado correctamente
        echo.
    ) else (
        echo Omitiendo instalación de Vercel CLI.
        echo.
        echo Para desplegar manualmente, ejecute:
        echo   vercel login
        echo   vercel
        echo ✓ Script completado. Proyecto listo para despliegue manual.
        exit /b
    )
) else (
    echo ✓ Vercel CLI encontrado
    echo.
)

REM Paso 5: Preguntar si desea desplegar
echo Paso 5: ¿Desea desplegar el proyecto en Vercel ahora? (s/n)
set /p desplegar=

if /i "%desplegar%"=="s" (
    echo Iniciando despliegue en Vercel...
    
    REM Verificar si el usuario está logueado
    vercel whoami > nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Es necesario iniciar sesión en Vercel. Ejecutando 'vercel login'...
        call vercel login
    )
    
    REM Preguntar si es producción o preview
    echo ¿Desea desplegar en producción? (s/n)
    set /p produccion=
    
    if /i "%produccion%"=="s" (
        call vercel --prod
    ) else (
        call vercel
    )
    
    echo ✓ Despliegue completado
) else (
    echo Omitiendo despliegue.
    echo Para desplegar más tarde, ejecute:
    echo   vercel login
    echo   vercel
    echo ✓ Script completado. Proyecto listo para despliegue.
)