# ServiExpress · V00018 — Corrección del clasificador de reportes vacíos + aviso más claro

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Corregido: las pestañas Empty / With trucks se quedaban en 0
Causa: cada vez que el backfill guardaba el contador de UN reporte, esa misma
escritura refrescaba la tabla y el ciclo se cancelaba: clasificaba un reporte
y se detenía, dejando el resto marcado como "ya procesado".
Arreglo:
- El ciclo ya no se cancela con los refrescos de la tabla.
- Recorre TODOS los reportes del módulo (los 357), no solo la página visible,
  para que los conteos de las pestañas queden completos.
- Sigue siendo barato y de una sola vez: 1 consulta de conteo por reporte
  (1 lectura, no una por renglón) y el resultado queda guardado en el
  documento para siempre.
Al publicar: abre BC Reports en la pestaña "All" y deja la pantalla un par de
minutos; verás los números de las pestañas subir hasta clasificar los 357.

## 2. Filtros / orden del módulo (ya disponibles, ahora sí operativos)
- Pestañas: All · Empty · With trucks (el filtro rápido de vacíos).
- Botón "Filters": filtro por columna — Date por rango, Entity/Station/BC por
  catálogo, y Trucks por texto (escribe EMPTY para ver solo los vacíos, o un
  número exacto).
- Clic en cualquier encabezado para ordenar (asc/desc); en TRUCKS descendente
  los EMPTY quedan al inicio.
- Sin filtro ni orden elegido, la tabla ordena por fecha del reporte, del más
  reciente al más viejo.

## 3. Aviso de la ventana más claro cuando está cerrada
Ahora dice desde cuándo:
  "BC Report window is closed since Wed, Aug 26, 11:59 PM CT. It opens again
   in 4d 9h 23m · Tue, Sep 1, 8:00 AM CT · every week from Tuesday 8:00 AM to
   Wednesday 11:59 PM (Texas time)."
Nota sobre el caso de la captura: con el horario martes 8:00 AM -> miércoles
11:59 PM, el jueves la ventana está CERRADA (cerró el miércoles a las 11:59 PM
y vuelve a abrir el martes): el mensaje era correcto. "Cerrará en X" solo
aplica mientras la ventana está abierta. Si quieren capturar también jueves a
lunes, hay que ampliar los días del horario (p. ej. abre lunes 8:00 AM ->
cierra domingo 11:59 PM).

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00018.
