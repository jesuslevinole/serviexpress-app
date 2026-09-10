# ServiExpress · V00049 — Corrección urgente de V00048 (pantalla azul en Roles)

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué estaba roto
Al agregar el módulo Company en V00048, la ruta quedó insertada POR DENTRO
de la ruta de Roles, rompiendo el árbol de navegación del app. Efectos:
- Entrar a /roles (y otras pantallas bajo esa rama) mostraba una pantalla
  azul en blanco con un error en consola.
- El botón "Company" del menú no llevaba a ningún lado, porque su ruta no
  existía como tal.

## Qué se corrigió
La ruta de Company quedó donde corresponde, al mismo nivel que las demás.
Roles vuelve a abrir normal y Company abre desde el menú.

Todo lo demás de V00048 sigue igual: logo sin fondo, nombre y lema
configurables (aplicados al instante en el menú y el login), inputs con el
estilo del app, y tarjetas del panel clicables.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00049.
