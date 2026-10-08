# ServiExpress · V00096 — Excel de Fleet Report completo (Scanner incluido)

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## Causa
Misma raíz que el millaje: en Customize / Table layout del Fleet Report hay
campos ocultos (Scanner, y también Driver, Route, Type, Gas Card, Stops). El
Excel solo traía lo visible, y como el Scanner estaba oculto el app ni siquiera
cargaba el catálogo de escáneres, así que su nombre no se podía escribir.

## Cambio
- El Excel del Fleet Report trae SIEMPRE todos sus datos, en el orden del
  formulario: Date, BC, Type, Truck, Entity, Station, Route, Driver, Scanner,
  Gas Card, S Number, V Truck, Stops, Actual Mileage, Next mant, Difference
  mileage, las 6 llantas, corrective y Week — aunque estén ocultos en la tabla.
- El catálogo de escáneres (y cualquier otro de esas columnas) se carga
  aunque la columna esté oculta, así el Excel muestra el nombre del Scanner.
- Se respetan los permisos: un campo "solo admin" o protegido por permiso no
  sale en el Excel de quien no puede verlo.
- Si un registro es "ONLY TRUCK", su Scanner sale vacío (no lleva escáner).

La tabla y el detalle no cambian; para verlos ahí, enciéndelos con "Show" en
Customize.

Verificado: `tsc -b` + `eslint` en limpio; versión V00096.
