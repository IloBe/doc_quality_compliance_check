// Compliance Mapping Request Client - API for requesting standard mappings

export interface StandardMappingRequestRecord {
  id: string;
  request_id?: string;
  standard_name: string;
  sop_reference: string;
  business_justification: string;
  requester_email: string;
  tenant_id?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface StandardMappingRequestInput {
  standard_name: string;
  sop_reference: string;
  business_justification: string;
  requester_email: string;
  tenant_id?: string;
  project_id?: string | null;
}

export async function fetchStandardMappingRequests(limit?: number): Promise<{ items: StandardMappingRequestRecord[]; degradedToDemo?: boolean }> {
  return Promise.resolve({ items: [], degradedToDemo: true });
}

export async function submitStandardMappingRequest(_payload: StandardMappingRequestInput): Promise<{ ok: boolean; message: string; record?: StandardMappingRequestRecord; degradedToDemo?: boolean }> {
  const now = new Date().toISOString();
  return { ok: true, message: 'Mapping request submitted.', record: { id: `cmr_${Date.now()}`, standard_name: _payload.standard_name, sop_reference: _payload.sop_reference, business_justification: _payload.business_justification, requester_email: _payload.requester_email, submitted_at: now }, degradedToDemo: true };
}

export async function submitComplianceMappingRequest(_payload: any): Promise<{ id: string }> {
  return { id: `cmr_${Date.now()}` };
}
