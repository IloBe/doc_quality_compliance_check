// Artifact Export Client - API client for artifact export operations

export interface ArtifactExportPayload {
  runId: string;
  artifactId: string;
  artifactTitle: string;
  artifactContent: string;
  documentId?: string;
}

export interface ArtifactExportResult {
  ok: boolean;
  message: string;
  degradedToDemo?: boolean;
  reason?: string;
  actionPoints?: string[];
  outputIpRisk?: {
    riskLevel: 'low' | 'medium' | 'high';
    matchedSignals: string[];
  };
}

const OUTPUT_IP_RISK_PATTERNS: Record<string, string[]> = {
  copyright_reference: ['copyright', 'all rights reserved', 'licensed content'],
  verbatim_copy_intent: ['verbatim', 'copy and paste', 'exact copy', 'word-for-word'],
  trademark_reference: ['trademark', 'registered mark', 'logo', 'brand asset'],
  no_permission_language: ['without permission', 'no permission', 'without consent', 'unauthorized'],
};

function assessOutputIpRisk(content: string): { riskLevel: 'low' | 'medium' | 'high'; matchedSignals: string[] } {
  const text = (content || '').toLowerCase();
  const matchedSignals = Object.entries(OUTPUT_IP_RISK_PATTERNS)
    .filter(([, terms]) => terms.some((term) => text.includes(term)))
    .map(([signal]) => signal);

  const highSignal = matchedSignals.some((signal) => signal === 'verbatim_copy_intent' || signal === 'no_permission_language');
  if (highSignal || matchedSignals.length >= 3) {
    return { riskLevel: 'high', matchedSignals };
  }
  if (matchedSignals.length >= 1) {
    return { riskLevel: 'medium', matchedSignals };
  }
  return { riskLevel: 'low', matchedSignals };
}

function blockedExportResult(riskLevel: 'medium' | 'high', matchedSignals: string[]): ArtifactExportResult {
  return {
    ok: false,
    message: `Export blocked by output IP-risk policy (${riskLevel}).`,
    reason: 'export_output_ip_risk_blocked',
    actionPoints: [
      'Review the source artifact for copyright, trademark, and verbatim-copy indicators.',
      'Obtain human approval before exporting the artifact.',
    ],
    outputIpRisk: {
      riskLevel,
      matchedSignals,
    },
  };
}

export async function exportArtifactPdf(payload: ArtifactExportPayload): Promise<ArtifactExportResult> {
  const outputIpRisk = assessOutputIpRisk(payload.artifactContent);
  if (outputIpRisk.riskLevel !== 'low') {
    return blockedExportResult(outputIpRisk.riskLevel, outputIpRisk.matchedSignals);
  }
  return { ok: true, message: 'PDF export queued.', degradedToDemo: true };
}

export async function exportArtifactMarkdown(payload: ArtifactExportPayload): Promise<ArtifactExportResult> {
  const outputIpRisk = assessOutputIpRisk(payload.artifactContent);
  if (outputIpRisk.riskLevel !== 'low') {
    return blockedExportResult(outputIpRisk.riskLevel, outputIpRisk.matchedSignals);
  }
  return { ok: true, message: 'Markdown exported.', degradedToDemo: true };
}

export async function pushArtifactToWiki(payload: ArtifactExportPayload): Promise<ArtifactExportResult> {
  const outputIpRisk = assessOutputIpRisk(payload.artifactContent);
  if (outputIpRisk.riskLevel !== 'low') {
    return blockedExportResult(outputIpRisk.riskLevel, outputIpRisk.matchedSignals);
  }
  return { ok: true, message: 'Pushed to wiki queue.', degradedToDemo: true };
}
