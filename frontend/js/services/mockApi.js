// frontend/js/services/mockApi.js
// Mocked service endpoints for happy path acceptance tests and unit tests

export function analyzeDocument(content, filename, type) {
  return Promise.resolve({
    document_id: "doc-123",
    docType: type || "arc42",
    status: "Complete",
    score: 95,
    sections: [
      { name: "Introduction", present: true },
      { name: "Risks", present: false }
    ],
    issues: ["Missing risk section"],
    recommendations: ["Add risk assessment"],
    umlDiagrams: ["Class Diagram"]
  });
}

export function checkCompliance(domain, description, usesAiMl, intendedUse) {
  return Promise.resolve({
    compliance_check_id: "comp-456",
    riskLevel: "HIGH",
    role: "PROVIDER",
    complianceScore: 67,
    requirements: [
      { id: "EUAIA-1", title: "Data Quality", met: true },
      { id: "EUAIA-2", title: "Transparency", met: false }
    ],
    gaps: ["Transparency"],
    metRequirements: ["Data Quality"],
    applicableRegs: ["EU AI Act"]
  });
}

export function loadTemplates() {
  return Promise.resolve([
    { id: "business_goals", title: "Business and Product Goals", content: "# Goals", active: true },
    { id: "risk_assessment", title: "Risk Assessment", content: "# Risks", active: true }
  ]);
}

export function generateReport(reportData) {
  return Promise.resolve({ reportId: "rep-789", status: "Ready", url: "/mock/report.pdf" });
}

export function getStats() {
  return Promise.resolve({
    totalDocs: 12,
    avgScore: 88.5,
    lowRisk: 5,
    mediumRisk: 4,
    highRisk: 3
  });
}

export function submitReview(reviewData) {
  return Promise.resolve({ reviewId: "rev-101", status: "Submitted" });
}
