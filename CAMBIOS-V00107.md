# ServiExpress · V00107 — El Excel de Requirements con la prenda, la talla y todo lo demás

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## Qué faltaba

El Excel traía solo el encabezado de la solicitud (fecha, tipo, para quién,
driver, estatus, capturista). Lo que de verdad se pidió —la prenda y la
talla— vive en los renglones de la solicitud, y esos nunca salían.

## Cómo queda ahora: dos hojas

**Hoja 1 · Requirements** — una fila por solicitud, como hasta ahora, pero con
dos columnas nuevas al final:

- **Uniforms requested**: lo pedido en una línea, legible —
  `Polo shirt (M) ×2 · Pants (32) ×1`
- **Lines**: cuántos renglones tiene la solicitud.

Además trae TODO lo capturado en el encabezado, aunque esté oculto en la
tabla (p. ej. Email), y la fecha y hora exactas de captura.

**Hoja 2 · Uniform lines** — una fila por prenda pedida, para filtrar y
sumar por talla:

Date · Request type · Who is this for? · Driver · Email · Status ·
Captured by · **Delivery date · Uniform · Size · Quantity · Receiving date ·
Status del renglón**

Cada renglón lleva delante las columnas de su solicitud, así la hoja se lee
sola sin tener que cruzarla con la primera.

## Por qué dos hojas y no una

Si se exportara solo el detalle, las solicitudes que **no tienen renglones**
(ADP, Swap scanner, Dolly, Batteries: 44 de las 185 de hoy) desaparecerían
del archivo. Con dos hojas no se pierde ninguna y el detalle queda completo.

Esto funciona para cualquier módulo con subtabla: se configura por módulo, y
hoy está encendido en Requirements. El filtro por fechas y la selección de
columnas del diálogo siguen aplicando a las dos hojas.

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK; versión V00107.
