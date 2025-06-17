
'use server';
/**
 * @fileOverview AI-powered recharge plan recommendation flow.
 * This flow aims to suggest suitable mobile recharge plans based on user history and available plans.
 */

import { ai } from '@/ai/genkit'; // Use the pre-configured AI instance
import { z } from 'genkit/zod';
import { getTransactionHistory, Transaction } from '@/services/transactions'; // For fetching user history
import { getRechargePlans, RechargePlan, Biller } from '@/services/recharge'; // For fetching current plans

// Define input schema for the flow
export const RecommendRechargePlansInputSchema = z.object({
  userId: z.string().describe('The ID of the user for whom to recommend plans.'),
  operator: z.string().describe('The telecom operator (e.g., Airtel, Jio, Vi).'),
  circle: z.string().optional().describe('The telecom circle (e.g., Karnataka, Maharashtra).'),
  currentBalance: z.number().optional().describe('The user\'s current mobile balance, if known.'),
  currentPlanExpiryDays: z.number().optional().describe('Days left for current plan expiry, if known.'),
});
export type RecommendRechargePlansInput = z.infer<typeof RecommendRechargePlansInputSchema>;

// Define output schema for a single recommended plan
export const RecommendedPlanSchema = z.object({
  planId: z.string().describe('The ID of the recommended plan.'),
  name: z.string().describe('A short, catchy name for the recommendation (e.g., "Best Value Data Pack", "Unlimited Combo").'),
  description: z.string().describe('Why this plan is recommended for the user.'),
  price: z.number().describe('Price of the plan.'),
  validity: z.string().describe('Validity of the plan.'),
  data: z.string().optional().describe('Data benefit.'),
  talktime: z.string().optional().describe('Talktime benefit.'),
  confidenceScore: z.number().min(0).max(1).optional().describe('Confidence score (0-1) of the recommendation.'),
  originalPlanDetails: z.custom<RechargePlan>().optional().describe('The full original plan details from the provider.'), // Store original plan
});
export type RecommendedPlan = z.infer<typeof RecommendedPlanSchema>;

// Define the output schema for the flow
export const RecommendRechargePlansOutputSchema = z.object({
  recommendations: z.array(RecommendedPlanSchema).describe('A list of up to 3 recommended recharge plans.'),
  analysisSummary: z.string().optional().describe('A brief summary of the user\'s usage pattern considered for recommendation.'),
});
export type RecommendRechargePlansOutput = z.infer<typeof RecommendRechargePlansOutputSchema>;

// Define the Genkit prompt
const rechargePlanPrompt = ai.definePrompt(
  {
    name: 'rechargePlanRecommendationPrompt',
    input: { schema: z.object({
        usageHistorySummary: z.string().describe("A summary of the user's past recharge patterns and preferences."),
        availablePlans: z.array(z.custom<RechargePlan>()).describe("A list of currently available recharge plans from the operator."),
        currentBalance: z.number().optional(),
        currentPlanExpiryDays: z.number().optional(),
        operator: z.string(),
    })},
    output: { schema: RecommendRechargePlansOutputSchema },
    prompt: `
    You are a helpful Telecom Advisor AI for the PayFriend app.
    Your goal is to recommend the best mobile recharge plans for a user.

    User's Usage Context:
    {{{usageHistorySummary}}}
    {{#if currentBalance}}Current Balance: ₹{{{currentBalance}}}.{{/if}}
    {{#if currentPlanExpiryDays}}Current Plan Expires in: {{{currentPlanExpiryDays}}} days.{{/if}}
    Operator: {{{operator}}}

    Available Plans:
    {{#each availablePlans}}
    - Plan ID: {{planId}}, Price: ₹{{price}}, Validity: {{validity}}, Data: {{data}}, Talktime: {{talktime}}, Description: {{description}}
    {{/each}}

    Based on the user's context and the available plans, please provide:
    1.  A short analysis summary (1-2 sentences) of their likely needs.
    2.  Up to 3 diverse and highly relevant recharge plan recommendations. For each recommendation:
        -   Create a unique 'planId' that matches one of the provided available plan IDs.
        -   Provide a short, catchy 'name' for your recommendation.
        -   Explain briefly in 'description' why this specific plan is a good fit.
        -   Include 'price', 'validity', 'data', and 'talktime' from the chosen available plan.
        -   Optionally, give a 'confidenceScore' (0.0 to 1.0) for your recommendation.

    Focus on value for money, matching usage patterns, and addressing any immediate needs (like low balance or plan expiry).
    If no plans seem like a good fit, provide an empty recommendations list and explain why in the analysisSummary.
  `,
  },
);

