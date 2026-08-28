# ServiExpress · V00027 — Fusión de personas duplicadas en Team

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué significaban los 90 errores del previo
"Name … matches 2/3/4 existing records" = el catálogo Team tiene a la MISMA
persona registrada varias veces (la carga original + las altas rápidas del
día a día). El importador se negó a renombrar a ciegas, que era lo correcto:
primero hay que quedarse con una sola copia de cada persona.

## Herramienta nueva: "Merge duplicates" (Catalogs > Team, solo admin)
- Agrupa los registros cuyo nombre es la misma persona escrita distinto
  ("ADAMS, Rayjohnal" y "Rayjohnal Adams" caen en el mismo grupo).
- En cada grupo conserva la copia MÁS REFERENCIADA (a igualdad, la más
  antigua), y lo muestra: cada copia dice cuántos registros la usan y cuál
  se queda (KEPT).
- Al fusionar: reapunta los drivers que usaban las copias hacia la que se
  queda (y refresca su copia del nombre), completa en la conservada los
  datos que solo tenían las copias (teléfono, correo) y elimina las copias.
  Nada que referencie a la persona se pierde.
- "Merge" por grupo o "Merge all" con confirmación (no hay deshacer).

## Pasos (en este orden)
1. Publicar V00027.
2. Catalogs > Team > "Merge duplicates" > revisar y "Merge all".
3. Volver a cargar team_nombres_formato.csv (Update by Name + REPLACE):
   los 90 que fallaban ahora casan con una sola persona.
4. Cargar drivers_nombre_formato.csv (Update by Driver name + REPLACE).
5. Si el previo de Drivers marcara "matches 2 existing records", avísame:
   significaría que también hay DRIVERS duplicados y conecto la misma
   herramienta a ese módulo.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00027.
