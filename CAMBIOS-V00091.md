# ServiExpress · V00091 — Alerts claras: máximo que acepta el campo + valor en que se pone rojo (bajando o subiendo)

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## Cómo se configura (Alerts) — por cada campo numérico
1. Maximum value: lo más alto que acepta el campo. Si alguien teclea más,
   el registro NO se guarda ("Front L/Driver does not accept more than 6").
   En el formulario, debajo del campo, se ve "Max 6"; si se pasa, la casilla
   queda marcada con "Maximum allowed: 6".
2. Turns red at + Going:
   - Down (that number or less): p. ej. llantas. Máximo 6, rojo en 1 →
     acepta 0 a 6 y se pinta rojo en 1 o 0.
   - Up (that number or more): escala que sube. Rojo en 5 → se pinta rojo
     en 5, 6, 7…
Debajo de cada campo se lee la regla en una frase, en vivo:
"It does not accept more than 6. It turns red when it goes down to 1 or less."
Vacío = sin límite / sin alerta. No deja guardar un valor de rojo mayor que el
máximo.

## Dónde aplica
Tablas, detalle, Excel (con la regla escrita arriba de cada columna:
"Accepts up to 6 · Red at 1 or lower") y el tooltip al pasar el mouse por un
número en rojo. Un dato viejo por encima del máximo también se ve en rojo.

## Lo ya configurado
Se conserva: lo que estaba como mínimo queda como "Turns red at … Down", y lo
que estaba como máximo queda como "Maximum value".

Verificado: `tsc -b` + `eslint` en limpio; versión V00091.
