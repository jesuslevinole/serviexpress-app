# ServiExpress · V00023 — Carga de Drivers: solo llena lo vacío y previo honesto

Reemplaza la carpeta `src/` completa y `public/version.json`.
Acompaña: drivers_actualizacion_v3.csv (el archivo a cargar).

## Aclaración de lo que se vio en el previo anterior
Los VALORES estaban mapeados bien (por eso "0 with errors"): lo corrido era
solo la TABLA del previo, que dibujaba los encabezados de las 28 columnas del
módulo pero solo pintaba las celdas de las columnas del archivo, así que cada
valor caía bajo el encabezado equivocado. "BC = SERVIEXPRESS RED" era el valor
de Entity dibujado bajo el encabezado BC; BC y Register date NUNCA venían en
el archivo y no se iban a tocar. Aún así, nada se importó y el alcance cambió
según lo pedido.

## Qué cambia en el código (requiere publicar V00023)
1. El previo ahora dibuja SOLO las columnas que trae el archivo: cada valor
   bajo su encabezado. Se acabaron las "columnas corridas" visuales.
2. El modo "Update existing records by Driver name" ahora SOLO LLENA campos
   que estén VACÍOS en el app. Lo ya capturado (Entity, Station, o cualquier
   otro valor trabajado en el app) NUNCA se reemplaza, venga lo que venga en
   el archivo.

## drivers_actualizacion_v3.csv (330 filas)
Solo las columnas faltantes con datos en el Excel:
  Driver name (para casar) · Badge · Nationality · I9 start date ·
  Employment permit · Category · DL state · DL approbation date
- SIN Entity ni Station (en el app están bien y no se tocan).
- SIN BC ni Register date (nunca vinieron; quedan como están).
- DOT exp. date y Certification exp. date venían vacías en el Excel: fuera.
- Nombres sin coma; ninguna celda con comas/comillas: sobrevive re-guardados.
- Verificado con el parser real del app: 8 columnas, 330 filas, 0 corridas.

## Cómo cargar
1. Publica V00023.
2. Drivers > Import CSV > palomear "Update existing records by Driver name".
3. Elegir drivers_actualizacion_v3.csv TAL CUAL descargado (sin re-guardar).
4. El previo debe mostrar 8 columnas alineadas y ~330 rows ready > Import.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00023.
