# ServiExpress · V00097 — Excel de Fleet Report: TODO lo que se carga

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

El Excel del Fleet Report trae todo lo que se captura, sin importar lo que
esté oculto en la tabla (Customize). Quien lo descarga quita lo que no
necesite en el propio Excel.

Columnas, en el orden del formulario:
Date · BC · Type · Truck · Entity · Station · Route · Driver · Scanner ·
Gas Card # · S Number · V Truck · Stops · Actual Mileage · Next mant (from
truck) · Difference mileage · Front L/Driver · Front R/Pass ·
Back L/Driver Out · Back L/Driver In · Back R/Pass Out · Back R/Pass In ·
Add corrective maintenance? · Specify the problem · Week (schedule)
+ cualquier campo personalizado que se agregue desde Customize (aunque esté
oculto) + "Captured at (Texas time)" con fecha y hora exactas de captura.

Se mantienen las reglas de rojo de Alerts y el filtro por fechas del diálogo.
Un campo marcado "solo admin" en el layout no sale en el Excel de quien no
es admin.

Verificado: `tsc -b` + `eslint` en limpio; versión V00097.
