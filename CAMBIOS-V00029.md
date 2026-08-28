# ServiExpress · V00029 — Uno por semana bien amarrado, fecha protegida y el 27 vs 14 explicado

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Por qué "27 en el reporte" vs "14 of 34 en el aviso"
Son dos medidas distintas y ahora el propio reporte lo explica. El aviso
cuenta SOLO camiones que (a) están ACTIVOS, (b) pertenecen HOY a la estación
del BC y (c) se capturaron DENTRO del rango de la ventana vigente. El "27" es
todo lo que el reporte tiene, incluidos camiones de otras estaciones (se
capturaron antes de la regla de estación), camiones capturados fuera del
rango o camiones dados de baja. Al abrir el reporte, el resumen verde/ámbar
ahora agrega el desglose:
  "This report holds 27 trucks; 14 count for this window and station
   (9 belong to another station, 4 were captured outside this window's dates)."
Con eso se ve exactamente de dónde sale cada número.

## 2. Corregido: el candado "uno por semana" no saltaba en "View as"
Comparaba contra el uid de TU sesión real (admin) en vez del usuario
simulado. Ya evalúa al usuario EFECTIVO: en "View as Orlando" y para el
Orlando real funciona igual.

## 3. El mensaje sale DENTRO del formulario
El botón Add sigue activo; al abrir el alta, arriba aparece en rojo:
  "No se puede cargar un nuevo BC Report esta semana. You already created
   yours (BC Report 08/25/2026 · 770 · by Orlando Pimentel): open that report
   and keep adding your trucks there. The next window opens Tue, Sep 1, 2026,
   8:00 AM CT."
Y el guardado se rechaza con el mismo mensaje (se revalida al momento de
guardar, por si lo intentó desde otra pestaña).

## 4. Los BC no pueden modificar la fecha
El campo Date del BC Report queda BLOQUEADO: lo llena el sistema con el día
de hoy (hora de Texas). Solo el admin o un rol con "Edit locked fields" en la
matriz de Roles puede cambiarla — que es la única forma de "subir con otra
fecha", como se pidió.

## 5. Un registro por semana = por rango de la ventana
Confirmado el comportamiento: con la ventana martes 8:00 AM -> miércoles de
la siguiente semana, Orlando (reporte del 08/25) podrá crear el próximo el
MARTES 1 DE SEPTIEMBRE a las 8:00 AM CT, cuando arranca el nuevo ciclo; el
mensaje del punto 3 le dice esa fecha exacta.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00029.
