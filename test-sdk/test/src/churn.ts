// mentiq-sdk/src/churn.ts
import Mentiq from "./index";

/**
 * Track explicit churn events (e.g., user cancels subscription)
 */
export function trackChurn(reason: string, metadata?: Record<string, any>) {
  try {
    const sdk = Mentiq.getInstance();

    sdk.track("churn", "customer_churned", {
      reason,
      ...metadata,
      timestamp: Date.now(),
    });

    console.log(`[Mentiq] Churn event recorded: ${reason}`);
  } catch (err) {
    console.error("Failed to track churn:", err);
  }
}
