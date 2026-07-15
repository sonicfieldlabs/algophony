/**
 * Process-wide concurrency gate for Playground endpoints.
 * Caps in-flight Python subprocesses so a single user can't fork-bomb the dev server.
 */

const MAX_IN_FLIGHT = Number(process.env.ALGOPHONY_PLAYGROUND_MAX_CONCURRENT) || 2;
let inFlight = 0;

export function tryAcquireStudioSlot(): boolean {
  if (inFlight >= MAX_IN_FLIGHT) return false;
  inFlight += 1;
  return true;
}

export function releaseStudioSlot(): void {
  if (inFlight > 0) inFlight -= 1;
}
