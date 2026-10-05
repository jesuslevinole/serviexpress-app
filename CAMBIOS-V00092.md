# ServiExpress · V00092 — Excel de Drivers: activos / inactivos / todos

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## Antes de exportar se pregunta
En "Export Excel" de Drivers (y de Trucks, Assets y Rentals, que también
tienen activo/inactivo) aparece primero:
"Which drivers do you want to export?"
- Only ACTIVE
- Only INACTIVE
- All (active first, each one marked)
El botón Export se habilita al elegir una opción.

## En el archivo
- Primera columna "Status" con ACTIVE (verde) o INACTIVE (rojo) en cada
  driver; reemplaza el viejo Sí/No.
- Con "All": todos los ACTIVOS arriba y luego los INACTIVOS.
- El nombre del archivo y el título dicen cuál se exportó
  (Drivers - Active / - Inactive / - All).
- El filtro por fechas del diálogo sigue funcionando igual.

Verificado: `tsc -b` + `eslint` en limpio; versión V00092.
