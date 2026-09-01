import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { storage } from '../firebase/config';

/**
 * Adjuntos por registro en Firebase Storage, con la estructura de carpetas
 * acordada con el cliente:
 *   Truck/<unitN>/imagen/…        Truck/<unitN>/documento/…
 *   mantenimientoPreventivo/<unitN>/imagen|documento/…
 *   mantenimientoCorrectivo/<unitN>/imagen|documento/…
 *   Driver/<Nombre del driver>/imagen|documento/…
 *   <colección>/<etiqueta>/imagen|documento/…   (resto de módulos)
 */

export interface AttachmentItem {
  name: string;
  url: string;
  /** Ruta completa en Storage (para borrar). */
  fullPath: string;
}

export interface AttachmentListing {
  images: AttachmentItem[];
  documents: AttachmentItem[];
}

/** Un segmento de carpeta seguro para Storage (sin / # [ ] ? ni controles). */
export function sanitizeSegment(raw: string): string {
  const clean = raw
    .trim()
    .replace(/[/#[\]?*\\]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
  return clean === '' ? 'sin-nombre' : clean;
}

/** Los archivos de imagen van a /imagen, el resto (PDF) a /documento. */
export function kindOf(file: File): 'imagen' | 'documento' {
  return file.type.startsWith('image/') ? 'imagen' : 'documento';
}

/** Sube un archivo a `<folder>/<imagen|documento>/<timestamp - nombre>`. */
export async function uploadAttachment(folder: string, file: File): Promise<AttachmentItem> {
  const stampedName = `${Date.now()} - ${sanitizeSegment(file.name)}`;
  const fullPath = `${folder}/${kindOf(file)}/${stampedName}`;
  const fileRef = ref(storage, fullPath);
  await uploadBytes(fileRef, file, { contentType: file.type || undefined });
  const url = await getDownloadURL(fileRef);
  return { name: stampedName, url, fullPath };
}

/** Lista imágenes y documentos de la carpeta del registro. */
export async function listAttachments(folder: string): Promise<AttachmentListing> {
  const load = async (kind: 'imagen' | 'documento'): Promise<AttachmentItem[]> => {
    const result = await listAll(ref(storage, `${folder}/${kind}`));
    const items = await Promise.all(
      result.items.map(async (item) => ({
        name: item.name,
        url: await getDownloadURL(item),
        fullPath: item.fullPath,
      })),
    );
    // Más recientes primero (el nombre inicia con el timestamp).
    return items.sort((a, b) => b.name.localeCompare(a.name));
  };
  const [images, documents] = await Promise.all([load('imagen'), load('documento')]);
  return { images, documents };
}

export async function deleteAttachment(fullPath: string): Promise<void> {
  await deleteObject(ref(storage, fullPath));
}
