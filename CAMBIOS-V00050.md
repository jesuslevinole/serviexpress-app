# ServiExpress · V00050 — Cerrar sesión siempre lleva al login

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué estaba pasando
Al cerrar sesión estando en Company, la pantalla mostraba "No access — Only
administrators can edit the company identity" en vez de ir al login. Dos
causas, ambas corregidas:
1. La página Company traía su propio control de acceso que se evaluaba SIN
   mirar antes si había sesión: al desaparecer el usuario, se leía como
   "no eres admin" en vez de "no hay sesión".
2. Esa ruta quedó fuera del guardián general del app, que es quien manda al
   login.

## Qué cambia
- El guardián de rutas ahora evalúa SIEMPRE la sesión primero: sin sesión,
  cualquier pantalla del app redirige al login. Aplica a Company y a
  cualquier módulo que se agregue en el futuro.
- Company pasó a estar protegida por ese mismo guardián (solo admin), sin
  control propio duplicado.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00050.