// Define the Genkit flow
const recommendRechargePlansFlow = ai.defineFlow(
  {
    name: 'recommendRechargePlansFlow',
    inputSchema: RecommendRechargePlansInputSchema,
    outputSchema: RecommendRechargePlansOutputSchema,
  },
  async (input) => {
    // 1. Fetch user's recent recharge history (Conceptual - needs actual Firestore query)
    //    For now, we'll use a placeholder summary.
    //    In a real app:
    //    const transactions = await getTransactionHistory({ userId: input.userId, type: 'Recharge', limit: 5 });
    //    const historySummary = summarizeRechargeHistory(transactions); // Implement this helper
    const historySummary = "User typically recharges with mid-range data packs (1-2GB/day) with 28-day validity. Prefers plans with some talktime included."; // Mock summary

    // 2. Fetch available plans for the operator/circle (Conceptual - needs actual service call)
    //    The `rechargeProviderService.fetchPlans` would be used here.
    //    For now, using a placeholder or a broad fetch.
    //    This requires the `billerId` for the operator. We'll assume `input.operator` can be mapped to a `billerId`.
    //    const operatorBillerId = mapOperatorNameToBillerId(input.operator); // Helper needed
    let availablePlans: RechargePlan[] = [];
    try {
        // In a real app, map input.operator to a billerId if necessary.
        // For simulation, we might just use a common operator's plans if billerId isn't directly available.
        const operatorBiller = mockBillersData['Mobile']?.find(b => b.billerName.toLowerCase().includes(input.operator.toLowerCase()));
        if(operatorBiller){
            availablePlans = await getRechargePlans(operatorBiller.billerId, 'mobile', undefined /* input.userId can be used if provider API supports it */);
        } else {
            console.warn(`No billerId found for operator: ${input.operator}. Using default plans for recommendation.`);
            // Fallback to a default set of plans if operator mapping fails
            availablePlans = mockRechargePlansData['jio-prepaid'] || [];
        }
    } catch (e) {
        console.error("Failed to fetch plans for recommendation:", e);
        // Proceed with an empty plan list, or hardcoded defaults
    }
    
    if (availablePlans.length === 0) {
        return { recommendations: [], analysisSummary: "No recharge plans are currently available from the provider. Please check again later." };
    }

    // 3. Call the LLM prompt
    const { output } = await rechargePlanPrompt({
      usageHistorySummary: historySummary,
      availablePlans: availablePlans,
      currentBalance: input.currentBalance,
      currentPlanExpiryDays: input.currentPlanExpiryDays,
      operator: input.operator,
    });

    if (!output) {
      return { recommendations: [], analysisSummary: "Could not generate recommendations at this time." };
    }

    // 4. Optionally, attach original plan details to recommendations
    const finalRecommendations = output.recommendations.map(rec => {
        const originalPlan = availablePlans.find(p => p.planId === rec.planId || String(p.price) === String(rec.price)); // Match by ID or price as fallback
        return { ...rec, originalPlanDetails: originalPlan };
    });

    return { recommendations: finalRecommendations, analysisSummary: output.analysisSummary };
  }
);

/**
 * Publicly callable server action to get recharge plan recommendations.
 */
export async function recommendRechargePlans(input: RecommendRechargePlansInput): Promise<RecommendRechargePlansOutput> {
  console.log("AI Recharge Plan Recommendation Flow - Input received:", input);
  try {
    const result = await recommendRechargePlansFlow(input);
    console.log("AI Recharge Plan Recommendation Flow - Output generated:", result.recommendations.length, "recommendations");
    return result;
  } catch (error) {
    console.error("Error in recommendRechargePlans flow:", error);
    return { recommendations: [], analysisSummary: "Failed to get recommendations due to an error." };
  }
}

// Helper function example (needs to be implemented based on your data)
function summarizeRechargeHistory(transactions: Transaction[]): string {
    if (transactions.length === 0) return "No recent recharge history available.";
    // Example summarization logic:
    let commonPlanType = "data packs";
    let commonValidity = "monthly";
    // Analyze transactions to find patterns...
    return `User frequently recharges with ${commonPlanType} and prefers ${commonValidity} validity.`;
}

// Placeholder imports for mock data and types - ensure these align with your project structure
import { mockBillersData } from '@/mock-data/recharge';
import { mockRechargePlansData } from '@/mock-data/recharge';

</description>
    <content><![CDATA[

