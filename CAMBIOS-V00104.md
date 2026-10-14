# ServiExpress · V00104 — El build vuelve a fallar por nombres de archivo: causa y comprobación

Mismo código que V00103 (el arreglo del formulario que se borraba solo).
Lo que trae nuevo este paquete es la forma de no volver a perder una hora
con esto.

## Qué está pasando de verdad

```
Cannot find module '../ui/DataTable'
```

`src/components/ui/DataTable.tsx` SÍ va en el paquete (9.306 bytes). El
problema es el nombre con el que ese archivo quedó registrado en tu
repositorio: Windows no distingue mayúsculas de minúsculas, así que un
`Datatable.tsx` te funciona perfecto en tu máquina; el servidor donde
Cloudflare compila es Linux y sí distingue, busca `DataTable.tsx` y no lo
encuentra. Es el mismo caso de `UpdateNotice.css` en V00101: lo resolví
renombrando ese archivo, pero eso cura uno y deja los demás.

Git conserva en su índice el nombre con el que se registró la primera vez,
y en Windows no se entera de un cambio que solo sea de mayúsculas. Por eso
copiar la carpeta encima no lo corrige.

## El arreglo de raíz (una vez, y se acabó)

Desde la raíz del repositorio:

```
git config core.ignorecase false
git rm -r --cached src public
git add src public
git status
git commit -m "Corrige nombres de archivo"
git push
```

En `git status` verás los renombres de mayúsculas. Eso reconstruye el índice
con los nombres reales del disco, todos de una vez.

## La comprobación, antes de publicar

El paquete trae `MANIFIESTO.txt` (los 152 archivos que debe tener el
repositorio) y `revisar-paquete.mjs`. Copia los dos a la raíz del repositorio
y ejecuta:

```
node revisar-paquete.mjs
```

Te dice en tres listas: los que están con **otras mayúsculas** (los que
rompen el build), los que **faltan** y los que **sobran** de versiones
anteriores. Mira el índice de git, que es lo que se sube, no el disco: por
eso ve lo que tu equipo te esconde. Si sale "Todo correcto", el build de
Cloudflare va a pasar.

Nota: este paquete BORRA `src/index.css` (era una copia muerta). La
comprobación te lo marcará como "sobra" hasta que lo quites del repositorio.

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK; versión V00104.
