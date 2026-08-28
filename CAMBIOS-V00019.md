# ServiExpress · V00019 — Conteo de camiones por reporte: a prueba de fallas y con diagnóstico visible

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué pasaba
El clasificador (V00018) fallaba en silencio: al primer error de la consulta de
conteo abortaba todo y no escribía nada, y el error solo salía en la consola
del navegador. Causa más probable: la consulta de AGREGACIÓN de Firestore
(getCountFromServer) falla en pestañas que no son la "principal" cuando el
caché persistente multi-pestaña está activo (bug conocido del SDK con muchas
pestañas abiertas). Los datos sí están: el reporte con 10 camiones se ve
perfecto en su subtabla porque esa usa una consulta normal.

## Qué cambia
1. Conteo con RESPALDO automático (countDocumentsSafe): si la agregación
   falla, cuenta con la MISMA consulta normal que usa la subtabla (la que ya
   funciona en tu navegador). Un poco más de lecturas solo en el plan B, y
   una sola vez por reporte.
2. Ya NO aborta: si un reporte falla, sigue con los demás.
3. Progreso VISIBLE bajo las pestañas: "Counting trucks per report… 120/357".
   Si algo falla, muestra cuántos y el error EXACTO de Firestore, con botón
   Retry. Así, si volviera a pasar, la siguiente captura de pantalla me dice
   la causa real.

## Al publicar
Entra a BC Reports (pestaña All) y deja la pantalla 1-2 minutos: verás el
contador avanzar hasta 357 y las pestañas Empty / With trucks llenarse. Es un
proceso de UNA sola vez; los reportes nuevos ya nacen contados.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00019.
