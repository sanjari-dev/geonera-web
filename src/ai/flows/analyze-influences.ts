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


const AnalyzePipsInfluenceInputSchema = z.object({
  currencyPair: z
    .string()
    .describe('The currency pair to analyze (e.g., XAU/USD, BTC/USD).'),
  pipsTarget: z
    .number()
    .describe('The target number of pips for the prediction (e.g., 10, 20).'),
});

const PipsPredictionOutcomeSchema = z.object({
  outcome: z
    .string()
    .describe(
      'The predicted outcome regarding the pips target (e.g., "Price expected to increase by at least X pips.", "Unlikely to reach X pips target.", "Price may consolidate, not hitting the target.").'
    ),
  reasoning: z
    .string()
    .describe(
      'The AI’s reasoning behind the prediction, including influential factors and analysis towards the pips target.'
    ),
});

// Exporting the function that calls the flow
export async function analyzePipsInfluence(input: AnalyzePipsInfluenceInput): Promise<PipsPredictionOutcome> {
  return analyzePipsInfluenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePipsInfluencePrompt',
  input: {schema: AnalyzePipsInfluenceInputSchema},
  output: {schema: PipsPredictionOutcomeSchema},
  prompt: `You are an expert Forex analyst. Your task is to predict whether the price of {{{currencyPair}}} will move by at least {{{pipsTarget}}} pips in the short term (next 1-15 minutes), based on current market conditions and general knowledge of this currency pair.

Currency Pair: {{{currencyPair}}}
Target Pips: {{{pipsTarget}}}

Analyze current market sentiment and typical behavior for this pair and provide:
1.  'outcome': A clear statement on whether the {{{pipsTarget}}} pips movement is likely (e.g., "Likely to increase by at least {{{pipsTarget}}} pips", "Unlikely to reach {{{pipsTarget}}} pips, may decrease", "Neutral, price consolidation expected below {{{pipsTarget}}} pips movement").
2.  'reasoning': A detailed explanation for your prediction, highlighting key factors and typical price patterns that support your conclusion regarding the pips target.
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

