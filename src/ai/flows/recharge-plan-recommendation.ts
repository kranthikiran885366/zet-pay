
'use server';
/**
 * @fileOverview AI-powered recharge plan recommendation flow using Genkit.
 * This flow aims to suggest suitable mobile recharge plans based on user history and available plans.
 * For a REAL application, the Genkit tools would call backend APIs which in turn:
 * 1. Fetch user's anonymized recharge history from Firestore.
 * 2. Fetch live operator plans (using rechargeProviderService, which itself would call a real Recharge API Provider).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';
// Types are still useful for schema definitions, actual data fetching is via tools
import type { Transaction } from '@/services/types';
import type { RechargePlan, Biller } from '@/services/recharge';
// Import apiClient to conceptually call backend from tools
import { apiClient } from '@/lib/apiClient';

// --- Input and Output Schemas (Remain largely the same) ---
export const RecommendRechargePlansInputSchema = z.object({
  userId: z.string().describe('The ID of the user for whom to recommend plans.'),
  operator: z.string().describe('The telecom operator (e.g., Airtel, Jio, Vi).'),
  billerId: z.string().describe('The biller ID for the operator. This is CRUCIAL for fetching correct plans.'),
  circle: z.string().optional().describe('The telecom circle (e.g., Karnataka, Maharashtra).'),
  currentBalance: z.number().optional().describe('The user\'s current mobile balance, if known.'),
  currentPlanExpiryDays: z.number().optional().describe('Days left for current plan expiry, if known.'),
});
export type RecommendRechargePlansInput = z.infer<typeof RecommendRechargePlansInputSchema>;

export const RecommendedPlanSchema = z.object({
  planId: z.string().describe('The ID of the recommended plan. Must match an ID from available plans.'),
  name: z.string().describe('A short, catchy name for the recommendation (e.g., "Data Booster Pack", "All-Rounder Combo").'),
  description: z.string().describe('Why this plan is recommended for the user, referencing their usage or needs.'),
  price: z.number().describe('Price of the plan.'),
  validity: z.string().describe('Validity of the plan.'),
  data: z.string().optional().describe('Data benefit.'),
  talktime: z.string().optional().describe('Talktime benefit.'),
  confidenceScore: z.number().min(0).max(1).optional().describe('Confidence score (0-1) of the recommendation.'),
  originalPlanDetails: z.custom<RechargePlan>().optional().describe('The full original plan details from the provider for frontend display.'),
});
export type RecommendedPlan = z.infer<typeof RecommendedPlanSchema>;

export const RecommendRechargePlansOutputSchema = z.object({
  recommendations: z.array(RecommendedPlanSchema).describe('A list of up to 3 recommended recharge plans.'),
  analysisSummary: z.string().optional().describe('A brief summary of the user\'s usage pattern and needs considered for recommendation.'),
});
export type RecommendRechargePlansOutput = z.infer<typeof RecommendRechargePlansOutputSchema>;

// --- Genkit Tools to Fetch Real Data (via Backend APIs) ---

// Tool 1: Get User Recharge Transaction History
const getUserRechargeHistoryTool = ai.defineTool(
  {
    name: 'getUserRechargeHistory',
    description: "Fetches the user's recent mobile recharge transaction history from the app's backend.",
    inputSchema: z.object({ userId: z.string() }),
    // Define a more specific output schema for summarized history suitable for the LLM
    outputSchema: z.array(z.object({
        amount: z.number().describe("Recharge amount"),
        rechargeDate: z.string().describe("Date of recharge, ISO format"),
        planTypeGuess: z.string().optional().describe("Guessed type of plan based on amount/description, e.g., 'Data Pack', 'Unlimited Combo', 'Top-up'"),
        dataBenefitGuess: z.string().optional().describe("Guessed data benefit, e.g., '1.5GB/Day', '10GB Total'"),
        validityDaysGuess: z.number().optional().describe("Guessed validity in days, e.g., 28, 84"),
    })),
  },
  async ({ userId }) => {
    console.log(`[AI Tool] getUserRechargeHistory: Calling backend for user ${userId}`);
    try {
      // CONCEPTUAL: This tool calls a backend API endpoint (e.g., /api/users/${userId}/recharge-history)
      // The backend API queries Firestore `transactions` collection, filters for 'Recharge' type,
      // summarizes details, and returns them.
      // For now, simulating this backend call and data transformation.
      // const historyFromApi = await apiClient<Transaction[]>(`/users/${userId}/recharge-history?limit=5&type=Recharge`);
      // return historyFromApi.map(tx => ({
      //     amount: Math.abs(tx.amount),
      //     rechargeDate: new Date(tx.date).toISOString(),
      //     // TODO: Add more sophisticated guessing logic based on tx.description or tx.planId
      //     planTypeGuess: tx.description.toLowerCase().includes("data") ? "Data Pack" : "Unlimited Combo",
      //     dataBenefitGuess: tx.description.match(/(\d+GB\/Day|\d+GB)/i)?.[0],
      //     validityDaysGuess: parseInt(tx.description.match(/(\d+)\s*Days/i)?.[1] || '0') || undefined,
      // }));
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
      console.warn("[AI Tool] getUserRechargeHistory: Using MOCK data. Real backend API call needed.");
      return [
        { amount: 239, rechargeDate: new Date(Date.now() - 30 * 86400000).toISOString(), planTypeGuess: 'Unlimited Combo', dataBenefitGuess: '1.5GB/Day', validityDaysGuess: 28 },
        { amount: 15, rechargeDate: new Date(Date.now() - 10 * 86400000).toISOString(), planTypeGuess: 'Data Pack', dataBenefitGuess: '1GB', validityDaysGuess: 1 },
      ];
    } catch (error) {
      console.error(`[AI Tool] Error in getUserRechargeHistory for ${userId}:`, error);
      return []; // Return empty on error, LLM should handle this
    }
  }
);

// Tool 2: Get Available Operator Plans
const getOperatorPlansTool = ai.defineTool(
  {
    name: 'getOperatorPlans',
    description: "Fetches currently available mobile recharge plans for a given operator and circle from the app's backend.",
    inputSchema: z.object({
      operatorBillerId: z.string().describe("The biller ID of the telecom operator (e.g., 'airtel-prepaid', 'jio-prepaid')."),
      circle: z.string().optional().describe("The telecom circle, if applicable (e.g., 'Karnataka')."),
      // You might add more filters like plan_type: 'data', 'unlimited' if your backend supports it
    }),
    outputSchema: z.array(z.custom<RechargePlan>()), // Returns full RechargePlan objects
  },
  async ({ operatorBillerId, circle }) => {
    console.log(`[AI Tool] getOperatorPlans: Calling backend for Biller ID ${operatorBillerId}, Circle: ${circle || 'N/A'}`);
    try {
      // CONCEPTUAL: This tool calls a backend API endpoint (e.g., /api/recharge/plans?billerId=X&circle=Y)
      // The backend API uses `rechargeProviderService.fetchPlans` (which calls the real Recharge API Provider / uses Redis).
      // For now, simulating this.
      // const plansFromApi = await apiClient<RechargePlan[]>(`/recharge/plans?billerId=${operatorBillerId}${circle ? `&circle=${circle}` : ''}&type=mobile`);
      // return plansFromApi;
      await new Promise(resolve => setTimeout(resolve, 500));
      console.warn(`[AI Tool] getOperatorPlans for ${operatorBillerId}: Using MOCK data. Real backend API call needed.`);
      const mockPlansDataset = require('@/mock-data/recharge').mockRechargePlansData;
      return mockPlansDataset[operatorBillerId] || mockPlansDataset['jio-prepaid'] || []; // Fallback mock
    } catch (error) {
      console.error(`[AI Tool] Error in getOperatorPlans for ${operatorBillerId}:`, error);
      return []; // Return empty on error
    }
  }
);

// Define the Genkit prompt, instructing it to use the tools
const rechargePlanPrompt = ai.definePrompt(
  {
    name: 'rechargePlanRecommendationPrompt_v3_Tools',
    tools: [getUserRechargeHistoryTool, getOperatorPlansTool],
    input: { schema: RecommendRechargePlansInputSchema }, // Uses the main flow input schema
    output: { schema: RecommendRechargePlansOutputSchema },
    prompt: `
    You are an expert Telecom Advisor for PayFriend. Your goal is to recommend the most suitable mobile recharge plans.

    User Details:
    - User ID: {{{userId}}}
    - Operator: {{{operator}}} (Biller ID: {{{billerId}}})
    {{#if circle}}- Circle: {{{circle}}}{{/if}}
    {{#if currentBalance}}- Current Balance: ₹{{{currentBalance}}}{{/if}}
    {{#if currentPlanExpiryDays}}- Current Plan Expires in: {{{currentPlanExpiryDays}}} days{{/if}}

    Instructions:
    1.  Use the 'getUserRechargeHistory' tool with the '{{{userId}}}' to understand their past recharge habits (common amounts, data needs, validity preferences).
    2.  Use the 'getOperatorPlans' tool with the '{{{billerId}}}' (and '{{{circle}}}' if provided) to fetch the list of currently available plans for the user's operator.
    3.  Analyze the user's history and current context (balance, expiry) against the available plans.
    4.  Provide a concise 'analysisSummary' (1-2 sentences) explaining the user's likely needs.
    5.  Recommend up to 3 diverse and highly relevant recharge plans in the 'recommendations' array.
        For each recommendation:
        -   Ensure 'planId' exactly matches an ID from the 'getOperatorPlans' tool output.
        -   Create a short, catchy 'name' for the recommendation (e.g., "Data Booster", "Value Combo").
        -   Write a personalized 'description' explaining *why* this specific plan is a good fit, referencing their history or current situation.
        -   Accurately include 'price', 'validity', 'data', and 'talktime' from the chosen available plan.
        -   Assign a 'confidenceScore' (0.0 to 1.0) based on how well it matches.

    Prioritize plans that offer good value, match common recharge patterns, or address urgent needs like low balance or imminent expiry. If multiple plans are similar, suggest variety.
    If no plans from the provider are a good fit for the user's pattern, or if no plans are available, return an empty recommendations list and explain this in the analysisSummary.
  `,
  },
);

// Define the Genkit flow
const recommendRechargePlansFlow = ai.defineFlow(
  {
    name: 'recommendRechargePlansFlow_v3_Tools',
    inputSchema: RecommendRechargePlansInputSchema,
    outputSchema: RecommendRechargePlansOutputSchema,
  },
  async (input) => {
    console.log("[AI Flow] recommendRechargePlansFlow_v3_Tools: Input received by flow:", input);
    if (!input.billerId) {
        console.error("[AI Flow] Biller ID is missing in input. Cannot reliably fetch operator plans. Aborting.");
        return { recommendations: [], analysisSummary: "Operator information (Biller ID) is missing. Cannot generate recommendations." };
    }

    // The prompt will now orchestrate the tool calls.
    const { output, history } = await rechargePlanPrompt(input);

    // Log tool calls and their responses from history for debugging
    history.forEach(event => {
      if (event.type === 'toolRequest') {
        console.log(`[AI Flow DBG] Tool Requested: ${event.toolRequest.name}, Input: ${JSON.stringify(event.toolRequest.input)}`);
      } else if (event.type === 'toolResponse') {
        console.log(`[AI Flow DBG] Tool Responded: ${event.toolResponse.name}, Output Snippet: ${JSON.stringify(event.toolResponse.output).substring(0, 200)}...`);
      }
    });

    if (!output) {
      console.error("[AI Flow] Recharge plan prompt (with tools) did not return an output.");
      return { recommendations: [], analysisSummary: "Could not generate recommendations at this time." };
    }

    // Attach original plan details to recommendations, using plans fetched by the tool
    const plansFetchedByTool = history
      .filter(e => e.type === 'toolResponse' && e.toolResponse?.name === 'getOperatorPlans')
      .flatMap(e => e.toolResponse?.output as RechargePlan[] || []);
    
    const finalRecommendations = output.recommendations.map(rec => {
        const originalPlan = plansFetchedByTool.find(p => p.planId === rec.planId);
        if (originalPlan) {
            return { ...rec, originalPlanDetails: originalPlan };
        }
        // If planId didn't match (e.g., LLM slightly altered it, or if it used price as ID), try a fallback match
        const fallbackPlan = plansFetchedByTool.find(p => String(p.price) === String(rec.price) && p.validity === rec.validity && (p.data === rec.data || (!p.data && !rec.data)));
        return { ...rec, originalPlanDetails: fallbackPlan || rec.originalPlanDetails };
    });

    console.log("[AI Flow] recommendRechargePlansFlow_v3_Tools: Output recommendations count:", finalRecommendations.length);
    return { recommendations: finalRecommendations, analysisSummary: output.analysisSummary };
  }
);

/**
 * Publicly callable server action to get recharge plan recommendations.
 */
