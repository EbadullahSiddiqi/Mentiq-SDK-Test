import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { initMentiq, getMentiq, type MentiqClient, type MentiqConfig } from '../index';

const MentiqContext = createContext<MentiqClient | null>(null);

export interface MentiqProviderProps {
  config: MentiqConfig;
  children: React.ReactNode;
}

export function MentiqProvider({ config, children }: MentiqProviderProps) {
  const clientRef = useRef<MentiqClient | null>(null);
  if (!clientRef.current && typeof window !== 'undefined') {
    clientRef.current = initMentiq(config);
  }
  const value = useMemo(() => clientRef.current, [clientRef.current]);
  return <MentiqContext.Provider value={value}>{children}</MentiqContext.Provider>;
}

export function useMentiq(): MentiqClient {
  const ctx = useContext(MentiqContext) || getMentiq();
  if (!ctx) throw new Error('Mentiq not initialized. Wrap your app in <MentiqProvider>.');
  return ctx;
}

export function TrackPageView({ name }: { name?: string }) {
  const mentiq = useMentiq();
  useEffect(() => {
    mentiq.track(name || 'page_view');
  }, [mentiq, name]);
  return null;
}

