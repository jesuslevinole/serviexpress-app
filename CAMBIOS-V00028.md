# ServiExpress · V00028 — Editar el nombre de Team desde el formulario del driver

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué hay de nuevo
Junto al selector "Driver name" (y a cualquier referencia a un CATÁLOGO:
Entity, Station, Category…) aparece ahora un LÁPIZ cuando hay un registro
seleccionado. Al pulsarlo se abre la edición de ese registro ahí mismo:
- En Drivers: corrige el nombre de la persona de Team (formato
  "APELLIDOS, Nombres"), su teléfono o su correo sin salir del formulario.
- Al guardar, el nombre nuevo se refleja solo en el selector, en la tabla y
  en todos los módulos (el nombre se resuelve en vivo desde Team).
- El "+" de alta rápida sigue igual, al lado.

## Permisos
- Admin: siempre puede.
- Los demás roles: necesitan el permiso "Edit" del renglón Catalogs en la
  matriz de Roles (el mismo que les permite editar catálogos).
- El lápiz solo aparece en referencias a catálogos; los registros de módulos
  grandes (camiones, drivers) se editan en su propio módulo.

## Archivos nuevos que deben quedar en git
- src/components/ui/QuickEditRefModal.tsx
(recuerda el `git add -A` para que no pase lo del CSS).

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00028.
