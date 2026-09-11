# ServiExpress · V00054 — Los duplicados, primeros en la lista

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué cambia
En Fleet (y en cualquier módulo con un campo único), los registros
repetidos ahora salen AL PRINCIPIO de la tabla, en la página 1, sin tener
que buscarlos:
- Primero los marcados "DUPLICATE" (los más viejos del mismo camión).
- Justo después, el registro que SÍ se conserva de ese mismo camión, para
  que puedas comparar los dos antes de borrar.
- El resto de la lista conserva el orden que elijas por columnas.
- Si ordenas por una columna, el bloque de repetidos sigue arriba: la idea
  es que no se pierdan de vista hasta resolverlos.

## Aviso con el conteo
Sobre la tabla aparece: "N records are repeated in Fleet and are shown
first, marked DUPLICATE: keep the newest and delete the marked one.
Deleting here does not affect the truck history in Trucks."
Cuando ya no queden repetidos, el aviso desaparece solo.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00054.
