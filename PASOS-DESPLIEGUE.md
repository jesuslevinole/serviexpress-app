# Correos automáticos · Cloud Functions + SMTP (sin Resend, sin Twilio)

Los avisos salen del SERVIDOR: Firestore dispara la función al escribirse el
registro. Llegan aunque quien capturó cierre la pestaña, aunque el registro
entre por una importación y aunque el app esté cerrado.

El envío usa **SMTP**, es decir, el correo que la empresa YA tiene. No hay
que contratar ningún servicio: solo hacen falta los datos del servidor de
salida de ese buzón.

## 1. Reúne los datos del correo (5 minutos)

Necesitas cinco cosas. Según dónde esté el correo de la empresa:

**Google Workspace / Gmail**
- SMTP_HOST: `smtp.gmail.com`
- SMTP_PORT: `465`
- SMTP_USER: la dirección completa (p. ej. `avisos@serviexpress.com`)
- SMTP_PASS: una **contraseña de aplicación**, NO la del usuario. Se saca en
  la cuenta de Google → Seguridad → Verificación en dos pasos (tiene que
  estar activa) → Contraseñas de aplicaciones. Son 16 letras.
- MAIL_FROM: la misma dirección de SMTP_USER, o un alias que esa cuenta
  tenga configurado. Gmail no deja enviar "en nombre de" direcciones ajenas.

**Microsoft 365 / Outlook**
- SMTP_HOST: `smtp.office365.com`
- SMTP_PORT: `587`
- SMTP_USER / MAIL_FROM: la dirección completa
- SMTP_PASS: la contraseña (o una de aplicación si hay MFA)
- OJO: Microsoft trae **SMTP AUTH apagado** por defecto. Hay que encenderlo
  para ese buzón en el centro de administración (Usuarios → el usuario →
  Correo → Administrar aplicaciones de correo → SMTP autenticado).

**Hosting propio (cPanel, Plesk, Zoho…)**
- Los datos están en el panel, en "Configurar cliente de correo":
  host tipo `mail.tudominio.com`, puerto `465` o `587`, usuario = la
  dirección completa, contraseña = la del buzón.

Puerto: **465** (SSL) o **587** (STARTTLS). El 25 no sirve: Google Cloud lo
bloquea de salida.

## 2. Preparar la máquina (solo la primera vez)
```
npm install -g firebase-tools
firebase login
```
(Node.js 20 o superior: https://nodejs.org)

## 3. Desplegar

En la carpeta del proyecto (la que tiene `firebase.json` y `functions/`):

```
cd ~/Desktop/Projects/serviexpress-app
firebase use serviexpress-12fcc
```

Eso crea `.firebaserc`; súbelo al repositorio y no vuelves a ver
"Error: No currently active project".

Guarda los cinco secretos (los pide uno a uno; pega y Enter, sin comillas):

```
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set MAIL_FROM
```

Y despliega:

```
firebase deploy --only functions
```

Si pide habilitar APIs (Cloud Build, Artifact Registry, Eventarc), responde
que sí: es la primera vez y se habilitan solas. Tarda unos minutos.

Al terminar verás `sendEmail`, `testNotification` y, por cada colección
vigilada, su pareja: `onCreateTrucks` / `onUpdateTrucks`,
`onCreateFleetReports` / `onUpdateFleetReports`, `onCreateRequirements` /
`onUpdateRequirements`, y así con bcReports, maintenance, shopOrders,
accidents, drivers, assets, rentals y fleet.

**Requiere plan Blaze** (ya lo tienen): los disparadores de Firestore y las
conexiones de salida no existen en el plan gratuito.

## 4. Encender los avisos en el app (una vez POR VISTA)
1. Entra al módulo (Trucks, Fleet Report, Requirements…) → botón
   **"Automatic emails"**.
2. Marca **cuándo** avisar: al crear, al editar, y/o reglas por campo
   (*"Cuando Status pase a APROBADO"* — ahí está el aviso de aprobación).
3. Marca **a quién**: los usuarios de la lista y, si quieres, quien capturó
   el registro.
4. **Save** y después **Probar envío**: manda un correo a tu propia
   dirección y, si algo falla, escribe el motivo exacto en pantalla.

> Si venías de la versión anterior, vuelve a guardar la configuración de
> cada vista: la nueva incluye datos que el servidor necesita (la colección
> y los campos que van en el correo).

## 5. Seguridad, como quedó
- El navegador NO envía correos ni decide destinatarios: solo guarda la
  configuración. El envío ocurre en el servidor.
- La contraseña del correo vive en Secret Manager de Google, nunca en el
  navegador ni en el repositorio.
- Cada envío queda en `messages_log` (a quién, cuándo, módulo, evento,
  estado o error).
- Un correo que falle NUNCA rompe el guardado: la función atrapa el error,
  lo registra y sigue.

## 6. Costos
- Cloud Functions: 2 millones de invocaciones al mes sin costo.
- El correo: el del buzón que ya pagan. Cuidado solo con los topes diarios
  del proveedor (Google Workspace: 2.000 correos/día por cuenta; de sobra).

## 7. Si algo no llega
1. **Probar envío** en el app: dice el error literal del servidor de correo.
   Los más comunes:
   - *Invalid login* / *535*: usuario o contraseña mal, o falta la
     contraseña de aplicación.
   - *SMTP AUTH disabled*: Microsoft 365 con SMTP apagado (paso 1).
   - *Connection timeout*: puerto equivocado (usa 465 o 587).
   - *Mail from not allowed*: MAIL_FROM no es la cuenta ni un alias suyo.
2. Firebase → Functions → Registros: cada ejecución deja
   `[notify] <colección> create|update <id>: <resultado>`.
3. `messages_log` en Firestore: todo envío, con su estado.
4. Que el destinatario tenga **correo** en Users y no esté INACTIVO.
