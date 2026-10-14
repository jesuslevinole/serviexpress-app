#!/usr/bin/env node
/**
 * Comprueba que el repositorio tenga EXACTAMENTE los archivos del paquete,
 * con las mismas mayúsculas. Se ejecuta en la raíz del repositorio:
 *
 *     node revisar-paquete.mjs
 *
 * Por qué existe: Windows no distingue mayúsculas de minúsculas, Linux (el
 * servidor donde Cloudflare compila) sí. Un archivo que en el repositorio
 * quedó como "Datatable.tsx" funciona en tu máquina y revienta el build con
 * "Could not resolve ...". Esta comprobación mira el ÍNDICE DE GIT (que es
 * lo que se sube), no el disco, así que ve el nombre real.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const MANIFEST = 'MANIFIESTO.txt';

if (!existsSync(MANIFEST)) {
  console.error(`No encuentro ${MANIFEST}. Copia también ese archivo del paquete.`);
  process.exit(2);
}

const esperado = readFileSync(MANIFEST, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'));

let enGit;
try {
  enGit = execSync('git ls-files src public', { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
} catch {
  console.error('Esto hay que ejecutarlo dentro del repositorio (no encuentro git).');
  process.exit(2);
}

const setGit = new Set(enGit);
const porMinusculas = new Map(enGit.map((path) => [path.toLowerCase(), path]));

const faltan = [];
const malasMayusculas = [];
for (const path of esperado) {
  if (setGit.has(path)) continue;
  const parecido = porMinusculas.get(path.toLowerCase());
  if (parecido) malasMayusculas.push({ esperado: path, enRepo: parecido });
  else faltan.push(path);
}

const setEsperado = new Set(esperado);
const sobran = enGit.filter((path) => !setEsperado.has(path));

console.log(`Paquete: ${esperado.length} archivos · Repositorio: ${enGit.length}\n`);

if (malasMayusculas.length > 0) {
  console.log(`MAYÚSCULAS DISTINTAS (${malasMayusculas.length}) — esto rompe el build en Cloudflare:`);
  malasMayusculas.forEach((item) => console.log(`  repo: ${item.enRepo}\n  debe: ${item.esperado}`));
  console.log('');
}
if (faltan.length > 0) {
  console.log(`NO ESTÁN EN EL REPOSITORIO (${faltan.length}):`);
  faltan.forEach((path) => console.log(`  ${path}`));
  console.log('');
}
if (sobran.length > 0) {
  console.log(`SOBRAN, ya no son del paquete (${sobran.length}) — se pueden borrar:`);
  sobran.forEach((path) => console.log(`  ${path}`));
  console.log('');
}

if (malasMayusculas.length > 0 || faltan.length > 0) {
  console.log('Cómo arreglarlo, desde la raíz del repositorio:\n');
  console.log('  git config core.ignorecase false');
  console.log('  git rm -r --cached src public');
  console.log('  git add src public');
  console.log('  git status      (verás los nombres corregidos)');
  console.log('  git commit -m "Corrige nombres de archivo"');
  console.log('  git push\n');
  process.exit(1);
}

console.log('Todo correcto: el repositorio tiene los mismos archivos que el paquete.');
