
'use server';

/**
 * @fileOverview An AI agent that analyzes market conditions
 * to predict if a currency pair will move by a target number of pips.
 *
 * - analyzePipsInfluence - A function that handles the Forex data analysis and pips-based prediction.
 * - AnalyzePipsInfluenceInput - The input type for the analyzePipsInfluence function.
 * - PipsPredictionOutcome - The return type, detailing the predicted outcome and reasoning.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AnalyzePipsInfluenceInput, PipsPredictionOutcome } from '@/types';


const PipsRangeSchema = z.object({
  min: z.number().describe('The minimum target number of pips for the prediction (e.g., 5, 10).'),
  max: z.number().describe('The maximum target number of pips for the prediction (e.g., 10, 20).')
});

const AnalyzePipsInfluenceInputSchema = z.object({
  currencyPair: z
    .string()
    .describe('The currency pair to analyze (e.g., XAU/USD, BTC/USD).'),
  pipsSettings: z.object({
    profitPips: PipsRangeSchema.describe('The target profit pips range for the prediction.'),
    lossPips: PipsRangeSchema.describe('The acceptable loss pips range for the prediction.')
  }).describe('The PIPS settings including profit and loss ranges.'),
});

const PipsPredictionOutcomeSchema = z.object({
  tradingSignal: z
    .enum(["BUY", "SELL", "HOLD", "WAIT", "N/A"])
    .describe('The trading signal (e.g., BUY, SELL, HOLD, WAIT, N/A).'),
  signalDetails: z
    .string()
    .describe(
      'Detailed information about the signal, e.g., "Price expected to increase by at least X pips.", "Unlikely to reach X pips target."'
    ),
  reasoning: z
    .string()
    .describe(
      'The AI’s reasoning behind the prediction, including influential factors and analysis.'
    ),
    openPrice: z.number().optional().describe('The opening price for the period considered.'),
    closePrice: z.number().optional().describe('The closing price for the period considered.'),
    highPrice: z.number().optional().describe('The highest price for the period considered.'),
    lowPrice: z.number().optional().describe('The lowest price for the period considered.'),
    volume: z.number().optional().describe('The trading volume for the period considered.'),
});

// Exporting the function that calls the flow
export async function analyzePipsInfluence(input: AnalyzePipsInfluenceInput): Promise<PipsPredictionOutcome> {
  return analyzePipsInfluenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePipsInfluencePrompt',
  input: {schema: AnalyzePipsInfluenceInputSchema},
  output: {schema: PipsPredictionOutcomeSchema},
  prompt: `You are an expert Forex analyst. Your task is to predict whether the price of {{{currencyPair}}} will move significantly in the short term (next 1-15 minutes), considering both potential profit and loss, based on current market conditions and general knowledge of this currency pair.

Currency Pair: {{{currencyPair}}}
Profit PIPS Target Range: {{{pipsSettings.profitPips.min}}} - {{{pipsSettings.profitPips.max}}}
Loss PIPS Target Range: {{{pipsSettings.lossPips.min}}} - {{{pipsSettings.lossPips.max}}}

Analyze current market sentiment and typical behavior for this pair and provide:
1.  'tradingSignal': A trading signal (BUY, SELL, HOLD, WAIT, N/A) based on whether the minimum profit pips movement ({{{pipsSettings.profitPips.min}}}) is likely, while also considering the loss pips range ({{{pipsSettings.lossPips.min}}}).
2.  'signalDetails': A clear statement describing the expected price movement in relation to both profit and loss pips ranges (e.g., "Likely to increase by at least {{{pipsSettings.profitPips.min}}} pips, potentially reaching {{{pipsSettings.profitPips.max}}} pips, while staying above typical loss of {{{pipsSettings.lossPips.min}}} pips.", "Unlikely to reach {{{pipsSettings.profitPips.min}}} profit pips, may consolidate or risk hitting {{{pipsSettings.lossPips.min}}} loss pips.").
3.  'reasoning': A detailed explanation for your prediction, highlighting key factors and typical price patterns that support your conclusion regarding the pips target ranges and the trading signal.
4.  Optionally, include 'openPrice', 'closePrice', 'highPrice', 'lowPrice', and 'volume' if relevant market data influenced your decision.
`,
});

const analyzePipsInfluenceFlow = ai.defineFlow(
  {
    name: 'analyzePipsInfluenceFlow',
    inputSchema: AnalyzePipsInfluenceInputSchema,
    outputSchema: PipsPredictionOutcomeSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI model did not return a valid output.");
    }
    return output;
  }
);
