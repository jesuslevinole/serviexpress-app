# ServiExpress · V00106 — Dashboard: fuera BC Report y Fleet, entra Fleet Report

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

Las tarjetas del tablero quedan así:

**Fleet Report** · Trucks · Drivers · Assets · Shop orders · Rentals ·
Requirements

Las de **BC Reports** y **Fleet** se quitaron; en su lugar va una sola de
**Fleet Report**, que abre ese módulo al presionarla, como las demás.

Los módulos BC Report y Fleet **siguen en el menú** y funcionando igual: solo
salieron del tablero. De paso son dos conteos menos a Firestore cada vez que
alguien entra al Dashboard.

Cada quien sigue viendo solo las tarjetas de los módulos que su rol le
permite ver.

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK; versión V00106.
