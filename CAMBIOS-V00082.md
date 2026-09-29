# ServiExpress · V00082 — Aviso de Trucks ligado a Fleet Report + desplegable sin repetidos

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Causa encontrada (explica el punto 3 y los 3 registros en Historic)
Los registros de esta semana (09/24 y 09/28) se capturaron cuando el horario
era el de 13 días, y quedaron SELLADOS con esa semana vieja. El app decidía
"¿es de esta semana?" solo por el sello, así que:
- aparecían en Historic en vez de In progress, y
- sus camiones NO se quitaban del desplegable.
Ahora un registro es de la semana vigente si se CAPTURÓ dentro de su rango
(hora de Texas) o trae su mismo sello. Esos 3 vuelven a In progress solos.

## 1. Aviso de Trucks → Fleet Report (ya no Fleet)
"Of 277 registered trucks, X are already in this week's Fleet Report
(09/23/2026 → 09/29/2026) (Y added by you) and Z are not · W not required
(in shop / corrective)." Usa el mismo cálculo que el aviso de Fleet Report, así
los números coinciden. "See which ones" separa faltantes y no exigidos.
El BC lo ve sobre su Current station. (El aviso dentro del módulo Fleet sigue
midiendo Fleet.)

## 2. Se actualiza con el horario asignado
El aviso escucha en vivo el horario de Fleet Report: al cerrar la semana, al
abrir la siguiente o si el admin cambia el horario, se recalcula solo (sin
recargar).

## 3. Desplegable de camiones sin los ya agregados esta semana
Además de la regla corregida, los camiones "tomados" ahora salen de TODOS los
Fleet Reports de la semana (todas las estaciones, leídos del servidor solo por
el rango de la semana), no solo de los que el usuario tiene en pantalla. Un
camión agregado desde otra estación también desaparece del desplegable.

Verificado: `tsc -b` + `eslint` en limpio; versión V00082.
