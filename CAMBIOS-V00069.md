# ServiExpress · V00069 — La ventana muestra la semana con fechas reales

Reemplaza la carpeta `src/` completa y `public/version.json`.
(Incluye todo lo de V00068: sin duplicados de camión ni driver en la semana,
correctivo directo con enlace de origen, campo Date, verificación retirada y
pestañas In progress / Historic.)

## Lo que faltaba del punto 5
"Change window" decía solo "Tuesday → Tuesday". Ahora, además del horario,
muestra la SEMANA VIGENTE con fechas reales:

  Current week: Tue 09/22/2026 → Tue 09/29/2026
  · this range is saved on every record captured in it; next week it moves
    forward on its own.

- La misma fecha aparece bajo el horario "In use" de la tabla de horarios
  guardados.
- Se recalcula sola: el martes siguiente pasa a "Tue 09/29/2026 → Tue
  10/06/2026" sin que nadie toque nada.
- Es exactamente el rango que cada Fleet Report guarda en su columna
  "Week (schedule)" al capturarse, y el que separa las pestañas
  In progress / Historic.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00069.
