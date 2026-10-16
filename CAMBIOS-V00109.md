# ServiExpress · V00109 — Botón "Probar envío": saber POR QUÉ no llega un correo

Incluye todo lo de V00108 (correos automáticos desde el servidor).
Se publican las dos partes: `src/` + `public/` (el app) y `functions/`
(`firebase deploy --only functions`).

## Por qué este botón

Hasta ahora, si un correo no llegaba no había forma de saber dónde se cortó:
¿no se desplegó la función?, ¿el dominio de Resend no está verificado?, ¿la
API key caducó?, ¿el usuario no tiene correo? Todo se veía igual: silencio.

En **Automatic emails** de cualquier vista hay ahora un botón **"Probar
envío"**. Manda un correo de prueba **a tu propia dirección** (la que tengas
en Users, no se puede mandar a otra) y escribe en pantalla el resultado:

| Lo que dice | Qué significa |
|---|---|
| *Correo de prueba enviado a tu@correo* | Todo funciona: funciones desplegadas, dominio verificado y clave válida. Si no llega, mira el correo no deseado. |
| *No se pudo llamar a la función… ¿Está desplegada?* | Falta `firebase deploy --only functions`. |
| *Tu usuario no tiene un correo válido en Users* | Ponle correo a tu usuario. |
| *Esta vista todavía no tiene configuración guardada* | Marca destinatarios y presiona Save. |
| *La configuración es de la versión anterior…* | Vuelve a guardar: la nueva guarda datos que el servidor necesita. |
| Cualquier otro texto | Es el error **literal** de Resend: dominio sin verificar, API key inválida, etc. |

Cada prueba queda también en `messages_log`.

## Recordatorio de orden

1. Publica el app (`src/` + `public/`).
2. Despliega las funciones (`PASOS-DESPLIEGUE.md`). **Sin esto no sale ni un
   correo**, por mucho que el app muestre la configuración.
3. En la vista: "Automatic emails" → marca destinatarios → **Save** →
   **Probar envío**.
4. Recién entonces, crea un registro de prueba.

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK,
`node --check functions/index.js` OK; versión V00109.
