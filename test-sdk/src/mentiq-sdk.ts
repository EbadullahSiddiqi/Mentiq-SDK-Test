// ============================
// MENTIQ ANALYTICS SDK (Client)
// ============================
//
// This SDK tracks product metrics for retention, churn, and revenue analysis.
// Features: Initialization, Event Tracking, Location, Device, Feature Adoption,
// Engagement (Sessions), Retention, Conversion, Churn, and Revenue.
//
// ============================
//  Version: 1.0.0
// ============================

import UAParser from "ua-parser-js";

// ===============
// Core Interfaces
// ===============

interface MentiqConfig {
  apiKey: string;
  endpoint?: string; // Backend endpoint
}

interface EventPayload {
  userId: string;
  type: string; // e.g. "event", "session", "feature"
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

// =================
// Mentiq Core Class
// =================

class Mentiq {
  private static instance: Mentiq;
  private apiKey: string;
  private endpoint: string;
  private userId?: string;
  private queue: EventPayload[] = [];

  private constructor(config: MentiqConfig) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || "https://api.mentiq.dev/collect";
  }

  // Initialize SDK
  static init(config: MentiqConfig) {
    if (!Mentiq.instance) {
      Mentiq.instance = new Mentiq(config);
    }
    return Mentiq.instance;
  }

  // Get instance
  static getInstance() {
    if (!Mentiq.instance) {
      throw new Error("Mentiq SDK not initialized!");
    }
    return Mentiq.instance;
  }

  // Identify a user (used for retention and churn tracking)
  identifyUser(userId: string, traits?: Record<string, any>) {
    this.userId = userId;
    const properties = {
      signupDate: traits?.signupDate || new Date().toISOString(),
      ...traits,
    };
    this.track("identify", "user_identified", properties);
  }

  // Core track method (used by all features)
  track(type: string, name: string, properties?: Record<string, any>) {
    if (!this.userId) throw new Error("User not identified yet!");
    const event: EventPayload = {
      userId: this.userId,
      type,
      name,
      properties,
      timestamp: Date.now(),
    };
    this.queue.push(event);
    this.flush();
  }

  // Send events to backend
  private async flush() {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(this.queue),
      });
      this.queue = [];
    } catch (err) {
      console.error("Mentiq flush failed:", err);
    }
  }
}

// =====================
// Feature 1: Location
// =====================

export async function captureLocation() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();

    const location = {
      ip: data.ip,
      country: data.country_name,
      region: data.region,
      city: data.city,
    };

    const sdk = Mentiq.getInstance();
    sdk.track("context", "location_detected", location);

    return location;
  } catch (err) {
    console.error("Failed to capture location:", err);
    return null;
  }
}

// ===================
// Feature 2: Device
// ===================

export function captureDevice() {
  try {
    const parser = new UAParser();
    const result = parser.getResult();

    const deviceInfo = {
      os: result.os.name + " " + (result.os.version || ""),
      browser: result.browser.name + " " + (result.browser.version || ""),
      deviceType: result.device.type || "desktop",
      userAgent: result.ua,
    };

    const sdk = Mentiq.getInstance();
    sdk.track("context", "device_detected", deviceInfo);

    return deviceInfo;
  } catch (err) {
    console.error("Failed to capture device:", err);
    return null;
  }
}

// =========================
// Feature 3: Feature Usage
// =========================

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

// ==========================
// Feature 4: Session / Engagement
// ==========================

let sessionActive = false;
let sessionStartTime: number;
let sessionTimeout: NodeJS.Timeout;

export function startSession() {
  if (sessionActive) return;
  sessionActive = true;
  sessionStartTime = Date.now();

  const sdk = Mentiq.getInstance();
  sdk.track("session", "session_started", { startTime: sessionStartTime });

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
  }, 30 * 60 * 1000);
}

// =========================
// Feature 6: Conversions
// =========================

export function trackConversion(
  eventType: "trial_to_paid" | "upgrade" | "downgrade",
  metadata?: Record<string, any>
) {
  try {
    const sdk = Mentiq.getInstance();
    sdk.track("conversion", eventType, { ...metadata, timestamp: Date.now() });
    console.log(`[Mentiq] Conversion tracked: ${eventType}`);
  } catch (err) {
    console.error("Failed to track conversion:", err);
  }
}

// =========================
// Feature 7: Churn Tracking
// =========================

export function trackChurn(reason: string, metadata?: Record<string, any>) {
  try {
    const sdk = Mentiq.getInstance();

    sdk.track("churn", "customer_churned", {
      reason,
      ...metadata,
      timestamp: Date.now(),
    });

    console.log(`[Mentiq] Churn recorded: ${reason}`);
  } catch (err) {
    console.error("Failed to track churn:", err);
  }
}

// ========================
// Feature 8: Revenue
// ========================

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

    console.log(
      `[Mentiq] Revenue event: ${eventType} (${data.amount} ${data.currency})`
    );
  } catch (err) {
    console.error("Failed to track revenue:", err);
  }
}

// =======================
// Exports
// =======================

export default Mentiq;
