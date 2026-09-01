# ServiExpress · V00035 — Clic en cualquier camión abre su detalle

Reemplaza la carpeta `src/` completa y `public/version.json`.
Archivo nuevo para git: src/components/crud/RecordPeekModal.tsx.

En todas las listas informativas donde aparece un camión, su número ahora es
CLICABLE (subrayado punteado) y abre el visor de detalle del camión —
solo lectura, con todas sus referencias resueltas — sin salir de la pantalla:

1. Fleet / Trucks: la lista de "See which ones" del aviso de cobertura
   (los 35 que faltan por dar de alta).
2. BC Reports, aviso de la ventana: la lista de faltantes (vista BC y vista
   admin por estación), la de "Not available", la de "added but not counted"
   y la de "already added".
3. La lista de bloqueados dentro del formulario ("87 trucks can't be
   added"), junto con su buscador.
4. "My trucks": tanto la alerta de camiones movidos como la lista completa
   de la estación.

El visor es el mismo de siempre (el de clic en fila de tabla) y funciona
igual para el BC y para el admin.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00035.
