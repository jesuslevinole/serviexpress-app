# ServiExpress · V00022 — Nota sobre la carga de Drivers

El problema del previo NO fue del importador: el archivo que se seleccionó ya
no era el CSV original (al abrirlo/guardarlo en Excel u Hojas de cálculo se
perdieron las comillas del nombre y la coma de "APELLIDO, Nombre" se volvió
separador: todas las columnas se corrieron un lugar; por eso "I9 start date:
USA" y "DL approbation date: TX").

Solución: usar drivers_actualizacion_v2.csv, que trae los nombres SIN coma
("ADAMS Rayjohnal"). El casador ignora puntuación y orden, así que casa igual
con "ADAMS, Rayjohnal" guardado en el app, y el archivo sobrevive cualquier
re-guardado en Excel/Sheets porque ninguna celda contiene comas ni comillas.
Verificado con el parser real del app: 330 filas, 10 columnas, cero corridas.

Cambio de código (menor, opcional): en el modo "update by match" el previo ya
no muestra el aviso confuso "does not exist yet" sobre la columna del nombre.
Si ya está publicada V00021, basta con usar el CSV v2 — este zip solo limpia
ese aviso.

IMPORTANTE: cargar el CSV v2 TAL CUAL se descarga, sin abrirlo y re-guardarlo.
Si necesitas revisarlo antes, ábrelo con doble clic solo para VER, y para la
carga usa el archivo descargado original.
