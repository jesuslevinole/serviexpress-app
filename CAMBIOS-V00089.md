# ServiExpress · V00089 — Precarga del Fleet Report: solo 5 campos de la semana pasada

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## Vienen de la semana pasada (último Fleet Report del camión)
Driver · Route · Scanner · Gas Card # · Stops

## Arrancan SIEMPRE vacíos (se capturan de nuevo)
Actual Mileage · Front L/Driver · Front R/Pass · Back L/Driver Out ·
Back L/Driver In · Back R/Pass Out · Back R/Pass In ·
Add corrective maintenance? (sin marcar)

Antes también se copiaban Type, S Number y V Truck; ya no (Type queda con su
valor por omisión TRUCK + SCANNER). Los campos numéricos tampoco muestran las
sugerencias del navegador con valores de otras capturas.

Si el camión no tiene Fleet Report anterior, los cinco quedan en blanco.

Verificado: `tsc -b` + `eslint` en limpio; versión V00089.
