// crypto.randomUUID() only exists in secure contexts (HTTPS or localhost) —
// it's undefined when this app is opened over plain http://<lan-ip>, e.g. from a phone.
export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
