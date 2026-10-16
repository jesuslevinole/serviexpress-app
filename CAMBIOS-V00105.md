# ServiExpress · V00105 — Estaciones: fusionar las repetidas y no dejar crear dos con el mismo nombre

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## 1. Botón "Merge duplicates" en Stations

En **Catalogs → Stations** aparece el botón **Merge duplicates**, el mismo que
ya existía en Team. Agrupa las estaciones que se llaman igual (ignora
mayúsculas, acentos y espacios de sobra: "770" y "770 " son la misma), y por
cada grupo muestra cuántos registros usa cada copia.

Al fusionar: se conserva la copia **más usada** (la más antigua si empatan),
se reapunta hacia ella **todo lo que usaba las otras**, se completan en ella
los datos que solo tenían las copias, y las copias se borran.

**Qué se reapunta** (se calcula recorriendo los módulos, así que un módulo
nuevo con campo de estación entra solo):

| Dónde | Campo |
|---|---|
| Trucks | Station (registro) y **Current station** |
| Drivers · Assets | Station |
| Fleet · **Fleet Report** | Station |
| **BC Report** y sus renglones | Station |
| Maintenance · Shop · Accidents | Station |
| Rentals · Requirements | Station |
| **Usuarios** | las estaciones asignadas a cada uno |

Las estaciones asignadas a los usuarios son una lista, no un campo suelto: el
id viejo se sustituye dentro de la lista y, si alguien tenía las dos
estaciones, le queda una sola. Sin esto, un BC se habría quedado apuntando a
una estación borrada y dejaría de ver sus camiones.

El botón lo ve el admin y quien tenga permiso de **borrar** en Catalogs.

## 2. No se pueden crear dos estaciones con el mismo nombre

Al guardar una estación nueva con un nombre que ya existe, no se duplica: se
avisa y se ofrece **abrir la que ya está** para editarla. La comparación
ignora mayúsculas y espacios ("Office" = "OFFICE" = " office ").

Lo mismo al **renombrar** una estación existente: si el nombre nuevo choca
con otra, no deja guardar. Antes esto solo se revisaba al crear.

En la lista, las estaciones repetidas que ya existan quedan marcadas hasta
que las fusiones.

## Orden sugerido

1. Publica y entra a Catalogs → Stations.
2. **Merge duplicates** → revisa cada grupo (verás cuál se conserva y cuántos
   registros usa cada copia) → **Merge all**.
3. Comprueba en Trucks que la columna Current station sigue correcta y en
   Users que los BC conservan su estación.

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK; versión V00105.
