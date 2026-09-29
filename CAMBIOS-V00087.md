# ServiExpress · V00087 — Los camiones se quedan en su estación + borrar libera el camión

Reemplaza la carpeta `src/` completa y `public/version.json`.
IMPORTANTE: incluye `src/firebase/config.ts` — ver "Error de build" abajo.

## 0. Error de build en Cloudflare ("Cannot find module '../firebase/config'")
El código está bien: lo que falta es el ARCHIVO `src/firebase/config.ts` en el
repositorio de GitHub (en el último commit se perdió al reemplazar `src/`).
Arreglo: copia la carpeta `src/` de este zip (trae `src/firebase/config.ts`) y
haz commit asegurándote de que ese archivo entre:
    git add src/firebase/config.ts
    git status        # debe aparecer como nuevo o modificado
    git commit -m "Restaurar firebase/config"
    git push
Si `git add` no lo toma, revisa si algún .gitignore lo excluye:
    git check-ignore -v src/firebase/config.ts
El archivo no tiene claves (lee las variables VITE_FIREBASE_* del entorno de
Cloudflare), así que es seguro subirlo.

## 1. Sin barrido a Maintenance: cada camión se queda en su estación
El barrido automático (V00064) se retiró del código en V00074 y no existe en
esta versión. Como seguro extra, ahora el app deja "desactivado" ese barrido
para las semanas pasadas y las próximas: si en algún equipo quedó abierta una
pestaña con una versión vieja (V00064–V00073), ya no puede mover camiones.
Se escribe solo la primera vez que el admin abre Fleet Report.
Recomendado: cerrar todas las pestañas viejas del app y recargar.
Los camiones solo cambian de estación cuando alguien la edita en Trucks o
usa "Fix stations" (con confirmación).

## 2. Si borran el registro, el camión se puede volver a seleccionar
Antes, la regla de "ya cargado esta semana" miraba primero la lista guardada
en el navegador, que podía traer un registro ya borrado (sobre todo si lo
borró otra persona). Ahora:
- Al guardar manda el SERVIDOR: un registro borrado ya no cuenta. La lista
  local solo se usa si no hay conexión.
- El desplegable usa los registros de la semana en vivo: al borrar uno, su
  camión (y su driver) vuelve a aparecer al instante para todos.

Verificado: `tsc -b` + `eslint` en limpio; versión V00087.
