// mentiq-sdk/src/feature.ts
import Mentiq from "./index";

export function trackFeature(
  featureName: string,
  metadata?: Record<string, any>
) {
  try {
    const sdk = Mentiq.getInstance();

    sdk.track("feature", featureName, {
      ...metadata,
      timestamp: Date.now(),
    });

    console.log(`[Mentiq] Feature tracked: ${featureName}`);
  } catch (err) {
    console.error("Failed to track feature:", err);
  }
}
