# ServiExpress · V00088 — Entidad y estación del Fleet Report bloqueadas (salen del camión)

Reemplaza la carpeta `src/` completa y `public/version.json`.
Incluye todo lo de V00087 (seguro contra el barrido a Maintenance, borrar
libera el camión) y trae `src/firebase/config.ts`: asegúrate de que entre al
commit (`git add src/firebase/config.ts`), si no el build de Cloudflare falla
con "Cannot find module '../firebase/config'".

## Entidad y estación no editables
En el Fleet Report, Entity y Station se ven bloqueados (como Date y BC) y se
llenan solos con la Current entity / Current station del camión elegido.
Al guardar (alta y edición) el sistema los vuelve a tomar del camión, aunque
alguien intente cambiarlos. Si en una edición cambian el camión, la entidad y
la estación se actualizan con las del nuevo camión.

Verificado: `tsc -b` + `eslint` en limpio; versión V00088.
