## Mentiq SDK Integration Guide (React / Next.js)

### 1) Install

```bash
npm install mentiq-sdk
```

### 2) Initialize in your app

Wrap your app with the provider and pass your API key and collector URL.

```tsx
import { MentiqProvider } from 'mentiq-sdk/react';

export default function App({ children }) {
  return (
    <MentiqProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_MENTIQ_KEY!,
        collectUrl: process.env.NEXT_PUBLIC_MENTIQ_URL!,
        debug: false,
      }}
    >
      {children}
    </MentiqProvider>
  );
}
```

For Next.js 13+ App Router, place provider in `app/layout.tsx`.

### 3) Track events

```tsx
import { useMentiq } from 'mentiq-sdk/react';

export function UpgradeButton() {
  const mentiq = useMentiq();
  return (
    <button onClick={() => mentiq.track('upgrade_clicked', { plan: 'pro' })}>
      Upgrade
    </button>
  );
}
```

You can also tag elements with `data-mentiq-track` and clicks will be captured automatically.

```tsx
<a href="/pricing" data-mentiq-track="pricing_click">Pricing</a>
```

### 4) Identify users

```tsx
const mentiq = useMentiq();
mentiq.identify(user.id);
mentiq.setUserProperties({ email: user.email, name: user.name });
```

### 5) Super properties

```tsx
const mentiq = useMentiq();
mentiq.setSuperProperties({ appVersion: '1.2.3', locale: 'en-US' });
```

### 6) Consent and reset

```tsx
mentiq.optOut(); // stop tracking
mentiq.optIn();  // resume tracking
mentiq.reset();  // clear identity and super props
```

### 7) SPA routing

Page views are sent automatically on load and whenever the URL changes via History API, `popstate`, or `hashchange`. You can also send manual page events using the optional component:

```tsx
import { TrackPageView } from 'mentiq-sdk/react';
<TrackPageView name="dashboard_view" />
```

### 8) Server endpoint

The SDK posts to your collector at `collectUrl` with JSON body:

```json
{
  "apiKey": "<string>",
  "events": [
    {
      "event": "page_view",
      "distinct_id": "user_123",
      "session_id": "s_abcd",
      "timestamp": "2025-01-01T00:00:00.000Z",
      "url": "/path?query",
      "properties": { "title": "Home" }
    }
  ],
  "user": { "email": "alice@example.com" }
}
```

Use the provided demo collector in `server/collector.js` during local development (`npm run start` inside `server`).

### 9) Configuration options

- **apiKey**: required
- **collectUrl**: required
- **flushIntervalMs**: default 3000
- **maxBatchSize**: default 20
- **autoPageview**: send page views automatically (default true)
- **captureClicks**: capture `data-mentiq-track` clicks (default true)
- **enablePersistence**: use local/session storage (default true)
- **debug / logLevel**: debug prints or set `error|warn|info|debug`

### 10) SSR safety

The SDK checks for `window`/`document` before accessing browser APIs. Initialize in client components or guards to avoid SSR hazards.


