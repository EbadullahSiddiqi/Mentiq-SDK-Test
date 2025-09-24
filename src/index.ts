export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export interface MentiqConfig {
  apiKey: string;
  collectUrl: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  debug?: boolean;
  logLevel?: LogLevel;
  autoPageview?: boolean;
  captureClicks?: boolean;
  enablePersistence?: boolean;
}

export interface MentiqEvent {
  event: string;
  distinct_id?: string;
  session_id: string;
  timestamp: string;
  url?: string;
  properties?: Record<string, unknown>;
}

export interface MentiqPublicApi {
  init(config: Partial<MentiqConfig>): void;
  track(eventName: string, properties?: Record<string, unknown>): void;
  identify(distinctId: string): void;
  setSuperProperties(props: Record<string, unknown>): void;
  setUserProperties(props: Record<string, unknown>): void;
  reset(): void;
  optOut(): void;
  optIn(): void;
  flush(): void;
}

const DEFAULTS: Required<Pick<MentiqConfig, 'flushIntervalMs' | 'maxBatchSize' | 'autoPageview' | 'captureClicks' | 'enablePersistence' | 'logLevel'>> = {
  flushIntervalMs: 3000,
  maxBatchSize: 20,
  autoPageview: true,
  captureClicks: true,
  enablePersistence: true,
  logLevel: 'warn',
};

function isoNow(): string {
  return new Date().toISOString();
}

function safeParse<T>(json: string | null): T | null {
  try {
    return json ? (JSON.parse(json) as T) : null;
  } catch {
    return null;
  }
}

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getBestStorage(): { local: StorageLike; session: StorageLike } {
  const memory = new MemoryStorage();
  let local: StorageLike = memory;
  let session: StorageLike = memory;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('__m_t', '1');
      localStorage.removeItem('__m_t');
      local = localStorage;
    }
  } catch {}
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('__m_t', '1');
      sessionStorage.removeItem('__m_t');
      session = sessionStorage;
    }
  } catch {}
  return { local, session };
}

class Logger {
  constructor(private level: LogLevel) {}
  setLevel(level: LogLevel) {
    this.level = level;
  }
  private should(level: LogLevel): boolean {
    const order: LogLevel[] = ['silent', 'error', 'warn', 'info', 'debug'];
    return order.indexOf(level) <= order.indexOf(this.level);
  }
  error(...args: unknown[]) {
    if (this.should('error')) console.error('[mentiq]', ...args);
  }
  warn(...args: unknown[]) {
    if (this.should('warn')) console.warn('[mentiq]', ...args);
  }
  info(...args: unknown[]) {
    if (this.should('info')) console.info('[mentiq]', ...args);
  }
  debug(...args: unknown[]) {
    if (this.should('debug')) console.debug('[mentiq]', ...args);
  }
}

export class MentiqClient implements MentiqPublicApi {
  private config: MentiqConfig;
  private queue: MentiqEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionId: string;
  private distinctId?: string;
  private superProps: Record<string, unknown> = {};
  private userProps: Record<string, unknown> = {};
  private consent = { optedOut: false };
  private logger: Logger;
  private storage = getBestStorage();

  private keys = {
    session: '__mentiq_session',
    distinct: '__mentiq_distinct_id',
    superProps: '__mentiq_super_props',
    userProps: '__mentiq_user_props',
    consent: '__mentiq_consent',
  } as const;

  constructor(config: MentiqConfig) {
    const merged: MentiqConfig = {
      flushIntervalMs: DEFAULTS.flushIntervalMs,
      maxBatchSize: DEFAULTS.maxBatchSize,
      autoPageview: DEFAULTS.autoPageview,
      captureClicks: DEFAULTS.captureClicks,
      enablePersistence: DEFAULTS.enablePersistence,
      logLevel: DEFAULTS.logLevel,
      ...config,
    };
    this.config = merged;
    this.logger = new Logger(merged.debug ? 'debug' : merged.logLevel || 'warn');
    this.sessionId = this.loadOrCreateSession();
    this.loadPersistence();
    if (this.config.autoPageview) this.sendPageView();
    if (this.config.captureClicks) this.installClickListener();
    this.installVisibilityHandlers();
  }

  init(config: Partial<MentiqConfig>): void {
    this.config = { ...this.config, ...config };
    if (typeof config.logLevel !== 'undefined' || typeof config.debug !== 'undefined') {
      this.logger.setLevel(this.config.debug ? 'debug' : this.config.logLevel || 'warn');
    }
  }

  track(eventName: string, properties?: Record<string, unknown>): void {
    if (this.consent.optedOut) return;
    const payload: MentiqEvent = {
      event: eventName,
      distinct_id: this.distinctId,
      session_id: this.sessionId,
      timestamp: isoNow(),
      url: typeof location !== 'undefined' ? location.pathname + location.search : undefined,
      properties: { ...(this.config.enablePersistence ? this.superProps : {}), ...(properties || {}) },
    };
    this.queue.push(payload);
    this.logger.debug('queued', payload);
    if (this.queue.length >= (this.config.maxBatchSize || DEFAULTS.maxBatchSize)) this.flush();
    this.ensureFlushTimer();
  }

