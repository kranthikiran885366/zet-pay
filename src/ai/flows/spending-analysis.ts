'use server';

/**
 * @fileOverview AI-powered spending analysis flow.
 *
 * - analyzeSpending - Analyzes user spending patterns and provides insights.
 * - AnalyzeSpendingInput - The input type for the analyzeSpending function.
 * - AnalyzeSpendingOutput - The return type for the analyzeSpending function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeSpendingInputSchema = z.object({
  transactionHistory: z
    .string()
    .describe('A JSON string representing the user transaction history.'),
  userPreferences: z
    .string()
    .optional()
    .describe('A JSON string representing user preferences for spending analysis, optional.'),
});
export type AnalyzeSpendingInput = z.infer<typeof AnalyzeSpendingInputSchema>;

const AnalyzeSpendingOutputSchema = z.object({
  summary: z.string().describe('A summary of the user spending patterns.'),
  insights: z.string().describe('Key insights into the user spending habits.'),
  recommendations: z
    .string()
    .describe('Personalized recommendations for better financial management.'),
});
export type AnalyzeSpendingOutput = z.infer<typeof AnalyzeSpendingOutputSchema>;

export async function analyzeSpending(input: AnalyzeSpendingInput): Promise<AnalyzeSpendingOutput> {
  return analyzeSpendingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSpendingPrompt',
  input: {
    schema: z.object({
      transactionHistory: z
        .string()
        .describe('A JSON string representing the user transaction history.'),
      userPreferences: z
        .string()
        .optional()
        .describe('A JSON string representing user preferences for spending analysis, optional.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A summary of the user spending patterns.'),
      insights: z.string().describe('Key insights into the user spending habits.'),
      recommendations: z
        .string()
        .describe('Personalized recommendations for better financial management.'),
    }),
  },
  prompt: `You are a personal finance advisor. Analyze the user's spending history and provide a summary, key insights, and personalized recommendations.

Transaction History: {{{transactionHistory}}}

User Preferences (Optional): {{{userPreferences}}}

Summary:
Insights:
Recommendations: `,
});

const analyzeSpendingFlow = ai.defineFlow<
  typeof AnalyzeSpendingInputSchema,
  typeof AnalyzeSpendingOutputSchema
>({
  name: 'analyzeSpendingFlow',
  inputSchema: AnalyzeSpendingInputSchema,
  outputSchema: AnalyzeSpendingOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
