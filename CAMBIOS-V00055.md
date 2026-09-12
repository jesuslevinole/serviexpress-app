# ServiExpress · V00055 — Camiones bloqueados por reportes borrados + razones claras al guardar

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. El caso 474444 · XJY1141 (por qué seguía bloqueado)
Al borrar un BC Report completo, sus RENGLONES no se borraban: quedaban
huérfanos en la base y seguían diciendo "este camión ya se capturó esta
semana", aunque el reporte ya no existiera. Dos correcciones:
- BORRADO EN CASCADA: al borrar un BC Report (o cualquier registro con
  renglones), ahora se borran también sus líneas y sus copias en
  Maintenance. Ya no quedan huérfanos.
- LOS HUÉRFANOS EXISTENTES DEJAN DE BLOQUEAR: si el reporte que "tenía" un
  camión ya no existe, el camión vuelve a estar disponible de inmediato, sin
  tocar la base a mano. Al publicar, 474444 debe reaparecer en la lista.

## 2. Por qué un BC no puede guardar: razones claras
Hasta ahora, si Firestore rechazaba el guardado, se mostraba el mensaje
técnico en inglés. Ahora el BC lee la causa y qué hacer:
- Permisos: "Firestore rechazó el guardado por permisos. Avisa al
  administrador: hay que revisar las reglas de la base de datos."
- Cuota diaria: "La base de datos llegó a su límite diario. El reporte NO se
  guardó; inténtalo más tarde o avisa al administrador."
- Sin internet: "Sin conexión con la base de datos. Revisa tu internet y
  vuelve a presionar Guardar (no cierres esta ventana)."
- Enlace roto: "Un registro enlazado ya no existe (pudo borrarse mientras
  capturabas). Cierra y vuelve a abrir el formulario."
Todos empiezan con "No se pudo guardar:" y el error técnico queda en la
consola del navegador para diagnóstico.

## Recordatorio de las reglas que ya existían (no son fallas)
Un BC no puede guardar cuando: el reporte está VACÍO (hay que usar "Add
lines"), ya cargó SU reporte de la semana, está fuera de la ventana, o el
camión que intenta cargar ya lo capturó otro / está en taller. En todos esos
casos el mensaje explica cuál es y con quién verificar.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00055.
