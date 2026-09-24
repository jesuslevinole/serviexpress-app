# ServiExpress · V00068 — Fleet Report: sin duplicados, correctivo directo y pestañas

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1 y 2. Ni camiones ni drivers repetidos en la semana
Dentro de la misma ventana semanal, un camión y un driver van UNA sola vez.
La regla se aplica SIN EXCEPCIONES: también al administrador y a los roles
exentos de la ventana, y también al EDITAR un registro existente.
Si alguien lo intenta, el mensaje dice qué se repite y quién lo capturó:
"Truck 427732 ya está en un Fleet Report de esta semana (capturado por
Jesus Molero). Cada camión y cada driver van UNA sola vez por semana."
(Los dos 427732 que ya existen hay que borrarlos a mano una vez.)

## 3. Correctivo desde el propio reporte
- Se quitó el campo "Observations".
- Campo nuevo "Add corrective maintenance?" (Yes / No). Con "Yes" aparece
  "Specify the problem".
- Al guardar con "Yes", el app abre DIRECTO el alta de Maintenance en modo
  Corrective, con el problema ya escrito en Diagnostic y los datos del
  camión (entidad, estación, escáner, millaje y cauchos) prellenados.
- El mantenimiento guarda DE DÓNDE VINO: en su detalle aparece el botón
  "Came from: Fleet Report 09/23/2026 · 201264", que abre ese Fleet Report.

## 4. Campo de fecha
"Date" es ahora el primer campo del Fleet Report, obligatorio y con la fecha
de hoy (hora de Texas) puesta por defecto.

## 5. La semana, con fechas reales
Cada registro guarda la semana a la que pertenece con fechas:
"09/22/2026 → 09/29/2026" (columna "Week (schedule)"). El martes siguiente
pasa solo al rango nuevo, sin tocar nada, y los registros viejos conservan
el suyo.

## 6. Verificación retirada
Fuera el botón de check y los campos de verificación del Fleet Report.

## 7. Dos pestañas
- IN PROGRESS: los registros de la semana vigente.
- HISTORIC: todo lo demás. Al cerrar la semana, sus registros pasan solos a
  Historic.
Cada pestaña trae su contador.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00068.
