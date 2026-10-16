# Correos automáticos · Cloud Functions + Resend (SIN Twilio)

Los avisos salen del SERVIDOR: Firestore dispara la función al escribirse el
registro. Llegan aunque quien capturó cierre la pestaña, aunque el registro
entre por una importación, y aunque el app esté cerrado.

## Qué es Resend
Servicio de envío de correos independiente (resend.com). Gratis hasta 3.000
correos/mes (100/día). Sin ninguna dependencia de Twilio.

## REQUISITO CLAVE: el dominio
Para que el remitente sea noreply@serviexpress.com hay que CONTROLAR EL DNS
de ese dominio: agregar los registros (TXT/MX) que Resend te dé. El buzón
"noreply" NO necesita existir — es solo el remitente. Si serviexpress.com no
es de ustedes: usar un dominio propio o comprar uno (~$10/año).

## 1. Resend (una sola vez)
1) Crea la cuenta en https://resend.com (correo y contraseña, sin tarjeta).
2) Domains → Add Domain → escribe tu dominio → Resend muestra 3 registros
   DNS (SPF, DKIM y MX de retorno) → agrégalos donde esté el DNS
   (Cloudflare: pégalos tal cual; los TXT/MX no llevan proxy) → Verify.
3) API Keys → Create API Key → nombre "serviexpress-functions", permiso
   "Sending access" → copia la key (empieza con re_, se muestra una vez).

## 2. Preparar la máquina (solo la primera vez)
1) Node.js 20+: https://nodejs.org
2) En una terminal:
   npm install -g firebase-tools
   firebase login

## 3. Desplegar
1) Entra a la carpeta del proyecto (la que tiene `firebase.json` y
   `functions/`):
   firebase use serviexpress        (el ID de tu proyecto Firebase)
   cd functions && npm install && cd ..
2) Guarda los 2 secretos (los pide uno a uno, pégalos sin comillas):
   firebase functions:secrets:set RESEND_API_KEY
   firebase functions:secrets:set MAIL_FROM
   (MAIL_FROM = noreply@tudominio.com)
3) Despliega:
   firebase deploy --only functions

Al terminar verás, además de `sendEmail`, dos funciones por cada colección
vigilada: `onCreateFleetReports`, `onUpdateFleetReports`,
`onCreateRequirements`, `onUpdateRequirements`, y así con bcReports,
maintenance, shopOrders, accidents, trucks, drivers, assets, rentals y fleet.

**Requiere plan Blaze** (ya lo tienen): los disparadores de Firestore no
existen en el plan gratuito.

Si al desplegar pide habilitar APIs (Cloud Build, Artifact Registry,
Eventarc), responde que sí: es la primera vez y se habilitan solas.

## 4. Encender los avisos en el app (esto se hace una vez POR VISTA)
1) Entra al módulo (Fleet Report, Requirements…) → botón
   **"Automatic emails"**.
2) Marca **cuándo** avisar:
   - Al crear un registro.
   - Al editar cualquier campo.
   - Reglas por campo: *"Cuando Status pase a APROBADO"* → avisa aunque las
     dos anteriores estén apagadas. Ahí está el aviso de aprobación de un
     requerimiento.
3) Marca **a quién**: los usuarios de la lista y, si quieres, también a
   quien capturó el registro.
4) Guarda. Desde ese momento los correos son automáticos.

> Si ya tenías configurado "Email on save" en alguna vista, **vuelve a
> entrar y guardar**: la configuración nueva incluye datos que el servidor
> necesita (la colección y los campos que van en el correo) y que la versión
> anterior no guardaba.

## 5. Seguridad, como quedó
- El navegador NO envía correos ni decide destinatarios: solo guarda la
  configuración. El envío ocurre en el servidor.
- La API key vive en Secret Manager de Google, jamás en el navegador ni en
  el repositorio.
- Cada correo queda en la colección `messages_log` (a quién, cuándo, módulo,
  evento, estado o error): la bitácora de mensajes.
- Un correo que falle NUNCA rompe el guardado: la función atrapa el error, lo
  registra y sigue.

## 6. Costos
- Cloud Functions: 2 millones de invocaciones al mes sin costo. Una
  invocación por cada escritura en las colecciones vigiladas; la que no tiene
  configuración termina en una lectura y se acaba.
- Resend: gratis 3.000 correos/mes. Si un día hace falta más, $20/mes por
  50 mil.

## 7. Si algo no llega
1) Firebase → Functions → Registros: cada ejecución deja una línea
   `[notify] <colección> create|update <id>: <resultado>`. Los resultados
   posibles: *sin configuración*, *sin destinatarios*, *alta no configurada*,
   *edición no configurada*, *sin correos válidos*, *enviado a N*, *error: …*.
2) `messages_log` en Firestore: todo envío, con su estado.
3) Que el usuario destinatario tenga **correo** en Users y no esté INACTIVO.
