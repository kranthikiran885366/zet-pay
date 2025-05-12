'use server';
/**
 * @fileOverview An AI-powered gift suggestion flow using Genkit.
 *
 * - suggestGifts - A function that handles the gift suggestion process.
 * - SuggestGiftsInput - The input type for the suggestGifts function.
 * - GiftSuggestion - The type for individual gift suggestions in the output.
 */

import { ai } from '@/ai/genkit'; // Use the pre-configured AI instance
import { z } from 'genkit/zod';

// Define the input schema for the gift suggestion flow
export const SuggestGiftsInputSchema = z.object({
  occasion: z.string().describe('The occasion for the gift (e.g., Birthday, Anniversary, Diwali).'),
  relationship: z.string().describe('The relationship with the recipient (e.g., Friend, Parent, Spouse).'),
  interests: z.array(z.string()).describe('A list of the recipient\'s interests or hobbies (e.g., Reading, Gaming, Travel).'),
  budget: z.string().optional().describe('The approximate budget for the gift in INR (e.g., "500-1000", "Under 2000").'),
  ageRange: z.string().optional().describe('The approximate age range of the recipient (e.g., "25-35", "Teenager", "Senior").'),
  additionalInfo: z.string().optional().describe('Any other relevant details about the recipient or gift preferences.'),
});
export type SuggestGiftsInput = z.infer<typeof SuggestGiftsInputSchema>;

// Define the schema for a single gift suggestion
export const GiftSuggestionSchema = z.object({
  id: z.string().describe('A unique identifier for the gift suggestion.'),
  name: z.string().describe('The name of the suggested gift item.'),
  category: z.string().describe('The category of the gift (e.g., Tech, Books, Fashion, Experience).'),
  priceRange: z.string().describe('An estimated price range for the gift in INR (e.g., "₹500-₹1500", "Around ₹2000").'),
  description: z.string().describe('A brief description of why this gift is suitable.'),
  relevance: z.number().optional().min(0).max(1).describe('A score indicating how relevant the suggestion is (0 to 1).'),
  imageUrl: z.string().url().optional().describe('An optional URL to an image of the suggested gift.'),
  dataAiHint: z.string().optional().describe('Keywords for AI image search if imageUrl is not available.'),
  purchaseLink: z.string().url().optional().describe('An optional link to purchase the gift.'),
});
export type GiftSuggestion = z.infer<typeof GiftSuggestionSchema>;

// Define the output schema for the gift suggestion flow
export const SuggestGiftsOutputSchema = z.object({
  suggestions: z.array(GiftSuggestionSchema).describe('A list of up to 5 relevant gift suggestions.'),
});
export type SuggestGiftsOutput = z.infer<typeof SuggestGiftsOutputSchema>;


// Define the Genkit prompt
const giftSuggestionPrompt = ai.definePrompt({
  name: 'giftSuggestionPrompt',
  input: { schema: SuggestGiftsInputSchema },
  output: { schema: SuggestGiftsOutputSchema },
  prompt: `
    You are a thoughtful and creative Gifting Assistant. Based on the following information, suggest up to 5 diverse and relevant gift ideas.
    For each suggestion, provide a name, category, estimated price range in INR, a brief description explaining its suitability, and optionally an image URL placeholder (using https://picsum.photos/seed/KEYWORD/200/200 format, replacing KEYWORD with relevant terms) or a dataAiHint (one or two keywords for image search).

    Occasion: {{{occasion}}}
    Relationship to Recipient: {{{relationship}}}
    Recipient's Interests: {{#each interests}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
    {{#if budget}}Budget: {{{budget}}} INR{{/if}}
    {{#if ageRange}}Age Range: {{{ageRange}}}{{/if}}
    {{#if additionalInfo}}Additional Information: {{{additionalInfo}}}{{/if}}

    Consider unique and thoughtful gifts. Provide a variety of options if possible.
    Ensure the 'id' for each suggestion is unique (e.g., "gift_1", "gift_2").
    For 'dataAiHint', provide one or two relevant keywords for an image search, like "tech gadget" or "handmade jewelry".
  `,
});

// Define the Genkit flow
const suggestGiftsFlow = ai.defineFlow(
  {
    name: 'suggestGiftsFlow',
    inputSchema: SuggestGiftsInputSchema,
    outputSchema: SuggestGiftsOutputSchema,
  },
  async (input) => {
    const { output } = await giftSuggestionPrompt(input);
    if (!output) {
      // Handle cases where the prompt might not return an output as expected.
      console.error('Gift suggestion prompt did not return an output.');
      return { suggestions: [] }; // Return empty suggestions or throw an error.
    }
    // Ensure image URLs are valid placeholders if not provided by LLM, or use dataAiHint
    const processedSuggestions = output.suggestions.map((suggestion, index) => ({
      ...suggestion,
      id: suggestion.id || `gift_${index + 1}_${Date.now()}`, // Ensure unique ID
      imageUrl: suggestion.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(suggestion.dataAiHint || suggestion.name.split(' ').slice(0,2).join('_') || 'gift')}/200/200`,
      dataAiHint: suggestion.dataAiHint || suggestion.name.toLowerCase().split(' ').slice(0,2).join(' '),
    }));

    return { suggestions: processedSuggestions };
  }
);

/**
 * Publicly callable server action to get gift suggestions.
 * @param input The input data matching SuggestGiftsInput schema.
 * @returns A promise resolving to an array of GiftSuggestion objects.
 */
export async function suggestGifts(input: SuggestGiftsInput): Promise<GiftSuggestion[]> {
  console.log("AI Gifting Flow - Input received:", input);
  try {
    const result = await suggestGiftsFlow(input);
    console.log("AI Gifting Flow - Output generated:", result.suggestions.length, "suggestions");
    return result.suggestions;
  } catch (error) {
    console.error("Error in suggestGifts flow:", error);
    // Consider returning a user-friendly error or an empty array
    return [];
  }
}