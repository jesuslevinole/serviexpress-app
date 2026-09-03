# ServiExpress · V00046 — Cambio de modelo: caché con vencimiento en vez de listeners

Reemplaza la carpeta `src/` completa y `public/version.json`.

## La causa real de que los recortes "no funcionaran"
Firestore tiene una regla de cobro que invalidaba nuestra estrategia: cuando
un listener en tiempo real se restablece tras MÁS DE 30 MINUTOS desconectado
(pestaña dormida, teléfono bloqueado, navegar y volver), COBRA EL RESULTADO
COMPLETO otra vez, como consulta nueva — aunque el caché local ya tenga todo
y no "descargue" nada visible. Por eso el monitor de la pestaña decía ~120 y
Firebase 150 mil: cada pestaña tuya y cada teléfono re-facturaban los 500
reportes + 500 mantenimientos + catálogos EN CADA DESPERTAR. Los recortes por
estación sí achicaron los paquetes, pero el modelo "listeners siempre vivos
para todo" estaba mal casado con ese cobro.

## El cambio de modelo (esta versión)
- LISTAS DE MÓDULO y CATÁLOGOS pasan a lecturas con caché y vencimiento:
  se sirven del caché local (0 lecturas) y solo consultan al servidor cuando
  vencen (listas 10 min, catálogos 30 min) o al volver el foco si ya
  vencieron. La marca de frescura vive en localStorage y se COMPARTE entre
  pestañas: una sola lectura de servidor por vencimiento para TODO el
  navegador, tengas 2 o 12 pestañas. Dormir/despertar YA NO cuesta nada.
- TUS ESCRITURAS SE VEN AL INSTANTE: crear, editar o borrar invalida el
  caché de esa colección y la vista activa se refresca de inmediato (y las
  otras pestañas se enteran por el evento de almacenamiento).
- EL TIEMPO REAL SE QUEDA SOLO DONDE LA OPERACIÓN LO EXIGE: el reloj de la
  ventana, los renglones de la semana (el "ya lo capturó otro"), y los
  bloqueos por taller/correctivo. Son conjuntos chicos y acotados.

## El intercambio honesto
Los cambios que hagan OTROS usuarios en listas y catálogos tardan hasta el
vencimiento (o hasta que enfoques la pestaña con el dato vencido) en verse,
en vez de aparecer al segundo. Para catálogos y tablas es un intercambio
correcto; las reglas de captura siguen al segundo.

## Cuentas esperadas
- Tu escritorio (10+ pestañas, todo el día): de decenas de miles a
  1-3 mil/día.
- Teléfono de BC: primera carga del día ~150-300; el resto del día,
  vencimientos de conjuntos chicos.
- Total esperado: días normales 5-15 mil; miércoles de cierre 15-25 mil.

## Sigue pendiente (mismas 2 de siempre)
1. El ÍNDICE (bcReportDetails: idStation Asc + createdAt Asc) — los
   renglones de la semana siguen en tiempo real, y sin índice cada BC baja
   los de TODAS las estaciones.
2. "Reads monitor" en el rol de los BC + capturas del acumulado mañana:
   verificación con datos, no con fe.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00046.
