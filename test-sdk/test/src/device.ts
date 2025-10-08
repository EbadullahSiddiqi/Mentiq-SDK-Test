// mentiq-sdk/src/device.ts
import UAParser from "ua-parser-js";
import Mentiq from "./index";

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
