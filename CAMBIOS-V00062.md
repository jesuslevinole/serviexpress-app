# ServiExpress · V00062 — Vuelve el botón "View as" (y el modo Edit)

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué pasó
En V00061 el ojo de "View as" y el botón Edit pasaron a depender de los
permisos NUEVOS ("View as", "Customize menu & tables"), que ningún rol tiene
marcado todavía. Como tu sesión entra con el rol DEVELOPER (que no cuenta
como administrador), los dos botones desaparecieron. Error mío.

## Qué cambia
Los dos botones aparecen ahora si se cumple CUALQUIERA de estas:
- Ser administrador.
- Tener el permiso propio ("View as" / "Customize menu & tables").
- RESPALDO: poder EDITAR usuarios (para View as) o poder personalizar
  (para el modo Edit). Quien administra usuarios puede simularlos, así que
  el botón funciona sin configurar nada.

Para restringirlo: en Roles, apaga "Edit" en el módulo Users a ese rol, o
maneja la columna "View as".

Durante "View as" todo se sigue evaluando con el rol simulado: la vista es
total, tal como quedó en V00061.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00062.
