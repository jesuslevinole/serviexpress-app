# ServiExpress · V00034 — La vista del BC amarrada a su Current station

Reemplaza la carpeta `src/` completa y `public/version.json`.
Archivos nuevos para git: src/components/crud/MyTrucksModal.tsx y .css.

Aplica a TODOS los BC (Orlando es el ejemplo).

## 1. Desplegables de camiones acotados a SU estación
En cualquier formulario donde se elige un camión (BC Reports, Fleet,
Maintenance, Assets, Shop…), un usuario acotado a estaciones solo ve los
camiones cuya CURRENT STATION es la suya. Un BC de la 770 solo ve la 770.
- Admin y oficina siguen viendo todos.
- Si un registro viejo ya apuntaba a un camión de otra estación, ese valor
  se conserva en el selector para no vaciar el campo al editar.
- Se suma a lo que ya había: inactivos fuera, bloqueos de la ventana, y la
  regla "camión solo por su estación" al guardar.

## 2. "My trucks" — la vista del BC con su notificación
Botón nuevo en BC Reports (solo usuarios de estación): "My trucks", con un
GLOBO ROJO cuando hay novedades. Al abrirlo:
- Arriba, la alerta: "N trucks captured by your station no longer count for
  it", con cada camión y su motivo ("the catalog places it at 782 today",
  "inactive truck") — el aviso de que un camión fue cambiado de estación o
  dado de baja.
- Abajo, TODOS los camiones de su estación con su estado en la ventana:
  ADDED (y en qué reporte), NOT REQUIRED (en taller / correctivo, con el
  motivo) o PENDING, con buscador por número.
Sin lecturas extra: se arma con los datos que el módulo ya tiene.

## 3. Fleet personalizado por BC
El aviso de cobertura de Fleet (y Trucks) ahora se mide sobre SU estación y
dice su parte: "Of 34 registered trucks at your station, 28 are already in
Fleet (25 added by you) and 6 are not." — con la lista de cuáles faltan.
Solo cuenta camiones ACTIVOS de su Current station; el admin sigue viendo el
global de toda la flota.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00034.
