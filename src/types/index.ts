import type { LucideIcon } from 'lucide-react';

export type CurrencyPair = "XAU/USD" | "BTC/USD" | "EUR/USD" | "GBP/USD" | "USD/JPY" | "AUD/USD" | "USD/CAD"; // Add more as needed

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
  currencyPair: CurrencyPair; // A single currency pair for this specific log item
  pipsTarget: PipsTargetRange;
  status: PredictionStatus;
  predictionOutcome?: PipsPredictionOutcome;
  error?: string;
  expiresAt?: Date;
}

// This will be the input for the AI flow (or mock generator)
export interface AnalyzePipsInfluenceInput {
  currencyPair: CurrencyPair; // AI or mock generator processes one pair at a time
  pipsTarget: PipsTargetRange;
}

export interface User {
  id: string;
  username: string;
  initials: string;
}

// Types for filtering and sorting
export type AllFilterType = "ALL";
export type StatusFilterType = PredictionStatus | AllFilterType;
export type SignalFilterType = PipsPredictionOutcome["tradingSignal"] | AllFilterType;

export type SortableColumnKey = 'status' | 'timestamp' | 'currencyPair' | 'pipsTargetMin' | 'tradingSignal' | 'expiresAt';

export interface SortConfig {
  key: SortableColumnKey;
  direction: 'asc' | 'desc';
}

export interface NotificationMessage {
  title: string;
  description: string;
  variant?: 'destructive' | 'default' | 'success';
}
