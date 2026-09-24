# ServiExpress · V00071 — Type, mantenimientos del reporte y detalle en modales

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Campo "Type" en el Fleet Report
Segundo campo del formulario, obligatorio, con el mismo desplegable del BC:
TRUCK + SCANNER (por defecto), ONLY TRUCK y ONLY SCANNER.

## 2. Los mantenimientos creados desde el reporte
En el detalle del Fleet Report hay un botón "Maintenance from this report"
que lista los mantenimientos (correctivos y preventivos) nacidos de ese
registro, con fecha, tipo, estatus, millaje, el problema y quién lo capturó.
Es el camino de ida; el de vuelta es el botón "Came from…" que ya está en el
detalle del mantenimiento.

## 3. El detalle, por botones y modales
Las pestañas del pie del detalle (Files & photos, Changes y las vistas
relacionadas) son ahora BOTONES: cada uno abre su propio modal, más amplio y
sin alargar la ficha. Dentro del modal de "Files & photos" están los botones
de "Take photo" y "Upload photo / PDF" con la lista de archivos.

## 4. La pestaña "Historic" es de solo consulta
Con Historic activa, la barra superior deja únicamente FILTERS y EXPORT
EXCEL. Se ocultan Add, Template, Import CSV, Bulk import, Email on save,
Alerts, My trucks y Merge duplicates: sobre semanas ya cerradas no se
captura, solo se consulta. Al volver a "In progress" reaparecen todos.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00071.