export async function recommendRechargePlans(input: RecommendRechargePlansInput): Promise<RecommendRechargePlansOutput> {
  console.log("[AI Service Entry] Recharge Plan Recommendation - Input received:", input);
  // Ensure BillerID is present, as it's critical for the 'getOperatorPlansTool'
  if (!input.billerId) {
     // Attempt to map operator name to a known billerId (conceptual, robust mapping needed for production)
     const mockBillers = require('@/mock-data/recharge').mockBillersData['Mobile'] as Biller[];
     const foundBiller = mockBillers?.find(b => b.billerName.toLowerCase().includes(input.operator.toLowerCase()));
     if (foundBiller) {
         input.billerId = foundBiller.billerId;
         console.log(`[AI Service Entry] Mapped operator ${input.operator} to billerId ${input.billerId}`);
     } else {
         console.error(`[AI Service Entry] Critical: Operator '${input.operator}' could not be mapped to a Biller ID. Cannot fetch plans for AI recommendation.`);
         return { recommendations: [], analysisSummary: `Operator information for '${input.operator}' could not be resolved to a Biller ID. Recommendations unavailable.` };
     }
  }

  try {
    const result = await recommendRechargePlansFlow(input);
    return result;
  } catch (error) {
    console.error("[AI Service Entry] Error in recommendRechargePlans flow execution:", error);
    return { recommendations: [], analysisSummary: "Failed to get recommendations due to an internal AI flow error." };
  }
}
