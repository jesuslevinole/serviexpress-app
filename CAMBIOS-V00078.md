# ServiExpress · V00078 — Drivers y Scanners abiertos para todos; Trucks solo por estación

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué cambia (aplica a lo que se marque en la columna Visibility de Roles)

**Drivers y Assets (escáneres): TODOS ven TODO.**
- La lista de ambos módulos ignora la Visibility del rol (Own, Station o
  Entity + Station): no se filtra por estación, entidad ni usuario.
- Los desplegables de Driver y de Scanner en cualquier formulario (Fleet,
  Fleet Report, BC Reports, Maintenance, Shop, Accidents, detalle…) ya no se
  acotan por la estación del rol. Antes, si el rol tenía Station en el módulo
  donde se captura, el desplegable de conductores/escáneres se recortaba a esa
  estación — esa era la fuga que quedaba.
- Única exclusión que se mantiene: los INACTIVOS no se ofrecen en los
  desplegables (siguen visibles, atenuados, en su módulo).

**Trucks: la única restricción es la estación.**
- Si el rol marca cualquier restricción en Trucks (Own, Station o Entity +
  Station), el filtro es SOLO la Current station del camión = estación del
  usuario. Ya no influyen la entidad ni quién lo capturó.
- Con Visibility = All, se ven todos (como siempre).
- Los desplegables de camión siguen mostrando solo los de la estación del
  usuario (sin cambios).

## Archivos tocados
- `src/config/modules.ts` — Assets con `alwaysVisible`; Trucks con `stationOnlyScope`.
- `src/types/models.ts` — nueva marca `stationOnlyScope` en ModuleConfig.
- `src/hooks/useScope.ts` — Trucks reduce cualquier restricción a "misma estación".
- `src/components/crud/CrudForm.tsx` — los desplegables de catálogos abiertos
  (Drivers, Assets) no se recortan por la estación del rol.

Verificado: `tsc -b` y `eslint` en limpio; versión V00078.
