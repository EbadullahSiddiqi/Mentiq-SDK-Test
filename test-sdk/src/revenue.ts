// mentiq-sdk/src/revenue.ts
import Mentiq from "./index";

export function trackRevenue(
  eventType: "new" | "upgrade" | "downgrade" | "cancel",
  data: {
    amount: number;
    currency: string;
    plan: string;
    interval?: "monthly" | "yearly";
    metadata?: Record<string, any>;
  }
) {
  try {
    const sdk = Mentiq.getInstance();

    sdk.track("revenue", eventType, {
      amount: data.amount,
      currency: data.currency,
      plan: data.plan,
      interval: data.interval || "monthly",
      ...data.metadata,
      timestamp: Date.now(),
    });

    console.log(`[Mentiq] Revenue event tracked: ${eventType}`);
  } catch (err) {
    console.error("Failed to track revenue:", err);
  }
}
