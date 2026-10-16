# V00114 — El correo dice quién guardó, cuándo, y qué campos cambiaron

> Requiere V00113 instalado. Son 6 archivos.

## El problema

El disparador de Firestore sabe **qué** quedó guardado, pero no **quién** lo
guardó: esa información no viaja con el evento. Por eso el correo solo podía
mostrar el campo "Captured by", que es el dueño del registro, no la persona que
hizo ese guardado en concreto. Si alguien más editaba después, el correo seguía
diciendo lo mismo.

## La solución

El app ahora **firma cada escritura**. En `firestoreService` —el único sitio por
donde pasan todas las altas y ediciones del app— cada guardado sella:

- `updatedBy`: el uid de **la sesión real**. Si un admin está "visualizando
  como" otra persona y guarda, queda firmado por el admin. Es la misma regla que
  ya pediste para la autoría de los registros.
- `createdBy`: solo en el alta, para que un registro que nunca se edite
  conserve a su autor original.
- `updatedAt`: ya existía (hora del servidor, no la del PC de quien guarda).

Se hace en el servicio y no en cada pantalla, así ninguna vista nueva se queda
sin firma por olvido.

## Qué se ve ahora en el correo

**1. Una línea destacada, siempre, debajo del encabezado:**

> Editado por **Jesús Molero** · Oct 16, 2026, 9:34 PM

Dice "Creado por" en un alta y "Editado por" en una edición. La hora es la del
**guardado** (antes la variable `{fecha}` daba la hora del envío) y va en hora
de Texas (`America/Chicago`).

**2. Los campos tocados, arriba del todo y en tabla de tres columnas:**

| Campo | Antes | Ahora |
|---|---|---|
| Status | ~~SHOP~~ | **ACTIVE** |
| Current station | ~~771~~ | **776** |

Antes la lista de cambios iba al final, debajo de la tabla completa, y en una
sola línea. Ahora va primero —es lo que se quiere ver— con el valor anterior
tachado y el nuevo en negrita, y el encabezado dice cuántos campos cambiaron.
La tabla con el registro completo queda debajo, bajo el título "Registro
completo".

**3. Una variable nueva:** `{autor}`, por si quieres el nombre en el asunto.
Por ejemplo: `{titulo}: {evento} por {autor}`. No hace falta usarla — la línea
de quién y cuándo sale igual.

## Dos cosas que conviene saber

- **Los registros ya existentes no tienen firma.** Nadie los guardó con esta
  versión, así que su primer correo mostrará solo la fecha. En cuanto alguien
  los edite, aparece el nombre.
- Un registro que entre por **importación de CSV** se firma igual, con quien
  hizo la importación.

## Archivos

```
src/services/firestoreService.ts     sella updatedBy / createdBy en cada guardado
functions/index.js                   resuelve el autor, formatea la hora, reordena el correo
src/services/emailNotifications.ts   variable {autor}; {fecha} = hora del guardado
src/components/crud/EmailRecipientsModal.tsx  lo explica en el editor
src/config/version.ts, public/version.json    V00114
```

## Para publicar

1. Copia los archivos y sube el front.
2. **Redespliega las funciones** (sin esto el correo no cambia):
   ```
   FUNCTIONS_DISCOVERY_TIMEOUT=120 firebase deploy --only functions
   ```
3. Prueba de verdad: edita un camión cambiando dos campos y mira el correo.

## Verificado

- `tsc -b`, `eslint src` y `vite build` sin errores
- `functions/index.js` carga: 24 funciones
- Formato de fecha probado contra el código real con las cuatro formas en que
  puede llegar `updatedAt` (Timestamp de Firestore, texto ISO de registros
  viejos, Date) y con valores inválidos: devuelve vacío en vez de
  "Invalid Date", y el correo cae a la hora de envío
