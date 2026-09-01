/**
 * Versión publicada de la aplicación. Sube +1 en cada despliegue.
 *
 * Cómo funciona el aviso de versión nueva: este valor queda "quemado" en el
 * paquete que cada usuario tiene cargado en su navegador, mientras que
 * `public/version.json` se sirve siempre fresco desde el servidor. Al
 * compararlos se sabe si la pestaña abierta quedó vieja, sin necesidad de
 * base de datos ni lecturas de Firestore.
 *
 * IMPORTANTE: al publicar hay que subir el número EN LOS DOS lugares
 * (este archivo y public/version.json); si no coinciden, todos verían el
 * aviso de actualización de forma permanente.
 */
export const APP_VERSION = 'V00037';

/** Cada cuánto se pregunta al servidor si hay una versión nueva. */
export const VERSION_CHECK_MS = 5 * 60 * 1000;
