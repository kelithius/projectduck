'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export default function Home() {
  return (
    <I18nextProvider i18n={i18n}>
      <div style={{ height: '100vh' }}>
        <AppLayout />
      </div>
    </I18nextProvider>
  );
}
