// src/app/page.tsx
"use client";

import { useState, useCallback } from 'react';
import { AppHeader } from '@/components/forex-prophet/header';
import { PredictionForm } from '@/components/forex-prophet/prediction-form';
import { PredictionDisplay } from '@/components/forex-prophet/prediction-display';
import type { PredictionData, CurrencyPair } from '@/types';

export interface FormState {
  currency: CurrencyPair;
  prediction?: PredictionData | null;
  loading?: boolean;
  error?: string | null;
}

export default function ForexProphetPage() { // Renamed from ForexProphetPageFinal to ForexProphetPage as per convention for page.tsx
  const [formState, setFormState] = useState<FormState>({
    currency: "XAU/USD", // Default initial currency
    loading: false,
    prediction: null,
    error: null,
  });

  const handleStateChange = useCallback((newState: Partial<FormState>) => {
    // When loading starts, clear previous prediction and error
    if (newState.loading && !newState.prediction && !newState.error) {
      setFormState(prev => ({ ...prev, ...newState, prediction: null, error: null }));
    } else {
      setFormState(prev => ({ ...prev, ...newState }));
    }
  }, []);
  

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-10">
            <PredictionForm
              initialCurrency={formState.currency}
              onStateChange={handleStateChange}
            />
            <PredictionDisplay
              predictionData={formState.prediction || null}
              isLoading={formState.loading || false}
              error={formState.error || null}
              selectedCurrency={formState.currency}
            />
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} Forex Prophet. All rights reserved. AI predictions are for informational purposes only.
      </footer>
    </div>
  );
}
