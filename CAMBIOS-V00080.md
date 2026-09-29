# ServiExpress · V00080 — Fleet Report: semana exacta, sin duplicados, conteos y "My trucks"

Reemplaza la carpeta `src/` completa y `public/version.json`. Incluye V00078 y V00079.

## 1. Drivers y Scanners sin restricción de estación
Ya venía de V00078: en Fleet Report (y en todo el app) los desplegables y
listas de Driver y Scanner muestran a TODOS, diga lo que diga el rol. Solo
se excluyen los inactivos.

## 2. Camiones duplicados dentro de la semana — validación contra TODA la base
Antes se revisaba solo contra lo que el usuario tenía en pantalla (el BC solo
descarga los reportes de SU estación). Ahora, al guardar (alta y edición), el
sistema consulta al servidor todos los Fleet Reports de ese camión (y de ese
driver) y rechaza si alguno cae en la semana vigente — por sello de semana o
por fecha de captura en hora de Texas —, venga de la estación que venga. El
mensaje dice el rango de la semana, quién lo capturó y cuándo.

## 3. "In progress" se limpia solo al cerrar la semana
Al llegar el cierre, los registros de esa semana dejan de estar en
"In progress" y quedan en "Historic". Antes no pasaba porque la ventana duraba
13 días (ver punto 5) y la semana "vigente" nunca terminaba.

## 4. Hora de Texas
- El nombre de la semana guardado en cada registro ("Week (schedule)") usaba
  la fecha UTC: el cierre martes 11:59 PM CT salía como MIÉRCOLES. Corregido.
- Las fechas con hora (sellos) se muestran con el día de Texas en todo el app.
- El detalle de un registro muestra fecha/hora en Texas.
- La fecha por omisión del Fleet Report se calcula al abrir el formulario (antes
  se fijaba al cargar el app y podía quedar con el día anterior).
- El minuto de cierre cuenta completo: 11:59 PM cierra a las 11:59:59 PM, pegado
  a la apertura de las 12:00 AM (sin minuto muerto).

## 5. Semana EXACTA (miércoles 12:00 AM → martes 11:59 PM)
La opción "Tuesday of the FOLLOWING week" sumaba una semana extra: la ventana
duraba 13d 23h 59m y se encimaba con la siguiente. Se eliminó esa opción: la
ventana cierra SIEMPRE en el primer día/hora de cierre después de abrir (nunca
más de una semana). El horario que ya tienes guardado se interpreta así de
inmediato, sin tocar nada: la semana vigente es Wed 09/23 12:00 AM → Tue 09/29
11:59 PM CT, y la siguiente arranca Wed 09/30 12:00 AM.
Nota: Fleet Report y BC Reports comparten el mismo horario (mismo reloj).

## 6. Admin / quien ve todo
"X of 278 trucks loaded in Fleet Report · N still missing · M not required
(in shop / corrective)". El total son todos los camiones ACTIVOS del catálogo.

## 7. BC (por Current station)
"Of the X trucks registered at your station, N still need to be loaded in Fleet
Report · Y loaded". Se cuenta por la Current station del camión.

## 8. Botón "My trucks" (BC)
- Se ALUMBRA (borde rojo pulsante + globo con el número) cuando a su estación le
  asignan un camión o se lo quitan. Al abrirlo ve:
  "Assigned to your station" y "Taken away from your station" (con a dónde se
  fue, o si lo dieron de baja). Al cerrar la ventana, el aviso se apaga hasta
  el próximo cambio.
- Cada camión trae botón "History": histórico de movimientos de estación
  (cuándo en hora de Texas, de qué estación a cuál y quién lo movió).
- "Fix stations" ahora también deja su movimiento en ese histórico.

Límites: el aviso se guarda por equipo (si el BC usa teléfono y computadora, lo
ve en cada uno); el catálogo de camiones se refresca cada 30 min, así que un
movimiento puede tardar hasta eso en encender el botón; los cambios de estación
hechos por Import CSV no quedan en el histórico.

Verificado: `tsc -b` + `eslint` en limpio; cálculo de la ventana probado con el
horario real (Wed 00:00 → Tue 23:59); versión V00080.
