# ServiExpress · V00099 — Quién ve qué lo decide SOLO el rol, y el Fleet Report trae todo menos millaje y cauchos

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## 1. Por qué a varios usuarios no les aparecía nada

Había DOS reglas peleando. La lista del módulo respetaba la columna
**Visibility** del rol (Roles), pero por debajo el app recortaba igual a las
estaciones asignadas al usuario, dijera lo que dijera el rol. Resultado: un BC
con Visibility = **All** solo descargaba lo de su estación — y lo que no se
descarga no se puede ver ni buscar. Lo mismo pasaba con los desplegables: por
eso al escribir **534858** en Truck salía "No results".

Ahora manda **una sola regla, la del rol**:

| Visibility en Roles | Lista del módulo | Desplegables (camión, BC Report) |
|---|---|---|
| All | todo | todos |
| Station / Entity + Station | su estación | los de su estación |
| Own | lo que él capturó | sin recorte |

Admin real y usuarios de oficina siguen viendo todo.

Además, tres agujeros que escondían registros para siempre:

- **Lo que yo capturé lo veo siempre**, aunque el camión haya cambiado de
  estación después (o se haya quedado sin ella). Antes el BC perdía de vista
  su propio reporte.
- **Un registro SIN estación ya no desaparece.** Antes no era de nadie y no lo
  veía nadie; ahora se muestra, y el filtro solo descarta los que pertenecen a
  OTRA estación. Igual con los camiones sin Current station: se pueden elegir
  desde cualquier cuenta.
- **Se dice por qué falta una opción.** Si el rol recorta por estación, debajo
  del campo se lee: *"Only truck of your station(s) are listed. 12 hidden: they
  belong to another station."* — en vez del "No results" a secas.

**Qué hacer en Roles:** si quieres que los BC vean solo su estación, pon
Visibility = **Station** en Trucks y Fleet Report; eso ahora recorta también
los desplegables y baja las lecturas de Firestore. Si lo dejas en **All**, ven
todo.

## 2. Fleet Report: la semana pasada se trae completa

Al elegir el camión se precarga su **último Fleet Report**, ahora con TODO lo
que está antes de Actual Mileage:

**Se traen:** Type · Route · Driver · Scanner · Gas Card # · S Number ·
V Truck · Stops.

**Arrancan vacíos (se capturan cada semana):** Actual Mileage · las seis
llantas · Add corrective maintenance? · Specify the problem.

Entity, Station y Next mant siguen saliendo del propio camión. Si el camión no
tiene Fleet Report anterior, el formulario queda en blanco (como se acordó: no
se toma nada de Fleet ni de BC Report). Lo que el usuario ya tecleó nunca se
pisa, y si cambia de camión la precarga anterior se deshace sola.

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK; versión V00099.
