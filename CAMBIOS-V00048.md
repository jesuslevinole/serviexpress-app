# ServiExpress · V00048 — Identidad de la empresa, logo real y panel clicable

Reemplaza la carpeta `src/` completa y `public/version.json`.
Archivos nuevos para git (git add -A):
  src/services/companyProfile.ts · src/hooks/useCompanyProfile.ts
  src/pages/CompanyPage.tsx (+ .css)
Base: el código que enviaste en el 7z (V00047), con tu index.css intacto.

## Las 3 irregularidades que reportaste
1. CAMPOS DE TEXTO: los inputs de Company no usaban la clase del app
   (salían blancos, sin estilo). Ahora usan `field-input`, igual que todos
   los formularios del sistema, y se ven idénticos al resto.
2. NOMBRE QUE NO CAMBIABA: el menú lateral y el login tenían el texto
   "ServiExpress / Fleet control" ESCRITO A MANO en el código; por eso
   guardar en Company no los movía. Ahora ambos leen el nombre y el lema
   configurados, y cambian EN EL MOMENTO de guardar (suscripción compartida
   en vivo, sin recargar).
3. LOGO QUE NO CAMBIABA: por lo mismo — el logo se buscaba solo en archivos
   fijos. Ahora el logo subido en Company tiene PRIORIDAD sobre todo lo
   demás (luego public/logo.png y por último el incluido en el código), y al
   cambiarlo se recarga solo.
   ADEMÁS: se le quitó el FONDO BLANCO con marco que el app le ponía en el
   menú y en el login — la imagen se muestra tal cual, con los tamaños de
   siempre (38 px menú, 150 px login).

## Extra en Company
- Vista previa REAL en los dos tamaños (38 px y 150 px) antes de guardar.
- Aviso en amarillo: "el logo ya subió — presiona Save para usarlo", para
  que no quede a medias (el archivo sube al elegirlo; se aplica al guardar).
- Lo que escribes ya no se pisa mientras editas.

## Tarjetas del panel
Las 8 tarjetas del Dashboard abren su módulo con un clic (o Enter), con
efecto de elevación al pasar el mouse.

## Recomendación para el logo
Sube un PNG con FONDO TRANSPARENTE. Tu logo actual tiene fondo blanco
incorporado en la imagen, así que sobre el tema oscuro se verá como un
recuadro blanco: eso ya no lo pone el app, viene en el archivo.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00048.
