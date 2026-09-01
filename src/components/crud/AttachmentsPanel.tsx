import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import {
  deleteAttachment,
  listAttachments,
  uploadAttachment,
  type AttachmentListing,
} from '../../services/attachments';
import './AttachmentsPanel.css';

interface AttachmentsPanelProps {
  /** Carpeta del registro en Storage (p. ej. "Truck/510002"). */
  folder: string;
  /** Puede subir y borrar (permiso de edición del módulo). */
  canEdit: boolean;
}

/**
 * Fotos y documentos del registro: tomar foto con la cámara del teléfono,
 * subir desde la galería o adjuntar un PDF. Se guardan en Firebase Storage
 * bajo la carpeta del registro (Truck/<número>/imagen|documento/…) y se
 * listan aquí con miniaturas; borrar pide permiso de edición.
 */
export function AttachmentsPanel({ folder, canEdit }: AttachmentsPanelProps) {
  const [listing, setListing] = useState<AttachmentListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cameraInput = useRef<HTMLInputElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const refresh = () => {
    listAttachments(folder)
      .then(setListing)
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? `Files unavailable: ${err.message} (is Storage enabled in Firebase?)`
            : 'Files unavailable',
        );
      });
  };

  useEffect(() => {
    setListing(null);
    setError(null);
    listAttachments(folder)
      .then(setListing)
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? `Files unavailable: ${err.message} (is Storage enabled in Firebase?)`
            : 'Files unavailable',
        );
      });
  }, [folder]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadAttachment(folder, file);
      }
      refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Upload failed: ${err.message} (is Storage enabled in Firebase?)`
          : 'Upload failed',
      );
    } finally {
      setBusy(false);
      if (cameraInput.current) cameraInput.current.value = '';
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleDelete = async (fullPath: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteAttachment(fullPath);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? `Could not delete: ${err.message}` : 'Could not delete');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="attach">
      <p className="attach-folder">
        Saved in <code>{folder}/imagen|documento/</code>
      </p>
      {canEdit ? (
        <div className="attach-actions">
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={() => cameraInput.current?.click()}
          >
            <Camera size={15} />
            Take photo
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={15} />
            Upload photo / PDF
          </button>
          {busy ? <span className="attach-busy">Working…</span> : null}
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="attach-input"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="attach-input"
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </div>
      ) : null}
      {error ? <p className="attach-error">{error}</p> : null}
      {listing === null && error === null ? <p className="attach-empty">Loading files…</p> : null}
      {listing !== null ? (
        <>
          <h4 className="attach-title">
            <ImageIcon size={14} /> Photos ({listing.images.length})
          </h4>
          {listing.images.length === 0 ? (
            <p className="attach-empty">No photos yet.</p>
          ) : (
            <div className="attach-grid">
              {listing.images.map((item) => (
                <figure key={item.fullPath}>
                  <a href={item.url} target="_blank" rel="noreferrer" title={item.name}>
                    <img src={item.url} alt={item.name} loading="lazy" />
                  </a>
                  {canEdit ? (
                    <button
                      type="button"
                      className="icon-btn attach-del"
                      title="Delete photo"
                      disabled={busy}
                      onClick={() => void handleDelete(item.fullPath)}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </figure>
              ))}
            </div>
          )}
          <h4 className="attach-title">
            <FileText size={14} /> Documents ({listing.documents.length})
          </h4>
          {listing.documents.length === 0 ? (
            <p className="attach-empty">No documents yet.</p>
          ) : (
            <ul className="attach-docs">
              {listing.documents.map((item) => (
                <li key={item.fullPath}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.name}
                  </a>
                  {canEdit ? (
                    <button
                      type="button"
                      className="icon-btn attach-del"
                      title="Delete document"
                      disabled={busy}
                      onClick={() => void handleDelete(item.fullPath)}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
