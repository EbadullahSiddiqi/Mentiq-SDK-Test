# Mentiq Analytics SDK Documentation

## Overview

Mentiq Analytics SDK is a lightweight client-side tracking library that helps you monitor product metrics like user engagement, feature adoption, conversions, churn, and revenue. It automatically captures device and location data while providing simple APIs for tracking custom events.

**Version:** 1.0.0

---

## Installation

First, install the SDK and its dependency:

```bash
npm install ua-parser-js
```

Then import the SDK into your project:

```typescript
import Mentiq, { 
  captureLocation, 
  captureDevice, 
  trackFeature,
  startSession,
  endSession,
  trackConversion,
  trackChurn,
  trackRevenue 
} from './mentiq-sdk';
```

---

## Quick Start

### 1. Initialize the SDK

Before using any tracking features, initialize Mentiq with your API key:

```typescript
Mentiq.init({
  apiKey: 'your-api-key-here',
  endpoint: 'https://api.mentiq.dev/collect' // Optional: defaults to this URL
});
```

### 2. Identify Your User

Every user must be identified before tracking events:

```typescript
const sdk = Mentiq.getInstance();
sdk.identifyUser('user-123', {
  email: 'user@example.com',
  name: 'John Doe',
  signupDate: '2025-01-15'
});
```

The `signupDate` is automatically set to the current date if not provided.

---

## Core Features

### 📍 Location Tracking

Automatically detect and track user location based on their IP address:

```typescript
const location = await captureLocation();
// Returns: { ip, country, region, city }
```

This function uses the ipapi.co service to get location data and automatically sends it to your analytics backend.

---

### 💻 Device Detection

Capture detailed device and browser information:

```typescript
const device = captureDevice();
// Returns: { os, browser, deviceType, userAgent }
```

Example output:
```json
{
  "os": "Windows 10",
  "browser": "Chrome 120.0",
  "deviceType": "desktop",
  "userAgent": "Mozilla/5.0..."
}
```

---

### 🎯 Feature Usage Tracking

Track when users interact with specific features:

```typescript
trackFeature('dashboard_viewed');

trackFeature('report_generated', {
  reportType: 'monthly',
  dataPoints: 150
});
```

Use this to understand which features are most popular and identify adoption patterns.

---

### ⏱️ Session Tracking

Monitor user engagement with automatic session management:

```typescript
// Start a session when user logs in or page loads
startSession();

// Record activity on user interactions (clicks, scrolls, etc.)
document.addEventListener('click', recordActivity);
document.addEventListener('keypress', recordActivity);

// Manually end session (e.g., on logout)
endSession('logout');
```

**Session Behavior:**
- Sessions automatically timeout after 30 minutes of inactivity
- Duration is calculated in seconds
- Each session tracks start time, end time, and reason for ending

---

### 💰 Conversion Tracking

Track important user milestones:

```typescript
// User upgrades from trial to paid
trackConversion('trial_to_paid', {
  plan: 'Pro',
  amount: 29.99
});

// User upgrades their plan
trackConversion('upgrade', {
  fromPlan: 'Basic',
  toPlan: 'Premium'
});

// User downgrades
trackConversion('downgrade', {
  fromPlan: 'Premium',
  toPlan: 'Basic',
  reason: 'cost'
});
```

---

### 📉 Churn Tracking

Record when and why users leave:

```typescript
trackChurn('price_too_high', {
  lastPlan: 'Pro',
  subscriptionDuration: 90 // days
});

trackChurn('switched_to_competitor', {
  competitor: 'CompetitorX',
  feedback: 'Better features'
});
```

---

### 💵 Revenue Tracking

Track all revenue-related events:

```typescript
// New subscription
trackRevenue('new', {
  amount: 29.99,
  currency: 'USD',
  plan: 'Pro',
  interval: 'monthly'
});

// Plan upgrade
trackRevenue('upgrade', {
  amount: 49.99,
  currency: 'USD',
  plan: 'Premium',
  interval: 'yearly',
  metadata: {
    previousPlan: 'Pro'
  }
});

// Cancellation
trackRevenue('cancel', {
  amount: 0,
  currency: 'USD',
  plan: 'Pro',
  metadata: {
    reason: 'No longer needed'
  }
});
```

---

## Complete Integration Example

Here's a full example showing how to integrate Mentiq into a React application:

```typescript
import { useEffect } from 'react';
import Mentiq, { 
  captureLocation, 
  captureDevice, 
  startSession,
  endSession,
  trackFeature,
  trackConversion
} from './mentiq-sdk';

function App() {
  useEffect(() => {
    // 1. Initialize SDK
    Mentiq.init({
      apiKey: process.env.REACT_APP_MENTIQ_KEY
    });

    // 2. Identify user (e.g., after login)
    const sdk = Mentiq.getInstance();
    sdk.identifyUser('user-456', {
      email: 'jane@example.com',
      plan: 'Pro'
    });

    // 3. Capture context
    captureDevice();
    captureLocation();

    // 4. Start session tracking
    startSession();

    // 5. Track activity
    const trackActivity = () => recordActivity();
    window.addEventListener('click', trackActivity);
    window.addEventListener('keypress', trackActivity);

    // 6. Cleanup on unmount
    return () => {
      endSession('page_unload');
      window.removeEventListener('click', trackActivity);
      window.removeEventListener('keypress', trackActivity);
    };
  }, []);

  const handleUpgrade = () => {
    trackConversion('upgrade', { newPlan: 'Premium' });
    trackRevenue('upgrade', {
      amount: 49.99,
      currency: 'USD',
      plan: 'Premium',
      interval: 'monthly'
    });
  };

  const handleFeatureUse = () => {
    trackFeature('export_data', { format: 'CSV' });
  };

  return (
    <div>
      <button onClick={handleUpgrade}>Upgrade to Premium</button>
      <button onClick={handleFeatureUse}>Export Data</button>
    </div>
  );
}

export default App;
```

---

## How It Works

### Event Queue System

All events are queued and sent to your backend in batches:

1. When you call any tracking function, an event is created with:
   - `userId`: The identified user
   - `type`: Event category (session, feature, conversion, etc.)
   - `name`: Specific event name
   - `properties`: Additional metadata
   - `timestamp`: When the event occurred

2. Events are automatically sent to your backend via POST request
3. Failed requests are logged to the console

### Authentication

All requests include your API key in the Authorization header:

```
Authorization: Bearer your-api-key-here
```

---

## Best Practices

1. **Initialize Early**: Call `Mentiq.init()` as soon as your app loads
2. **Identify Once**: Call `identifyUser()` after authentication, not on every page
3. **Track Meaningful Events**: Don't over-track; focus on events that impact business metrics
4. **Use Metadata**: Add context to events with the metadata parameter
5. **Handle Sessions**: Always call `startSession()` and `endSession()` appropriately
6. **Secure Your API Key**: Never expose your API key in public repositories

---

## Error Handling

The SDK includes built-in error handling:

- If SDK is not initialized, functions throw an error
- Network failures are logged to console but don't break your app
- All tracking functions wrap operations in try-catch blocks

---

## Support

For issues or questions, consult your backend API documentation at `https://api.mentiq.dev/docs` or contact support.
