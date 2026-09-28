# ServiExpress · V00072 — Accesos por usuario, además del rol

Reemplaza la carpeta `src/` completa y `public/version.json`.
Archivos nuevos para git: src/pages/UserAccessModal.tsx (+ .css).

## Para qué
Dar una vista a UNA persona concreta sin cambiar el rol de todo su grupo:
por ejemplo, que dos BC empiecen a usar Fleet Report mientras el resto de
los BC todavía no lo ven.

## Cómo se usa
En Administración -> Users hay una columna nueva "Extra access" con un botón
por persona:
- Muestra "Set up" si no tiene nada extra, o "3 extra" con el número de
  permisos concedidos.
- Al abrirlo aparece la lista de módulos (con buscador) y las casillas:
  View · Create · Edit · Delete · Export · Historic tab.
- Marcas lo que esa persona necesita y presionas "Save access".
- La persona lo ve en su siguiente carga (no hace falta tocar su rol).

## Reglas
- Los accesos extra SE SUMAN a los del rol; NUNCA quitan lo que el rol ya
  concede. Para retirar algo que viene del rol, hay que cambiar el rol.
- Para quitarle un acceso extra, se desmarca la casilla y se guarda.
- En "View as" se evalúan los accesos extra de la persona simulada, así que
  la vista sigue siendo fiel a lo que esa persona ve.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00072.
