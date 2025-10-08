// mentiq-sdk/src/index.ts
export interface MentiqConfig {
  apiKey: string;
  endpoint?: string; // Your backend API
}

export interface EventPayload {
  userId: string;
  type: string; // "event", "session", "feature", etc.
  name: string; // event name e.g. "login", "feature_used"
  properties?: Record<string, any>;
  timestamp: number;
}

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

  static init(config: MentiqConfig) {
    if (!Mentiq.instance) {
      Mentiq.instance = new Mentiq(config);
    }
    return Mentiq.instance;
  }

  static getInstance() {
    if (!Mentiq.instance) {
      throw new Error("Mentiq SDK not initialized!");
    }
    return Mentiq.instance;
  }

  identifyUser(userId: string, traits?: Record<string, any>) {
    this.userId = userId;
    const properties = {
      signupDate: traits?.signupDate || new Date().toISOString(),
      ...traits,
    };
    this.track("identify", "user_identified", properties);
  }

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
    this.flush(); // send immediately (later you can batch)
  }

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

export default Mentiq;
