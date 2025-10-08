# Mentiq SDK

Production-ready TypeScript SDK for Mentiq frontend analytics focused on retention and churn insights.

Highlights:
- Automatic sessions with inactivity timeout (`session_start`/`session_end`).
- Context enrichment: locale, userAgent, deviceType, os, and UTM.
- Auto pageviews and click capture via `data-mentiq-track`.
- Helpers for feature adoption and billing lifecycle events.
- Lightweight plugin hooks to mutate/drop events and observe flush results.

Quick start (vanilla):
```html
<script type="module">
  import { initMentiq } from 'mentiq-sdk';
  const mentiq = initMentiq({
    apiKey: 'dev_key',
    collectUrl: 'http://localhost:4000/collect',
    sessionTimeoutMs: 30*60*1000,
  });
  mentiq.track('app_loaded');
  mentiq.trackFeatureAdoption('Feature A');
  mentiq.trackBilling('trial_started', { plan: 'basic' });
</script>
```

React/Next.js setup and full API examples are in `INTEGRATION_GUIDE.md`.

Local testing:
1. Start the demo collector: `cd server && npm install && npm start` (listens on `http://localhost:4000`).
2. In another shell, build the SDK: `npm install && npm run build`.
3. Open `test-frontend/index.html` in a browser and inspect the collector logs.

License: MIT