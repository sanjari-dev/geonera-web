'use server';

/**
 * @fileOverview An AI agent that analyzes historical Forex data and generates predictions with reasoning.
 *
 * - analyzeInfluences - A function that handles the Forex data analysis and prediction process.
 * - AnalyzeInfluencesInput - The input type for the analyzeInfluences function.
 * - AnalyzeInfluencesOutput - The return type for the analyzeInfluences function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeInfluencesInputSchema = z.object({
  currencyPair: z
    .string()
    .describe('The currency pair to analyze (e.g., XAU/USD, BTC/USD).'),
  historicalData: z
    .string()
    .describe('Historical Forex data for the specified currency pair.'),
  marketNews: z
    .string()
    .describe('Recent market news and events that may affect the currency pair.'),
});
export type AnalyzeInfluencesInput = z.infer<typeof AnalyzeInfluencesInputSchema>;

const AnalyzeInfluencesOutputSchema = z.object({
  prediction: z.string().describe('The predicted exchange rate for the currency pair.'),
  reasoning: z
    .string()
    .describe('The AI’s reasoning behind the prediction, including influential factors.'),
});
export type AnalyzeInfluencesOutput = z.infer<typeof AnalyzeInfluencesOutputSchema>;

export async function analyzeInfluences(input: AnalyzeInfluencesInput): Promise<AnalyzeInfluencesOutput> {
  return analyzeInfluencesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeInfluencesPrompt',
  input: {schema: AnalyzeInfluencesInputSchema},
  output: {schema: AnalyzeInfluencesOutputSchema},
  prompt: `You are an expert Forex analyst specializing in predicting exchange rates.

You will analyze historical data and recent market news to generate a prediction for the specified currency pair.

In your reasoning, explain which pieces of information influenced the forecast and how they affected your prediction.

Currency Pair: {{{currencyPair}}}
Historical Data: {{{historicalData}}}
Market News: {{{marketNews}}}`,
});

const analyzeInfluencesFlow = ai.defineFlow(
  {
    name: 'analyzeInfluencesFlow',
    inputSchema: AnalyzeInfluencesInputSchema,
    outputSchema: AnalyzeInfluencesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
