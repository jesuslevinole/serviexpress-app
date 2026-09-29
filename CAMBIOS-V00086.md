# ServiExpress · V00086 — Reglas de carga del BC, columna BC en su lugar, precarga solo de Fleet Report

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Qué puede cargar un BC (reglas finales)
Puede cargar CUALQUIER camión, incluidos los de Shop y correctivo, salvo:
- que pertenezca a OTRA estación (Current station distinta a la suya), o
- que otro BC (o cualquiera) ya lo haya cargado esta semana.
Se valida al guardar además de en el desplegable. En "My trucks" los de
correctivo/Shop dicen "… — you can still add it", y cada camión pendiente,
de Shop o de correctivo trae un botón "Add" que abre el Fleet Report con ese
camión ya elegido.
Si en tu pantalla todavía no se deja: confirma que el pie del menú diga V00086
(una pestaña vieja puede seguir con el código anterior hasta recargar).

## 2. Columna BC: siempre visible y junto a la fecha
Además de no poder ocultarse (V00085), ahora conserva su lugar del código:
justo después de DATE. Antes, un orden viejo guardado en el layout la mandaba
al final de la tabla (fuera de la vista, a la derecha), por eso "desaparecía".

## 3. Precarga SOLO desde Fleet Report
Al elegir el camión se precarga lo de su ÚLTIMO Fleet Report. Ya no se toma
nada de Fleet ni de BC Report: si el camión aún no tiene Fleet Report, el
formulario queda en blanco.

Verificado: `tsc -b` + `eslint` en limpio; versión V00086.
