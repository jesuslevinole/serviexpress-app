# ServiExpress · V00044 — Auditoría de lecturas (los 4 puntos, sobre el código real)

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Fugas de lecturas (listeners sin desuscribir, bucles, consultas malas)
AUDITADO, SIN FUGAS: el registro compartido de listeners cancela el cierre
programado cuando alguien se re-suscribe, entrega datos en memoria sin leer,
y cierra con keep-alive al quedar sin oyentes. Los efectos de React llevan
claves estables (sin bucles de re-suscripción). Dos hallazgos menores,
corregidos hoy:
- El documento de umbrales de alerta abría un canal por componente (tabla,
  detalle, listas, dashboard). Ahora hay UNA suscripción compartida para
  todo el app.
- Las lecturas puntuales de documento no aparecían en el monitor; ahora se
  cuentan ("colección (doc)").

## 2. Priorizar caché local
HECHO donde es seguro: los encabezados de reportes que se leen uno a uno
(los "capturado en el reporte de X" de otras estaciones) ahora van CACHÉ
PRIMERO: si el navegador ya los tiene, cuestan 0; solo el primero de cada
uno va al servidor. En listas vivas el caché ya manda desde antes
(IndexedDB multi-pestaña): una recarga sirve lo conocido del disco y solo
paga las diferencias.

## 3. ¿Cambiar onSnapshot por get()? — NO en esta arquitectura (importante)
Con caché persistente + registro compartido + keep-alive, el listener ES el
modo barato: la primera carga cuesta igual que un get(), y de ahí en
adelante solo se pagan los CAMBIOS. Un get() al servidor cobra el resultado
COMPLETO en cada llamada: sustituir los listeners por get() aquí SUBIRÍA el
consumo. Lo que sí dispara el gasto son las cargas frías multiplicadas por
dispositivos — y eso se atacó en V00042/V00043 acotando por estación y con
topes. Regla de la casa: listeners compartidos con tope y alcance, get()
solo para acciones puntuales del usuario (exportes, fusiones).

## 4. Límites y paginación
YA APLICADOS en V00042/V00043: los 11 módulos con tope 500; catálogos
grandes referenciados con tope (bcReports/maintenance) y por estación para
usuarios acotados; renglones de la semana por estación (con índice) y por
rango de fechas siempre.

## Recordatorio de las 2 pendientes de mayor impacto
1. Crear el índice de V00042 (bcReportDetails: idStation Asc + createdAt
   Asc) — activa el ahorro grande de los BC.
2. Luz verde para quitar la dependencia del catálogo Team (-430 lecturas
   por carga fría en 5 módulos).

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00044.
