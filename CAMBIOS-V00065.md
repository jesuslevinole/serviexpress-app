# ServiExpress · V00065 — Horarios con nombre, visibles y reutilizables

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. La ventana muestra TODOS los horarios guardados
En "Change window" la tabla "Saved schedules" lista ahora:
- El horario EN USO en la primera fila, marcado "In use".
- Debajo, los horarios usados antes, cada uno con "Use this one" para
  cargarlo en el formulario y confirmarlo con "Update window".
Si todavía no hay ninguno guardado, el modal lo dice y explica que al
presionar "Save window" se crea el primero y queda en la lista para
reutilizarlo. (Antes la tabla solo aparecía cuando ya existía un historial,
por eso no veías nada.)

## 2. Cada horario tiene NOMBRE
Formato "Desde - Hasta - Hora inicio - Hora fin":
  "Tue - Wed - 08:00 - 23:59"   (con "(+1w)" si el cierre cae en la semana
                                 siguiente)
Ese nombre se ve en la tabla de horarios y, junto a él, la lectura larga
("Tue 8:00 AM → Wed 11:59 PM").

## 3. Cada Fleet Report dice con qué horario se capturó
Columna nueva "Schedule used" en el módulo: guarda el nombre del horario
vigente al momento de guardar el registro. Así, aunque cambies el horario
después, cada registro conserva la regla con la que se capturó (suma al
sello de ventana de V00063).
Nota: los registros creados ANTES de esta versión no tienen ese nombre y
aparecen vacíos en la columna; los nuevos sí.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00065.
