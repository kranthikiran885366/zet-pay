'use server';

/**
 * @fileOverview Implements the Smart Payee Suggestion feature using Genkit.
 *
 * This file defines a Genkit flow that suggests frequent contacts for faster payment initiation.
 * It exports:
 * - `suggestFrequentContacts`: A function to trigger the suggestion flow.
 * - `SmartPayeeSuggestionInput`: The input type for the suggestion flow.
 * - `SmartPayeeSuggestionOutput`: The output type for the suggestion flow.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SmartPayeeSuggestionInputSchema = z.object({
  userId: z.string().describe('The ID of the user initiating the payment.'),
  recentContacts: z
    .array(z.string())
    .describe('A list of recently contacted user IDs.'),
});
export type SmartPayeeSuggestionInput = z.infer<typeof SmartPayeeSuggestionInputSchema>;

const SmartPayeeSuggestionOutputSchema = z.object({
  suggestedContacts: z
    .array(z.string())
    .describe('A list of suggested contact IDs based on frequency.'),
});
export type SmartPayeeSuggestionOutput = z.infer<typeof SmartPayeeSuggestionOutputSchema>;

export async function suggestFrequentContacts(
  input: SmartPayeeSuggestionInput
): Promise<SmartPayeeSuggestionOutput> {
  return smartPayeeSuggestionFlow(input);
}

const smartPayeeSuggestionPrompt = ai.definePrompt({
  name: 'smartPayeeSuggestionPrompt',
  input: {
    schema: z.object({
      userId: z.string().describe('The ID of the user initiating the payment.'),
      recentContacts: z
        .array(z.string())
        .describe('A list of recently contacted user IDs.'),
    }),
  },
  output: {
    schema: z.object({
      suggestedContacts: z
        .array(z.string())
        .describe('A list of suggested contact IDs based on frequency.'),
    }),
  },
  prompt: `You are a payment assistant that suggests frequent contacts for quicker payment initiation.

  Given the user ID: {{{userId}}} and their recent contacts: {{{recentContacts}}},
  suggest contacts that the user is likely to pay frequently. Sort them by frequency of payments.
  Return a list of user IDs in the suggestedContacts field.
  If recentContacts is empty, return an empty array.
  Do not include the user ID in the suggested contacts.
  Only return user IDs from the recentContacts list.
  Limit the number of suggested contacts to 5.
  `,
});

const smartPayeeSuggestionFlow = ai.defineFlow<
  typeof SmartPayeeSuggestionInputSchema,
  typeof SmartPayeeSuggestionOutputSchema
>({
  name: 'smartPayeeSuggestionFlow',
  inputSchema: SmartPayeeSuggestionInputSchema,
  outputSchema: SmartPayeeSuggestionOutputSchema,
},
async input => {
  const {output} = await smartPayeeSuggestionPrompt(input);
  return output!;
});
