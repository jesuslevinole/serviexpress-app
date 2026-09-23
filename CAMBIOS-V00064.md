# ServiExpress · V00064 — Horarios guardados seleccionables + barrido semanal

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Tabla de horarios guardados
En "Change window" los horarios anteriores se ven ahora en una TABLA con su
rango y hasta cuándo se usó, y cada uno trae el botón "Use this one": lo
carga en el formulario para que lo revises y confirmes con "Update window".
Si el que necesitas no está, lo creas abajo como siempre. El horario que ya
está en uso no se puede volver a guardar (aviso claro) y el historial no
acumula repetidos.

## 2. Barrido semanal: los no capturados pasan a "Maintenance"
Al cerrar una ventana, los camiones que NO tuvieron Fleet Report en esa
semana pasan automáticamente a la estación "Maintenance".
- Corre UNA sola vez por ventana (queda una marca en settings_sweeps) y solo
  lo dispara el administrador real al abrir el módulo — nunca en View as, ni
  varias veces aunque entren varios usuarios.
- Cada movimiento queda en la bitácora del camión: de qué estación salió, a
  cuál entró, y el motivo ("Weekly sweep — no Fleet Report in the window").
- Arriba del módulo aparece el resumen: "N trucks had no Fleet Report in the
  previous window and moved to the Maintenance station."

ANTES DE PUBLICAR, un paso obligatorio: crea en Catalogs -> Stations una
estación llamada exactamente "Maintenance". Si no existe, el app no mueve
nada y avisa: "Weekly sweep pending: there is no station named Maintenance".

## 3. Lo que ya estaba cubierto (verificado)
- Los BC solo ven, en el desplegable de camiones, los de SU estación actual.
- Un camión capturado esa semana desaparece del desplegable y, si alguien lo
  intenta, el mensaje dice DÓNDE está y QUIÉN lo agregó: "already added in
  this window: Fleet Report 09/12/2026 · 706 · by T'ara Kusek".
- La tabla del módulo trae la columna "Captured by" con el responsable de
  cada registro.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00064.
