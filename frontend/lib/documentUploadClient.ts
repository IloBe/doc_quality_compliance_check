type UploadedDocument = {
  id: string;
  title: string;
  type: string;
  status: string;
  updatedAt: string;
  updatedBy: string;
};

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN?.trim() || '';
}

function buildApiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
}

function mapBackendStatusToHubStatus(status: string | undefined): string {
  const normalized = (status || '').trim().toLowerCase();
  if (!normalized || normalized === 'pending' || normalized === 'analyzing') {
    return 'Draft';
  }
  if (normalized === 'passed') {
    return 'Approved';
  }
  if (normalized === 'modifications_needed') {
    return 'rework after review';
  }
  return normalized;
}

function inferDocumentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'md') {
    return 'requirements';
  }
  if (extension === 'txt') {
    return 'unknown';
  }
  return 'unknown';
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: { message?: string }; detail?: string };
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (payload?.detail) {
      return payload.detail;
    }
  } catch {
    // Ignore parse errors and fall back to status text.
  }
  return response.statusText || 'Upload failed. Please retry.';
}

export async function uploadDocument(
  file: File,
  currentUserId?: string,
): Promise<{ ok: boolean; document?: UploadedDocument; message: string; degradedToDemo?: boolean }> {
  const endpoint = buildApiUrl('/api/v1/documents/upload');
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const detail = await parseErrorMessage(response);
      return {
        ok: false,
        message: detail,
      };
    }

    const payload = await response.json() as {
      document_id: string;
      filename: string;
      document_type?: string;
      status?: string;
    };

    return {
      ok: true,
      document: {
        id: payload.document_id,
        title: payload.filename || file.name,
        type: payload.document_type || inferDocumentType(file.name),
        status: mapBackendStatusToHubStatus(payload.status),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserId || 'user_default',
      },
      message: 'Document uploaded successfully.',
      degradedToDemo: false,
    };
  } catch {
    return {
      ok: false,
      message: 'Upload service unavailable. Please verify backend availability and retry.',
      degradedToDemo: false,
    };
  }
}

export const ACCEPTED_UPLOAD_TYPES_LABEL = '.md, .pdf, .docx';

export function validateUploadFileType(file: File): { ok: boolean; extension?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowed = new Set(['md', 'txt', 'pdf', 'docx']);
  if (!extension || !allowed.has(extension)) {
    return { ok: false, extension };
  }
  return { ok: true, extension };
}
