# ServiExpress · V00067 — Filtros con los colores del tema y avance visible siempre

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Los campos del panel de Filtros
Las cajas de texto y los rangos Min/Max no declaraban color: el navegador
las pintaba BLANCAS sobre el tema oscuro. Ahora usan el fondo y el texto del
tema, con el texto de ayuda en gris suave, igual que el resto de los
formularios.

## 2. El avance se ve también con la ventana cerrada
El conteo "X of Y trucks at your station" solo aparecía con la ventana
ABIERTA; por eso en Fleet Report no se veía nada. Ahora se muestra siempre:
- Ventana abierta: "12 of 20 trucks at your station added in this window ·
  8 still missing".
- Ventana cerrada: el mismo conteo, referido a la ventana que abre después.
El número cuenta lo capturado por CUALQUIER BC de la estación: si otro
compañero ya agregó uno de los que faltaban, el total baja solo (20 -> 19
pendientes) sin que nadie tenga que avisar.

## 3. Quién agregó cada camión
En "See which ones" el grupo de agregados ahora dice "Show the N already
added and who added them", y cada línea trae el reporte y el responsable:
"201264 · XKB7324 — Fleet Report 09/23/2026 · 770 · by Jesus Molero".
También sigue apareciendo al intentar capturar uno ya tomado y en la columna
"Captured by" de la tabla.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00067.
