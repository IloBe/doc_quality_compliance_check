export async function acquireDocumentLock(
  _id: string,
  _userId?: string,
): Promise<{ ok: boolean; lockedBy?: string; message: string; degradedToDemo?: boolean }> {
  return { ok: true, message: 'Lock acquired', degradedToDemo: false };
}

export async function releaseDocumentLock(
  _id: string,
  _userId?: string,
): Promise<{ ok: boolean; lockedBy?: string; message: string; degradedToDemo?: boolean }> {
  return { ok: true, message: 'Lock released', degradedToDemo: false };
}
