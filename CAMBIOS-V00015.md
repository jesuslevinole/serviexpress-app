# ServiExpress · V00015 — Ventana de captura de BC Reports (hora de Texas)

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Archivos NUEVOS
- src/services/captureWindow.ts
- src/hooks/useCaptureWindow.ts
- src/components/crud/CaptureWindowBanner.tsx
- src/components/crud/CaptureWindowModal.tsx
- src/components/crud/CaptureWindow.css

## Archivos MODIFICADOS
- src/config/modules.ts            (ventana en bcReportsModule, uniqueRowKey idTruck,
                                    y corrección: el campo "type" del renglón del BC
                                    estaba en relatedViews en vez de bcDetailFields)
- src/types/models.ts              (CaptureWindowConfig, uniqueRowKey)
- src/services/firestoreService.ts (cláusulas "in" y "range" en servidor, fetchDocument)
- src/components/crud/CrudModule.tsx
- src/components/crud/DetailModal.tsx  (+ DetailModal.css)
- src/components/crud/CrudForm.tsx
- src/components/crud/DraftDetailRows.tsx
- src/config/version.ts            (V00015)
- public/version.json              (V00015)

## Qué hace
1. El admin abre la ventana desde el botón "Open window / Change window" del aviso
   en BC Reports (solo admin real). Inicio y cierre se capturan y se muestran en
   HORA DE TEXAS (America/Chicago) para todos, con reloj de Texas en vivo.
   Se guarda en Firestore: settings_windows/bcReports.
2. Fuera de la ventana nadie puede agregar BC Reports ni renglones (el botón Add se
   deshabilita y el guardado se rechaza aunque el formulario quedara abierto).
   El admin real (sin "View as") NO queda sujeto al horario, para corregir datos.
3. Dentro de la ventana cada camión entra UNA sola vez, lo capture quien lo capture.
   Si ya está, sale del desplegable y el aviso dice dónde y quién:
   "already added in this window: BC Report 2026-08-28 · Station 2 · by Ana".
4. Un camión con orden de Shop ABIERTA/EN PROCESO o con mantenimiento correctivo
   Pending/In progress queda bloqueado hasta que la orden se cierre o el
   correctivo se marque Done.
5. El aviso del módulo muestra a cada BC: cuenta regresiva (segundos) para el
   cierre, y los camiones de SU estación que faltan por agregar en la ventana
   actual (los que están en taller/correctivo se listan aparte y no se exigen).
6. Un camión tampoco se puede repetir dentro del mismo reporte.
7. Las fechas "de hoy" de los formularios ahora se toman con la fecha de Texas.

## Nota de datos
- "Una vez por ventana" se mide con el createdAt del renglón dentro del rango de la
  ventana: los renglones históricos no bloquean nada.
- No se requieren índices compuestos nuevos en Firestore (consultas de un solo campo).

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; sin `style={{}}` de valores fijos.
