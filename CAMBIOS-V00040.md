# ServiExpress · V00040 — El monitor de lecturas, oculto y por rol

Reemplaza la carpeta `src/` completa y `public/version.json`.

- La burbuja "Reads" queda OCULTA de fábrica para todos (admin incluido).
- Se controla desde Administración -> Roles: columna nueva "Reads monitor"
  en la matriz de permisos. Basta encenderla en CUALQUIER módulo del rol
  para que ese rol vea la burbuja; apagada en todos, no aparece.
- En "View as" manda el rol simulado (si el BC no la tiene, no la ves tú
  tampoco mientras lo simulas — la simulación sigue siendo fiel).
- Para volver a usarla tú: Roles -> tu rol (Administrador) -> enciende
  "Reads monitor" en cualquier fila (Dashboard, por ejemplo) -> Save.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00040.
