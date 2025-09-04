export function uploadPrefix(uid: string, jobId: string) {
  return `uta-uploads/users/${uid}/jobs/${jobId}`
}

export function resultPrefix(uid: string, jobId: string) {
  return `uta-results/users/${uid}/jobs/${jobId}`
}

