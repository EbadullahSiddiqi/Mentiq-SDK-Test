// mentiq-sdk/src/conversion.ts
import Mentiq from "./index";

export function trackConversion(
  eventType: "trial_to_paid" | "upgrade" | "downgrade",
  metadata?: Record<string, any>
) {
  try {
    const sdk = Mentiq.getInstance();

    sdk.track("conversion", eventType, {
      ...metadata,
      timestamp: Date.now(),
    });

    console.log(`[Mentiq] Conversion tracked: ${eventType}`);
  } catch (err) {
    console.error("Failed to track conversion:", err);
  }
}
