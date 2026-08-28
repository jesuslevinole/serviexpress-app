# ServiExpress · V00017 — Reportes vacíos a la vista + "todos los camiones" dentro del reporte

Reemplaza la carpeta `src/` completa y `public/version.json`.
(Trae también todo lo de V00015/V00016.)

## 1. Qué reportes están vacíos
- Columna nueva "Trucks" en BC Reports: cuántos camiones (renglones) tiene cada
  reporte. Si tiene 0, se pinta en rojo: EMPTY.
- Pestañas nuevas arriba de la tabla: All · Empty (rojo) · With trucks (verde),
  con su conteo, para localizar los vacíos de un clic.
- Cómo funciona por dentro (sin gastar cuota): el motor lleva un contador
  rowsCount en cada reporte, que suma al capturar un renglón y resta al
  borrarlo (atómico: dos BC a la vez no se pisan). Los reportes viejos no
  traen el contador: al verlos en la tabla se calcula UNA vez con una consulta
  de conteo (1 lectura por reporte, no una por renglón) y queda guardado para
  siempre. Por eso en la primera visita algunos aparecen sin dato ("—") unos
  segundos y luego ya quedan clasificados.

## 2. "Todos los camiones dentro del rango"
- Al abrir un reporte (su subtabla de Maintenance) ahora aparece el resumen de
  la ventana vigente para SU estación:
  "This window · Station 2: 5 of 17 trucks added — every truck of the station
   must be in before the window closes. Missing: 12, 15, 33…"
  En verde cuando ya no falta ninguno; los camiones en taller/correctivo se
  indican como "not required".
- Esto se suma a lo que ya había: el aviso del módulo con la cuenta regresiva
  y los faltantes de la estación del BC, y el candado de "un camión una sola
  vez por ventana semanal".

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00017 en
src/config/version.ts y public/version.json.
