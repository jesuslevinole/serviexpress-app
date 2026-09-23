# ServiExpress · V00063 — Cada registro queda amarrado a SU ventana

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Sello de ventana en cada registro
Al guardar un Fleet Report (o cualquier módulo con ventana), el registro
queda marcado con el RANGO EXACTO al que pertenece: fecha y hora de apertura
y de cierre de esa ventana.
- Si mañana cambias el horario, los registros viejos siguen contando para SU
  ventana: no se mezclan con los nuevos ni desaparecen del conteo.
- El "X of Y trucks added in this window" y el bloqueo de "este camión ya se
  capturó" usan primero ese sello y solo caen a la fecha de creación con los
  registros anteriores a esta versión.

## 2. Historial de horarios en "Change window"
Antes de cambiar el horario, el modal muestra "Schedules used before" con
los rangos que estuvieron vigentes y hasta cuándo se usaron.
- NO SE REPITEN: si intentas guardar un horario idéntico al actual, el app
  lo rechaza con un aviso; y si vuelves a uno ya usado, queda una sola
  entrada en el historial (la más reciente), sin duplicados.
- Se conservan los últimos 20 horarios.
- El historial vive en el mismo documento de la ventana, así que no cuesta
  lecturas extra.

Recuerda que Fleet Report y BC Reports COMPARTEN este reloj: el historial es
común a los dos.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00063.
