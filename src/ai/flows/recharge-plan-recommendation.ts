'use server';
/**
 * @fileOverview AI-powered mobile recharge plan recommendation flow.
 *
 * - recommendRechargePlans - Suggests suitable recharge plans based on user context.
 * - RecommendRechargePlansInput - The input type for the recommendation function.
 * - RecommendRechargePlansOutput - The return type for the recommendation function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Define a schema for individual plans consistent with the frontend
const RechargePlanSchema = z.object({
  planId: z.string(),
  description: z.string(),
  price: z.number(),
  validity: z.string(),
  data: z.string(),
  talktime: z.number().optional(),
  sms: z.number().optional(),
  isOffer: z.boolean().optional().describe('Whether this plan is a special offer.'),
  category: z.string().optional().describe('Category like Popular, Data, Roaming etc.'),
});
type RechargePlan = z.infer<typeof RechargePlanSchema>;


const RecommendRechargePlansInputSchema = z.object({
  userId: z.string().describe('The ID of the user seeking recommendations.'),
  operatorName: z.string().describe('The name of the mobile operator (e.g., Airtel, Jio).'),
  availablePlans: z.array(RechargePlanSchema).describe('A list of all available plans for the operator.'),
  usageHistory: z.object({
    averageMonthlyDataUsageGB: z.number().optional().describe('Average monthly data usage in GB.'),
    averageMonthlyCallsMinutes: z.number().optional().describe('Average monthly call duration in minutes.'),
    preferredPlanType: z.enum(['data_heavy', 'balanced', 'talktime_focused', 'long_validity']).optional().describe('User preference for plan type.'),
    budget: z.number().optional().describe('User\'s approximate monthly budget for recharge.'),
  }).optional().describe('User\'s past usage patterns and preferences (optional).'),
});
export type RecommendRechargePlansInput = z.infer<typeof RecommendRechargePlansInputSchema>;

const RecommendRechargePlansOutputSchema = z.object({
  recommendedPlanIds: z.array(z.string()).describe('A list of recommended plan IDs, sorted by suitability.'),
  reasoning: z.string().optional().describe('Explanation for the recommendations.'),
});
export type RecommendRechargePlansOutput = z.infer<typeof RecommendRechargePlansOutputSchema>;

export async function recommendRechargePlans(
  input: RecommendRechargePlansInput
): Promise<RecommendRechargePlansOutput> {
  // Basic filtering if no AI is needed or as a fallback
  if (!input.usageHistory && input.availablePlans.length > 0) {
      const popularPlans = input.availablePlans
          .filter(p => p.category === 'Popular' || p.price < 300) // Example basic filter
          .slice(0, 3)
          .map(p => p.planId);
       return { recommendedPlanIds: popularPlans, reasoning: "Showing popular plans." };
  }
  return recommendRechargePlansFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendRechargePlansPrompt',
  input: {
    schema: RecommendRechargePlansInputSchema,
  },
  output: {
    schema: RecommendRechargePlansOutputSchema,
  },
  prompt: `You are a mobile recharge advisor. Your goal is to recommend the most suitable recharge plans for a user based on their potential usage history and preferences, from a list of available plans for their operator.

User ID: {{{userId}}}
Operator: {{{operatorName}}}

Available Plans:
{{#each availablePlans}}
- Plan ID: {{planId}}, Price: ₹{{price}}, Validity: {{validity}}, Data: {{data}}{{#if talktime}}, Talktime: ₹{{talktime}}{{/if}}{{#if sms}}, SMS: {{sms}}{{/if}}{{#if category}}, Category: {{category}}{{/if}}{{#if isOffer}} (SPECIAL OFFER){{/if}}
  Description: {{description}}
{{/each}}

{{#if usageHistory}}
User Usage & Preferences:
{{#if usageHistory.averageMonthlyDataUsageGB}} - Average Monthly Data: {{usageHistory.averageMonthlyDataUsageGB}} GB{{/if}}
{{#if usageHistory.averageMonthlyCallsMinutes}} - Average Monthly Calls: {{usageHistory.averageMonthlyCallsMinutes}} minutes{{/if}}
{{#if usageHistory.preferredPlanType}} - Preference: {{usageHistory.preferredPlanType}}{{/if}}
{{#if usageHistory.budget}} - Budget: approx ₹{{usageHistory.budget}}/month{{/if}}
{{else}}
No specific usage history provided. Recommend generally popular or balanced plans.
{{/if}}

Analyze the available plans and the user's context. Recommend up to 3 plan IDs that best fit the user's needs, sorted from most to least recommended. Provide a brief reasoning for your choices. Focus on matching data needs, validity preferences, and budget if provided. Prioritize plans marked as SPECIAL OFFER if they are relevant.
`,
});

const recommendRechargePlansFlow = ai.defineFlow<
  typeof RecommendRechargePlansInputSchema,
  typeof RecommendRechargePlansOutputSchema
>({
  name: 'recommendRechargePlansFlow',
  inputSchema: RecommendRechargePlansInputSchema,
  outputSchema: RecommendRechargePlansOutputSchema,
},
async input => {
  // Ensure we don't send too many plans to the LLM if the list is huge
  const plansToSend = input.availablePlans.slice(0, 50); // Limit plans sent to LLM
  const limitedInput = { ...input, availablePlans: plansToSend };

  const {output} = await prompt(limitedInput);
  return output!;
});
