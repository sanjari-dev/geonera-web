import type { LucideIcon } from 'lucide-react';

export type CurrencyPair = "XAU/USD" | "BTC/USD"; // Add more as needed

export interface CurrencyOption {
  value: CurrencyPair;
  label: string;
  icon?: LucideIcon; // Corrected: LucideIcon is a type for the component itself
}

export type PipsTarget = number;

export type PredictionStatus = "IDLE" | "PENDING" | "SUCCESS" | "ERROR"; // Removed "EXPIRED"

// This will be the output structure from the modified AI flow
export interface PipsPredictionOutcome {
  outcome: string; // e.g., "Price expected to increase by ~15 pips.", "Likely to decrease, missing target.", "Neutral, no significant move towards target."
  reasoning: string;
}

// This will represent an item in our prediction log table
export interface PredictionLogItem {
  id: string;
  timestamp: Date;
  currencyPair: CurrencyPair;
  pipsTarget: PipsTarget;
  status: PredictionStatus;
  predictionOutcome?: PipsPredictionOutcome;
  error?: string;
  expiresAt?: Date;
}

// This will be the input for the modified AI flow
export interface AnalyzePipsInfluenceInput {
  currencyPair: CurrencyPair;
  pipsTarget: PipsTarget;
}

