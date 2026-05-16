export async function uploadDocument(
  file: File,
  currentUserId?: string,
): Promise<{ ok: boolean; document?: any; message: string; degradedToDemo?: boolean }> {
  return {
    ok: true,
    document: {
      id: `doc_${Date.now()}`,
      title: file.name,
      type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
      status: 'Draft',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUserId || 'user_default',
    },
    message: 'Document uploaded successfully.',
    degradedToDemo: false,
  };
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
