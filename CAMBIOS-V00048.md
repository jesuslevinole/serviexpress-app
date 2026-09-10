# ServiExpress · V00048 — Identidad de la empresa + panel clicable

Reemplaza la carpeta `src/` completa y `public/version.json`.
Archivos nuevos para git: src/services/companyProfile.ts,
src/hooks/useCompanyProfile.ts, src/pages/CompanyPage.tsx (+.css).
(Base: el código que enviaste en el 7z, con tu index.css conservado.)

## 1. El logo, tal cual
Se quitó el FONDO BLANCO con marco que el app le ponía al logo en el menú
lateral y en el login: ahora la imagen se muestra TAL CUAL, sin fondo, sin
borde y sin sombra, con los mismos tamaños de siempre (38 px menú, 150 px
login). Nota: el logo por defecto incluido es un trazado negro — sobre el
fondo oscuro casi no se ve SIN el fondo blanco; sube el logo correcto (punto
3) y listo. Un PNG con fondo transparente es lo ideal.

## 2. Tarjetas del panel clicables
Las tarjetas del Dashboard (BC Reports, Trucks, Drivers, Assets, Fleet,
Shop, Rentals, Requirements) ahora abren su módulo con un clic (o Enter con
teclado), con efecto de elevación al pasar el mouse.

## 3. Módulo "Company" (Administración, solo admin)
Nuevo apartado en el menú: Administración -> Company.
- LOGO: botón "Upload logo" — sube la imagen a Storage (carpeta company/) y
  al guardar aparece de inmediato en el LOGIN y en el MENÚ LATERAL, con el
  mismo tamaño de siempre. Vista previa en ambos tamaños antes de guardar.
- NOMBRE de la empresa y LEMA (la línea de abajo): reemplazan a
  "ServiExpress / Fleet control" en el menú y en el login.
- Orden de prioridad del logo: el subido en Company; si no hay, el archivo
  public/logo.png del despliegue; y por último el incluido en el código.

Requiere Storage habilitado (ya lo está desde el tema de adjuntos).

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00048.
