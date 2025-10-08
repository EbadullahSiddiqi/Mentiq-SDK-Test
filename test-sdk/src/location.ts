// mentiq-sdk/src/location.ts
import Mentiq from "./index";

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
