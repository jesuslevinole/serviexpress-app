# ServiExpress · V00032 — Activar/desactivar Drivers, Trucks y Assets

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Botón de activo/inactivo
En Drivers, Trucks y Assets, la columna de acciones trae un botón nuevo
(icono de encendido):
- Un clic marca el registro como INACTIVO: la fila se atenúa y el icono se
  pinta rojo. Otro clic lo reactiva.
- Lo puede usar quien tenga permiso de Edit en ese módulo.
- En campos de estatus de texto (datos migrados de Assets) escribe
  ACTIVE / INACTIVE; en los de casilla escribe Sí/No. El lector entiende
  ambos, igual que los textos viejos (INACTIVO, BAJA, NO).

## Los inactivos desaparecen de TODOS los desplegables
Camiones, drivers y assets inactivos ya no se ofrecen en ninguna lista:
formulario principal, renglones del BC Report (alta y reporte abierto),
alta rápida (+), edición rápida (lápiz) y cualquier selector de referencia.
Dos garantías:
- Los registros VIEJOS que ya referencian a un inactivo siguen mostrando su
  nombre normal (no se rompe el historial), y si editas ese registro, el
  valor elegido se conserva en el selector para que no se vacíe.
- En BC Reports ya contaba solo activos: ahora desactivar un camión también
  lo saca del "X of Y" y de la lista de faltantes al instante, con su motivo
  visible en el grupo "not counted" si estaba capturado.

## Nota
El campo Status de los formularios sigue existiendo (misma marca); el botón
es solo el atajo de un clic desde la tabla.

Archivo nuevo para git: src/services/activeStatus.ts (git add -A).

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00032.
