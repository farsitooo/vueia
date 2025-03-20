#!/bin/bash

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Script de Despliegue para Sistema de Análisis Visual ===${NC}\n"

# Paso 1: Instalar dependencias
echo -e "${YELLOW}Paso 1: Instalando dependencias...${NC}"
npm install
echo -e "${GREEN}✓ Dependencias instaladas correctamente${NC}\n"

# Paso 2: Construir el proyecto
echo -e "${YELLOW}Paso 2: Construyendo el proyecto...${NC}"
npm run build:server
echo -e "${GREEN}✓ Proyecto construido correctamente${NC}\n"

# Paso 3: Copiar archivos estáticos
echo -e "${YELLOW}Paso 3: Copiando archivos estáticos...${NC}"
if [ ! -d "dist/public" ]; then
  mkdir -p dist/public
fi
cp -r src/public/* dist/public/
echo -e "${GREEN}✓ Archivos estáticos copiados correctamente${NC}\n"

# Paso 4: Verificar si Vercel CLI está instalado
echo -e "${YELLOW}Paso 4: Verificando Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null
then
    echo -e "${YELLOW}Vercel CLI no encontrado. ¿Desea instalarlo? (s/n)${NC}"
    read instalar
    if [ "$instalar" = "s" ]; then
        npm install -g vercel
        echo -e "${GREEN}✓ Vercel CLI instalado correctamente${NC}\n"
    else
        echo -e "${YELLOW}Omitiendo instalación de Vercel CLI.${NC}\n"
        echo -e "${YELLOW}Para desplegar manualmente, ejecute:${NC}"
        echo -e "  vercel login"
        echo -e "  vercel"
        echo -e "${GREEN}✓ Script completado. Proyecto listo para despliegue manual.${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✓ Vercel CLI encontrado${NC}\n"
fi

# Paso 5: Preguntar si desea desplegar
echo -e "${YELLOW}Paso 5: ¿Desea desplegar el proyecto en Vercel ahora? (s/n)${NC}"
read desplegar

if [ "$desplegar" = "s" ]; then
    echo -e "${YELLOW}Iniciando despliegue en Vercel...${NC}"
    
    # Verificar si el usuario está logueado
    if ! vercel whoami &> /dev/null; then
        echo -e "${YELLOW}Es necesario iniciar sesión en Vercel. Ejecutando 'vercel login'...${NC}"
        vercel login
    fi
    
    # Preguntar si es producción o preview
    echo -e "${YELLOW}¿Desea desplegar en producción? (s/n)${NC}"
    read produccion
    
    if [ "$produccion" = "s" ]; then
        vercel --prod
    else
        vercel
    fi
    
    echo -e "${GREEN}✓ Despliegue completado${NC}"
else
    echo -e "${YELLOW}Omitiendo despliegue.${NC}"
    echo -e "${YELLOW}Para desplegar más tarde, ejecute:${NC}"
    echo -e "  vercel login"
    echo -e "  vercel"
    echo -e "${GREEN}✓ Script completado. Proyecto listo para despliegue.${NC}"
fi 