# ServiExpress · V00016 — Ventana SEMANAL de BC Reports + permisos en Roles

Reemplaza la carpeta `src/` completa y `public/version.json`.
(Incluye todo lo de V00015; si no aplicaste V00015, no importa: este paquete trae todo.)

## Cambios respecto a V00015

1. LA VENTANA AHORA ES SEMANAL, POR DÍA DE LA SEMANA.
   El admin elige: día en que ABRE + hora, y día en que CIERRA + hora (hora de
   Texas), y se repite automáticamente cada semana. Por omisión el modal
   propone: Monday 8:00 AM -> Sunday 11:59 PM.
   - Al cerrar el domingo, el lunes abre sola la siguiente ventana: no hay que
     volver a configurarla cada semana.
   - "Un camión una vez por ventana" se reinicia con cada semana.
   - Aviso al BC cuando está cerrada: "opens again in 1d 4h 12m · Mon, Aug 31,
     8:00 AM CT · every week from Monday 8:00 AM to Sunday 11:59 PM (Texas time)".
   - El documento viejo de settings_windows (fechas fijas de V00015) se ignora:
     solo hay que abrir la ventana una vez con el formato nuevo.

2. PERMISOS EN LA MATRIZ DE ROLES (dos columnas nuevas):
   - "Capture window (set schedule)"  -> quién puede abrir/cambiar/quitar el
     horario semanal (el botón del aviso en BC Reports).
   - "Add outside window"             -> quién puede capturar aunque la ventana
     esté cerrada (supervisores/oficina que corrigen datos). Las demás reglas
     (un camión por ventana, camión en taller/correctivo) le siguen aplicando.
   El administrador real siempre puede ambas cosas; con "View as" se respeta lo
   del rol simulado. Los roles existentes arrancan con ambas en OFF: hay que
   marcarlas en Roles a quien corresponda.

## Recordatorio de lo que ya hacía (V00015)
- Fuera de la ventana no se agregan BC Reports ni renglones (botones
  deshabilitados y guardado rechazado aunque el formulario quedara abierto).
- Cada camión entra UNA vez por ventana; si ya está, sale del desplegable y se
  informa dónde y quién: "already added in this window: BC Report 2026-08-31 ·
  Station 2 · by Ana".
- Camión bloqueado con Shop ABIERTA/EN PROCESO o correctivo Pending/In progress
  (se libera al cerrar la orden o marcar Done).
- Banner con cuenta regresiva y camiones de la estación que faltan por agregar.
- Un camión no se repite dentro del mismo reporte.
- Fechas "de hoy" del app en hora de Texas.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00016 en
src/config/version.ts y public/version.json.
