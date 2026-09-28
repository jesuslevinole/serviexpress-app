# ServiExpress · V00077 — Todos ven a todos los Drivers

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué cambia
El módulo Drivers queda ABIERTO para todos los usuarios:
- La LISTA ya no se filtra por estación ni por entidad, sin importar lo que
  diga la columna Visibility del rol. Un BC de la 771 ve los 369 conductores.
- Los DESPLEGABLES de conductor (Fleet Report, Fleet, BC Reports…) vuelven a
  ofrecer a todos: se quitó el acote por estación que se había puesto en
  V00042 para ahorrar lecturas.
- Se mantiene la única exclusión que sí importa: los conductores marcados
  como INACTIVOS siguen fuera de los desplegables (pero visibles en la lista
  del módulo, atenuados).

## Nota sobre lecturas
Cada carga fría vuelve a traer el catálogo completo de conductores (~370
documentos) en vez de los de una estación. Es un costo pequeño y consciente:
la regla de negocio pesa más que el ahorro.

## Lo demás sigue igual
Camiones y Fleet Report siguen acotados por la estación del usuario, que es
lo que pediste antes.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00077.
