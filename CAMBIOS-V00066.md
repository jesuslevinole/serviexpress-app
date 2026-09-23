# ServiExpress · V00066 — Ventana ordenada, botones arriba y verificación con notas

Reemplaza la carpeta `src/` completa y `public/version.json`.
Archivos nuevos para git: src/services/verifications.ts,
src/components/crud/VerifyModal.tsx (+ .css).

## 1. La ventana de horarios, ordenada
La tabla "Saved schedules" se había quedado DENTRO del pie del modal, y por
eso los botones se estiraban en columnas altas. Ahora va en el cuerpo, arriba
del formulario, y el pie vuelve a tener los tres botones normales
(Remove window · Cancel · Update window).

## 2. Los botones de mantenimiento, arriba
"Add corrective maintenance" y "Add preventive maintenance" ahora se ven al
ABRIR el detalle, antes de los campos, sin tener que bajar hasta el final.

## 3. Verificación con resultado, nota e historial
El check ya no marca y desmarca a ciegas: abre una ventana donde quien
verifica elige el resultado y deja constancia.
- Tres resultados: "Everything is correct", "Something is wrong" y "All the
  information is wrong".
- NOTA OBLIGATORIA cuando el resultado no es "todo correcto" (si está todo
  bien, la nota es opcional). Sin la nota no deja guardar.
- VARIAS PERSONAS pueden verificar el mismo registro: cada una deja la suya
  y en la misma ventana se ve el HISTORIAL completo — resultado, quién y
  cuándo (hora de Texas), con la nota debajo y un color por resultado.
- En la tabla del módulo: la columna "Verification" muestra el último
  resultado con color (verde / ámbar / rojo) y el check queda verde solo
  cuando la última verificación dice que está todo correcto.
- Cada verificación queda además en la bitácora del registro.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00066.
