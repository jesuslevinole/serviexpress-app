# ServiExpress · V00037 — Historial completo del camión por pestañas + auditoría de todo

Reemplaza la carpeta `src/` completa y `public/version.json`.
Archivos nuevos para git: src/services/changeLog.ts,
src/components/crud/ChangeHistoryList.tsx (+.css),
src/components/crud/DetailTabs.tsx.

## 1. La alerta roja de cuota
Ya no es roja ni pide Retry: cuando la cuota diaria gratuita se agota, la
cuenta se PAUSA con un aviso amarillo informativo ("resumes by itself
another day — nothing to do") y se reanuda sola en la siguiente sesión con
cuota. (La salida definitiva sigue siendo Blaze.)

## 2. Detalle del camión con PESTAÑAS (clic en cualquier fila de Trucks)
  Corrective maintenance · Preventive maintenance ·
  Station & Entity changes · Shop · Fleet · All changes
- "Station & Entity changes": cada movimiento con fecha, de dónde a dónde y
  QUIÉN lo registró (la bitácora truck_history que ya venía llevándose).
- "Shop": todas sus órdenes de taller (apertura, taller, diagnóstico,
  estatus, cierre y quién).
- "Fleet": su registro de flota (ruta, driver, estación, escáner y quién).
- "All changes": la bitácora universal nueva (punto 3).
- Cada pestaña carga solo al abrirla (no gasta lecturas hasta que se usa).
- Los mismos visores rápidos de camión (los números clicables de V00035)
  muestran también estas pestañas.

## 3. AUDITORÍA UNIVERSAL — se registra absolutamente todo
Desde esta versión, en TODOS los módulos, cada operación deja constancia en
la colección change_log:
- ALTA: quién creó el registro, cuándo (hora de Texas) y con qué valores
  iniciales, campo por campo.
- EDICIÓN: cada campo cambiado con su valor anterior -> nuevo, ya resueltos
  a texto legible (si mañana borran una estación del catálogo, la bitácora
  conserva su nombre de ese momento).
- BORRADO: quién eliminó el registro y cuándo.
- Si un admin actúa en "View as", queda el nombre REAL con la aclaración:
  "Jesús Molero (as Orlando Pimentel)".
- La bitácora nunca estorba: si su escritura falla, el guardado del usuario
  sigue normal.
La pestaña "All changes" (o la sección "Changes" en módulos sin pestañas)
muestra ese historial en cada registro de cada módulo.
Límite honesto: la bitácora arranca HOY (lo anterior a V00037 no existe,
salvo los movimientos de estación/entidad que ya se venían guardando) y las
importaciones masivas por CSV aún no se auditan renglón por renglón — si lo
quieres, se agrega.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00037.
