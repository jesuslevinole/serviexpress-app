# ServiExpress · V00073 — Los accesos extra también aplican en "View as"

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué pasaba
Le concediste Fleet Report a Ender Villalobos y, al simularlo con "View as",
el módulo no aparecía. El motivo: al simular a alguien, su perfil se armaba
a mano con nombre, rol, entidades y estaciones, pero SIN los accesos extra
que se guardan en su ficha. Resultado: la simulación mostraba menos de lo que
esa persona ve al entrar con su correo.

## Qué cambia
El perfil simulado ahora incluye los accesos extra de la persona, así que
"View as" vuelve a ser fiel: si Ender tiene Fleet Report concedido, lo ves
al simularlo, igual que lo ve él.

## Cómo comprobarlo
1. Publica esta versión.
2. Users -> botón "Extra access" de Ender: confirma que "Fleet Report ·
   View" está marcado (y Create/Edit si va a capturar).
3. "View as" -> Ender: el módulo Fleet Report debe aparecer en su menú.
Nota: si la persona ya tenía la sesión abierta, lo verá al recargar.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00073.
