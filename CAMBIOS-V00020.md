# ServiExpress · V00020 — El conteo de camiones ahora mira donde están los datos históricos

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué pasaba (el hallazgo de la captura del reporte de Jose Machado)
Los "8 records" de ese reporte viven en la colección MAINTENANCE (la sección
"Maintenance of this report" lee de ahí, ligada por idBcReport). Los reportes
HISTÓRICOS migrados tienen sus renglones SOLO en maintenance; la colección de
renglones del app (bcReportDetails) está vacía para ellos. Yo contaba en
bcReportDetails, así que para los viejos el conteo daba 0 "correctamente"…
pero el reporte no está vacío. Los capturados en el app sí contaban bien.

## Qué cambia
1. El conteo ahora se hace sobre MAINTENANCE (por idBcReport). Cubre los dos
   mundos: los históricos migrados están ahí, y cada renglón capturado en el
   app también crea su espejo ahí (uno a uno), así que el número es el real
   para todos.
2. Recuento automático de UNA sola vez: cada reporte se re-verifica contra la
   fuente correcta y queda marcado como verificado (rowsCountOk), incluidos
   los que la versión anterior etiquetó EMPTY por error. Verás otra vez la
   nota "Counting trucks per report… X/331" hasta terminar; después no vuelve
   a contar.
3. Los reportes nuevos nacen contados y verificados; capturar o borrar un
   renglón sigue sumando/restando en vivo.

## Al publicar
BC Reports > pestaña All, deja la pantalla 1-2 minutos hasta que la nota de
conteo desaparezca. El reporte de Jose Machado (2026-06-09) debe quedar en 8,
y Empty debe quedar solo con los que de verdad no tienen nada ni en el app ni
en maintenance.

Nota menor: si algún día borran/mueven masivamente mantenimientos ligados a
reportes DESDE el módulo Maintenance, avísame y agrego un botón de recuento.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00020.
