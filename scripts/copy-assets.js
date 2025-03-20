// Scripts/copy-assets.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas de directorios
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src', 'public');
const distDir = path.join(rootDir, 'dist', 'public');

// Crear el directorio dist/public si no existe
if (!fs.existsSync(distDir)) {
  console.log('Creando directorio dist/public...');
  fs.mkdirSync(distDir, { recursive: true });
}

/**
 * Función recursiva para copiar archivos y directorios
 * @param {string} src - Directorio de origen
 * @param {string} dest - Directorio de destino
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Iniciar el proceso de copia
console.log(`Copiando archivos desde ${srcDir} a ${distDir}...`);
try {
  copyRecursiveSync(srcDir, distDir);
  console.log('✅ Archivos copiados correctamente.');
} catch (error) {
  console.error('❌ Error al copiar archivos:', error);
  process.exit(1);
} 