# ServiExpress · V00083 — Trucks: icono de estado (Shop / correctivo / Maintenance)

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Icono junto al número de unidad
- Llave azul = tiene una orden de Shop ABIERTA / EN PROCESO.
- Triángulo rojo = tiene mantenimiento CORRECTIVO pendiente (Pending / In progress).
- Bodega amarilla = su Current station es "MAINTENANCE".
Un camión puede llevar más de un icono. Al pasar el mouse dice el motivo.
Los mismos datos que usa Fleet Report para marcar "not required", así que
todo coincide.

## Leyenda con conteos = filtro rápido
Encima del aviso: "N in Shop · N corrective pending · N at Maintenance station".
Un clic en cualquiera muestra solo esos camiones; otro clic (o "Show all")
vuelve a la lista completa. Se combina con el buscador y los filtros.

Verificado: `tsc -b` + `eslint` en limpio; versión V00083.
