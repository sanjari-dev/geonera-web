import type { LucideIcon } from 'lucide-react';

export type CurrencyPair = "XAU/USD" | "BTC/USD"; // Add more as needed

export interface CurrencyOption {
  value: CurrencyPair;
  label: string;
  icon?: LucideIcon;
}

export type PipsTargetValue = number;
export type PipsTargetRange = {
  min: PipsTargetValue;
  max: PipsTargetValue;
};

export type PredictionStatus = "IDLE" | "PENDING" | "SUCCESS" | "ERROR";

// This will be the output structure from the AI flow or mock generator
export interface PipsPredictionOutcome {
  tradingSignal: "BUY" | "SELL" | "HOLD" | "WAIT" | "N/A"; // For "Buy/Sell/etc (MT5)" column
  signalDetails: string; // Descriptive outcome, e.g., "Price expected to increase by ~15 pips."
  reasoning: string; // AI's reasoning or mock data reasoning
  openPrice?: number;
  closePrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
}

// This will represent an item in our prediction log table
export interface PredictionLogItem {
  id: string;
  timestamp: Date;
  currencyPair: CurrencyPair;
  pipsTarget: PipsTargetRange; // Updated to PipsTargetRange
  status: PredictionStatus;
  predictionOutcome?: PipsPredictionOutcome;
  error?: string;
  expiresAt?: Date;
}

// This will be the input for the AI flow
export interface AnalyzePipsInfluenceInput {
  currencyPair: CurrencyPair;
  pipsTarget: PipsTargetRange; // Updated to PipsTargetRange
}

