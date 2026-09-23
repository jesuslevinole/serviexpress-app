# ServiExpress · V00061 — Roles: error visual, "View as" configurable y más control

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. El error visual de la matriz (corregido de raíz)
La cabecera y la primera columna usaban un color (`--surface-2`) que NO
existe en el proyecto: al quedar con fondo TRANSPARENTE, las casillas que
pasaban por debajo al desplazar se veían encima de los nombres de los
módulos. Ahora usan el color real y la columna fija es opaca. La corrección
aplica a toda la app (esa variable fantasma se usaba en 14 lugares: menús,
tarjetas y tablas), así que otros textos encimados también desaparecen.

## 2. "View as" se activa y desactiva desde Roles
Columna nueva "View as (see the app as another user)". El ojo de la barra
superior aparece solo para el administrador o para los roles que la tengan
concedida (basta marcarla en el módulo Users).

## 3. Más cosas bajo control de Roles
Columnas nuevas, además de la de verificación de la versión anterior:
- "Alerts (red thresholds)": quién configura los números en rojo del módulo.
- "Email on save (recipients)": quién elige los destinatarios del aviso.
- "Customize menu & tables (Edit mode)": quién usa el botón Edit de la barra
  para renombrar y reordenar menús y tablas.
Con esto, todos los botones que antes eran "solo admin" son configurables:
verificar, alertas, avisos por correo, View as, modo Edit, layout de tablas,
ventana de captura, captura fuera de ventana, borrado masivo, alta rápida,
campos protegidos, capturista, entidad/estación, campos de dinero y notas.

## 4. "View as" ahora es una vista TOTAL
Mientras simulas a alguien, TODO se evalúa con el rol de esa persona: si esa
persona no tiene el botón Edit, ni "Alerts", ni "Email on save", ni el check
de verificación, tú tampoco los ves. Es exactamente lo que vería si entrara
con su correo y su contraseña. Para volver a tu vista, "Exit" en la banda
superior.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00061.
