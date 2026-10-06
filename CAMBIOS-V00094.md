# ServiExpress · V00094 — Requirements: tallas siempre con datos, botón "Add", uniformes siempre a la vista

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## 1. La lista de tallas nunca sale vacía
Antes la talla tenía que cumplir dos cosas a la vez: ser del tipo de talla de
la prenda Y tener existencia. Con prendas como "Winter Sweater", cuyo tipo no
coincidía con lo que hay en el almacén, salía "No results". Ahora:
1. primero las tallas con existencia de esa prenda;
2. si no hay, las del tipo de talla de la prenda;
3. y si tampoco, todas las tallas.

## 2. Botón "Add"
En Requirements el botón dice "Add" (y "Add another" después del primero), y la
ayuda habla de "uniform", no de "truck". BC Reports sigue con "Add truck".

## 3. "Requested uniforms" siempre visible
La barra de abajo (lista de uniformes y botón Add) queda fija al fondo del
formulario: se ve sin hacer scroll aunque el formulario sea largo. Lo mismo
aplica a la barra de camiones de BC Reports.

Verificado: `tsc -b` + `eslint` en limpio; versión V00094.
