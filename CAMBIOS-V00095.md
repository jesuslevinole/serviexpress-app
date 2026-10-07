# ServiExpress · V00095 — Excel de Fleet Report con millaje y llantas

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## Causa
En Customize / Table layout del Fleet Report están ocultos Actual Mileage y
las llantas (por eso tampoco salen en el detalle). El Excel exportaba solo las
columnas visibles, así que esas lecturas no bajaban.

## Cambio
El Excel del Fleet Report trae SIEMPRE, aunque estén ocultos en la tabla:
Actual Mileage · Difference mileage · Front L/Driver · Front R/Pass ·
Back L/Driver Out · Back L/Driver In · Back R/Pass Out · Back R/Pass In.
Cada columna va en su lugar (junto a las demás lecturas) y con las reglas de
rojo de Alerts. La tabla y el detalle no cambian: si los quieres ver ahí,
enciéndelos con "Show" en Customize.

Verificado: `tsc -b` + `eslint` en limpio; versión V00095.