  identify(distinctId: string): void {
    this.distinctId = distinctId;
    if (this.config.enablePersistence) this.storage.local.setItem(this.keys.distinct, distinctId);
  }

  setSuperProperties(props: Record<string, unknown>): void {
    this.superProps = { ...this.superProps, ...props };
    if (this.config.enablePersistence)
      this.storage.local.setItem(this.keys.superProps, JSON.stringify(this.superProps));
  }

  setUserProperties(props: Record<string, unknown>): void {
    this.userProps = { ...this.userProps, ...props };
    if (this.config.enablePersistence)
      this.storage.local.setItem(this.keys.userProps, JSON.stringify(this.userProps));
  }

  reset(): void {
    this.distinctId = undefined;
    this.superProps = {};
    this.userProps = {};
    try {
      this.storage.local.removeItem(this.keys.distinct);
      this.storage.local.removeItem(this.keys.superProps);
      this.storage.local.removeItem(this.keys.userProps);
    } catch {}
  }

  optOut(): void {
    this.consent.optedOut = true;
    if (this.config.enablePersistence)
      this.storage.local.setItem(this.keys.consent, JSON.stringify(this.consent));
  }

  optIn(): void {
    this.consent.optedOut = false;
    if (this.config.enablePersistence)
      this.storage.local.setItem(this.keys.consent, JSON.stringify(this.consent));
  }

  flush(): void {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.config.maxBatchSize || DEFAULTS.maxBatchSize);
    const body = JSON.stringify({ apiKey: this.config.apiKey, events: batch, user: this.userProps });

    try {
      if (typeof document !== 'undefined' && typeof navigator !== 'undefined' &&
          (navigator as any).sendBeacon && document.visibilityState === 'hidden') {
        (navigator as any).sendBeacon(this.config.collectUrl, body);
        this.logger.info('flushed via beacon', batch.length);
        return;
      }
    } catch {}

    fetch(this.config.collectUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).then((res) => {
      this.logger.info('flushed', batch.length, 'status', res.status);
    }).catch((err) => {
      this.logger.warn('flush failed; requeueing', err);
      this.queue = batch.concat(this.queue);
    });
  }

  // Internal helpers
  private ensureFlushTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.config.flushIntervalMs || DEFAULTS.flushIntervalMs);
  }

  private loadOrCreateSession(): string {
    try {
      const existing = this.storage.session.getItem(this.keys.session);
      if (existing) return existing;
      const s = 's_' + Math.random().toString(36).slice(2, 11);
      this.storage.session.setItem(this.keys.session, s);
      return s;
    } catch {
      return 's_' + Math.random().toString(36).slice(2, 11);
    }
  }

  private loadPersistence() {
    if (!this.config.enablePersistence) return;
    const d = this.storage.local.getItem(this.keys.distinct);
    if (d) this.distinctId = d;
    this.superProps = safeParse<Record<string, unknown>>(this.storage.local.getItem(this.keys.superProps)) || {};
    this.userProps = safeParse<Record<string, unknown>>(this.storage.local.getItem(this.keys.userProps)) || {};
    this.consent = safeParse<{ optedOut: boolean }>(this.storage.local.getItem(this.keys.consent)) || { optedOut: false };
  }

  private sendPageView() {
    this.track('page_view', {
      title: typeof document !== 'undefined' ? document.title : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });
    // SPA support: detect route changes via popstate and hashchange
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => this.track('page_view'));
      window.addEventListener('hashchange', () => this.track('page_view'));
      // history.pushState interception
      try {
        const push = history.pushState;
        history.pushState = function (...args: any[]) {
          // @ts-ignore - call original
          const ret = push.apply(this, args as any);
          window.dispatchEvent(new Event('pushstate'));
          window.dispatchEvent(new Event('locationchange'));
          return ret;
        } as any;
        const replace = history.replaceState;
        history.replaceState = function (...args: any[]) {
          // @ts-ignore
          const ret = replace.apply(this, args as any);
          window.dispatchEvent(new Event('replacestate'));
          window.dispatchEvent(new Event('locationchange'));
          return ret;
        } as any;
        window.addEventListener('locationchange', () => this.track('page_view'));
      } catch {}
    }
  }

  private installClickListener() {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', (e) => {
      const target = e.target as Element | null;
      const el = (target && (target as any).closest) ? (target as any).closest('[data-mentiq-track]') : null;
      if (!el) return;
      const name = el.getAttribute('data-mentiq-track') || 'click';
      const props: Record<string, unknown> = {
        text: (el.textContent || '').trim().slice(0, 200),
        href: (el as HTMLAnchorElement).href || undefined,
        tag: el.tagName.toLowerCase(),
      };
      this.track(name, props);
    }, true);
  }

  private installVisibilityHandlers() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush();
      });
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }
}

let singleton: MentiqClient | null = null;

export function createMentiq(config: MentiqConfig): MentiqClient {
  return new MentiqClient(config);
}

export function getMentiq(): MentiqClient | null {
  return singleton;
}

export function initMentiq(config: MentiqConfig): MentiqClient {
  singleton = new MentiqClient(config);
  return singleton;
}

