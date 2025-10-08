// mentiq-sdk/src/session.ts
import Mentiq from "./index";

let sessionActive = false;
let sessionStartTime: number;
let sessionTimeout: NodeJS.Timeout;

export function startSession() {
  if (sessionActive) return;
  sessionActive = true;
  sessionStartTime = Date.now();

  const sdk = Mentiq.getInstance();
  sdk.track("session", "session_started", { startTime: sessionStartTime });

  // Auto-end after 30 minutes of inactivity
  resetInactivityTimer();
  console.log("[Mentiq] Session started");
}

export function recordActivity() {
  if (!sessionActive) return;
  resetInactivityTimer();
}

export function endSession(reason: string = "manual") {
  if (!sessionActive) return;
  sessionActive = false;
  clearTimeout(sessionTimeout);

  const endTime = Date.now();
  const duration = Math.round((endTime - sessionStartTime) / 1000); // in seconds

  const sdk = Mentiq.getInstance();
  sdk.track("session", "session_ended", {
    startTime: sessionStartTime,
    endTime,
    duration,
    reason,
  });

  console.log(`[Mentiq] Session ended (${duration}s)`);
}

function resetInactivityTimer() {
  clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(() => {
    console.log("[Mentiq] Session timed out due to inactivity");
    endSession("inactivity");
  }, 30 * 60 * 1000); // 30 minutes
}
