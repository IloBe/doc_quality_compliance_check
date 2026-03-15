// frontend/js/services/runMockApi.js
// Mocked service endpoints for Bridge Run happy-path demo

export function startRun(inputs) {
  // Simulate starting a run, always succeeds
  return Promise.resolve({
    runId: "run-001",
    status: "running",
    startedAt: new Date().toISOString(),
    inputs
  });
}

export function getRunStatus(runId) {
  // Simulate run status transitions
  // For demo, always returns 'done' after a short delay
  return Promise.resolve({
    runId,
    status: "done",
    completedAt: new Date().toISOString(),
    result: {
      artifactId: "artifact-001",
      verdict: "success",
      summary: "Bridge Run completed successfully."
    }
  });
}
