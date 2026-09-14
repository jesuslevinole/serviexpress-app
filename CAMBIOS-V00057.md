# ServiExpress · V00057 — Fuera el monitor de lecturas

Reemplaza la carpeta `src/` completa y `public/version.json`.

- La burbuja "Reads" se eliminó de TODOS los módulos: ya no aparece para
  nadie, ni siquiera para el administrador. Dejaba de ser útil y estorbaba
  sobre los controles de paginación.
- También se quitó la columna "Reads monitor" de la matriz de Roles (ya no
  hay nada que activar). Los roles guardados no se ven afectados.
- El conteo interno de lecturas sigue existiendo por debajo para
  diagnóstico, pero sin ninguna presencia en pantalla. Si algún día hace
  falta volver a medir el consumo, se reactiva en una versión puntual.

Archivos eliminados (al pegar el src nuevo desaparecen solos; `git add -A`
registra el borrado): src/components/ui/ReadsMonitor.tsx y .css

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00057.
