# ServiExpress · V00026 — Nombres de drivers en formato "APELLIDOS, Nombres"

Reemplaza la carpeta `src/` completa y `public/version.json`.
Acompañan: team_nombres_formato.csv y drivers_nombre_formato.csv.

## Contexto
El nombre vive en el catálogo Team (un solo campo). La carga original los dejó
como "Nombres Apellidos"; el corte exacto apellidos/nombres está en el Excel
maestro, así que de ahí se generaron los archivos de corrección.

## Código
- Import CSV, modo casado: nueva sub-casilla "Also REPLACE values that already
  exist" (por omisión apagada). Con ella, las columnas del archivo REEMPLAZAN
  el valor actual (para renombrar en lote); las celdas vacías siguen sin
  borrar nada y jamás se crea un registro. Sin ella, todo sigue igual (solo
  llena vacíos).
- El catálogo Team ahora también tiene el modo "Update existing records by
  Name" en su Import CSV.

## Archivos (ambos verificados con el parser real: 330 filas, 0 corridas)
- team_nombres_formato.csv    -> renombra las personas del catálogo Team.
- drivers_nombre_formato.csv  -> refresca la copia del nombre en Drivers.
Van separados por PUNTO Y COMA para que las comas del formato nuevo no puedan
romper columnas ni aunque se re-guarden en Excel. La columna "Original from
Excel" es solo de referencia (el importador la ignora).

## Cómo cargar (en este orden)
1. Publicar V00026.
2. Catalogs > Team > Import CSV > palomear "Update existing records by Name"
   Y "Also REPLACE values" > team_nombres_formato.csv > Import.
   Los nombres del catálogo quedan "APELLIDOS, Nombres" y, como Drivers los
   resuelve en vivo desde Team, la columna Driver name cambia sola.
3. Drivers > Import CSV > palomear las mismas DOS casillas >
   drivers_nombre_formato.csv > Import. Esto refresca la copia interna del
   nombre ("Name (from Team)") para que ninguna pantalla muestre el formato
   viejo.

Personas creadas a mano en el app que no vienen en el Excel (Lin Zhao,
Kristopher Wright, etc.) no se tocan: se corrigen editándolas en
Catalogs > Team con el mismo formato. A partir de ahora, la convención de
captura es "APELLIDOS, Nombres".

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00026.
