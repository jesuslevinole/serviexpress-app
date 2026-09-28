# ServiExpress · V00074 — URGENTE: se retira el barrido automático y se reparan las estaciones

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué pasó (y por qué Ender no ve camiones)
El "barrido semanal" que agregué en V00064 movía a la estación MAINTENANCE
los camiones sin Fleet Report de la semana anterior. Como el módulo acababa
de nacer y esa semana no tenía reportes, interpretó que NINGÚN camión se
había capturado y los movió TODOS. Por eso:
- Todos los camiones aparecen en MAINTENANCE.
- Ender (estación 771) no ve ninguno: ya no hay camiones en la 771.
Fue un error de diseño mío: una acción masiva no debe correr sola.

## 1. El barrido automático se RETIRA
Ya no corre nunca solo. Si más adelante quieres esa regla, la vuelvo a
poner como acción manual con confirmación y vista previa.

## 2. Botón nuevo "Fix stations" (Trucks, solo admin)
Reconstruye la Current station de cada camión a partir de su columna Sch/B
("771 RED" -> estación 771):
- Antes de tocar nada muestra cuántos camiones cambiarían y tres ejemplos.
- Cada cambio queda en el historial del camión con el motivo
  ("Fix stations from Sch/B"), así se puede auditar.
- Los camiones cuyo Sch/B no traiga número quedan como están (revísalos a
  mano).
PASO A SEGUIR: entra a Trucks como admin, presiona "Fix stations", revisa el
número que te muestra y confirma. Con eso vuelven a su estación.

## 3. Camiones y drivers por estación del usuario
Esto se configura en Roles, columna VISIBILITY del rol BC:
- Trucks -> Station
- Drivers -> Station
- Fleet Report -> Station
Con "Station", cada BC ve únicamente los registros cuya estación coincide
con las suyas (Ender: 771). Si la columna está en "All", ve todo aunque los
desplegables sí estén acotados. Revísalo para el rol BC después de reparar
las estaciones.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00074.
