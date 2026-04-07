'use client';

import React, { createContext, useContext } from 'react';

export type ConferenceConfig = {
  subdomain: string;
  name: string;
  logo: string;
  sessionLabel?: string;
  sourceId: string;
  isRepo: boolean;
};

const DEFAULT: ConferenceConfig = {
  subdomain: '',
  name: '1stCite',
  logo: '/1stcite-logo.png',
  sourceId: '1stcite',
  isRepo: false,
};

const ConferenceContext = createContext<ConferenceConfig>(DEFAULT);

export function ConferenceProvider({
  config,
  children,
}: {
  config: ConferenceConfig;
  children: React.ReactNode;
}) {
  return (
    <ConferenceContext.Provider value={config}>
      {children}
    </ConferenceContext.Provider>
  );
}

export function useConference() {
  return useContext(ConferenceContext);
}
