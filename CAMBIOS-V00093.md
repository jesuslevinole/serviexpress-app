# ServiExpress · V00093 — Export Excel de Drivers sin filtro de fechas

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

En Drivers, el diálogo "Export Excel" ya no muestra "Filter by date of",
"From", "To" ni la nota. Solo pregunta Only ACTIVE / Only INACTIVE / All, y
exporta todos los drivers de esa opción. Los demás módulos conservan su
filtro por fechas.

Verificado: `tsc -b` + `eslint` en limpio; versión V00093.
