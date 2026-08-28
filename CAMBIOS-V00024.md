# ServiExpress · V00024 — Conteo a prueba de datos migrados, cierre "semana siguiente" y fechas

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Conteo de camiones por reporte (los "Empty" de más)
Ojo: en las capturas el conteo iba A LA MITAD (170/332); los reportes aún no
verificados se ven Empty hasta que les llega su turno. Aun así se blindó:
- El conteo ahora consulta LAS DOS fuentes cuando el espejo da 0: maintenance
  (por idBcReport) y también los renglones del reporte (bcReportDetails), y
  toma el mayor. Los datos migrados enlazan a veces por una y a veces por la
  otra; así ninguna combinación se queda en 0 por error.
- TODOS los reportes se re-verifican UNA vez más con esta lógica (verificador
  v2), incluidos los que la corrida anterior dejó en 0.
- La nota de progreso ya solo aparece en BC Reports (se estaba colando en
  Maintenance por un estado compartido).
AL PUBLICAR: BC Reports > pestaña All, dejar la pantalla abierta hasta que la
nota de conteo desaparezca. Después revisar Empty: si aún queda alguno que al
abrirlo SÍ muestre registros en "Maintenance of this report", mandar captura
de ese reporte para rastrear su enlace.

## 2. Ventana: cierre en "la semana siguiente", explícito
En el modal, debajo de "Closes on" hay ahora un selector:
  "Wednesday of that SAME week"  /  "Wednesday of the FOLLOWING week"
- Con "FOLLOWING week": martes 8:00 AM -> miércoles 11:59 PM de la próxima
  semana (8 días 16 h). Hoy jueves la ventana aparece ABIERTA con su cuenta
  regresiva al miércoles siguiente, como se pidió.
- El previo del modal ahora dice la duración y un ejemplo con fechas
  concretas ("Aug 25, 8:00 AM CT -> Sep 2, 11:59 PM CT"), y el aviso del
  módulo dice "to Wednesday of the following week" para que nadie dude.
- Aviso importante que el modal muestra: con más de 7 días, cada martes abre
  la ventana nueva ANTES de que cierre la anterior, así que la captura nunca
  queda cerrada; lo que sigue mandando es "cada camión una sola vez por ciclo
  semanal".
Hay que entrar a "Change window" una vez y elegir "of the FOLLOWING week".

## 3. Fechas MM/DD/YYYY
Faltaba el sello "Captured: ..." del visor de detalle (salía DD/MM por el
idioma del navegador): ya sale MM/DD/YYYY. Tablas, detalle y exportes ya
estaban en MM/DD/YYYY desde V00021. Las CASILLAS de captura de fecha las
dibuja el navegador según su idioma (dd/mm/aaaa al teclear si está en
español); el valor guardado y mostrado es MM/DD/YYYY siempre.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00024.
