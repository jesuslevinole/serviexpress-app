# ServiExpress · V00075 — El botón para devolver los camiones a su estación

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Por qué no lo veías
El botón "Fix stations" salió en V00074 pero solo para el ADMINISTRADOR, y
tu sesión entra con el rol DEVELOPER. Ahora lo ve cualquiera que pueda
EDITAR camiones (admin incluido).

## Dónde está y qué hace
Módulo TRUCKS -> barra superior -> botón "Fix stations" (icono de llave).
1. Lo presionas y te muestra cuántos camiones se van a mover y tres
   ejemplos ("731564 → 771", etc.).
2. Confirmas y actualiza TODOS los camiones de una vez: la Current station
   se reconstruye a partir de la columna Sch/B ("RED 771" -> estación 771).
3. Cada cambio queda en el historial del camión con el motivo
   "Fix stations from Sch/B", así que es auditable y reversible a mano.
4. Al terminar, arriba del módulo aparece: "N trucks were moved back to the
   station in their Sch/B."

## Emparejado más tolerante
Reconoce la estación por su número dentro del Sch/B ("RED 771", "771 RED",
"770 RED") y también por el nombre completo si coincide. Si al abrir el
diálogo dice que no hay nada que cambiar, el mensaje ahora explica por qué e
indica cuántas estaciones encontró en Catalogs — normalmente significa que
las estaciones no están nombradas con su número.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00075.
