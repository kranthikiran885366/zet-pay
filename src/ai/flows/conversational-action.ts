'use server';
/**
 * @fileOverview AI-powered conversational action flow.
 * Understands natural language requests for recharges and bookings.
 *
 * - processConversationalQuery - Parses user query and determines action/parameters.
 * - ConversationalQueryInput - Input type for the conversational query.
 * - ConversationalQueryOutput - Output type for the conversational query.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// Define possible actions the AI can identify
const ActionTypeSchema = z.enum([
    'mobileRecharge',
    'bookBus',
    'bookMovie', // Add other booking types as needed
    'getHistory',
    'checkBalance',
    'clarification', // When the AI needs more info
    'unsupported', // When the request cannot be handled
    'greeting', // Simple greetings
]);

// Define schemas for details extracted for each action
const MobileRechargeDetailsSchema = z.object({
    mobileNumber: z.string().optional().describe('The 10-digit mobile number to recharge.'),
    contactName: z.string().optional().describe('The name of the contact if identified.'),
    amount: z.number().optional().describe('The recharge amount.'),
    operator: z.string().optional().describe('The mobile operator (e.g., Jio, Airtel).'),
    planDescription: z.string().optional().describe('A description of the desired plan (e.g., "unlimited data", "2GB daily").'),
}).optional();

const BookBusDetailsSchema = z.object({
    fromCity: z.string().optional().describe('The departure city.'),
    toCity: z.string().optional().describe('The destination city.'),
    date: z.string().optional().describe('The date of travel (e.g., "tomorrow", "next Friday", "July 25th").'),
    timePreference: z.string().optional().describe('Preferred time (e.g., "night", "morning", "around 8 PM").'),
    maxPrice: z.number().optional().describe('Maximum price the user is willing to pay.'),
    busType: z.string().optional().describe('Preferred bus type (e.g., "AC sleeper", "Volvo").'),
    numberOfSeats: z.number().optional().describe('Number of seats required.').default(1),
}).optional();

// Input Schema
const ConversationalQueryInputSchema = z.object({
  userId: z.string().describe('The ID of the user making the request.'),
  query: z.string().describe('The user\'s natural language request.'),
  // Optional context can be added here (e.g., previous messages, user location)
});
export type ConversationalQueryInput = z.infer<typeof ConversationalQueryInputSchema>;

// Output Schema
const ConversationalQueryOutputSchema = z.object({
  actionType: ActionTypeSchema.describe('The type of action identified in the user query.'),
  details: z.union([
      MobileRechargeDetailsSchema,
      BookBusDetailsSchema,
      z.object({}).describe("Empty object for actions like greeting, unsupported, or getHistory/checkBalance."), // Placeholder for actions without specific details yet
  ]).optional().describe('Extracted details relevant to the identified action.'),
  responseText: z.string().describe('A natural language response to the user.'),
  clarificationQuestion: z.string().optional().describe('A question asked by the AI if more information is needed.'),
  originalQuery: z.string().describe("The original user query."),
});
export type ConversationalQueryOutput = z.infer<typeof ConversationalQueryOutputSchema>;


export async function processConversationalQuery(
  input: ConversationalQueryInput
): Promise<ConversationalQueryOutput> {
  return conversationalActionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'conversationalActionPrompt',
  input: { schema: ConversationalQueryInputSchema },
  output: { schema: ConversationalQueryOutputSchema },
  prompt: `You are PayFriend, a helpful AI assistant integrated into a payment and booking app. Analyze the user's query and determine the intended action and relevant details.

User ID: {{{userId}}}
User Query: {{{query}}}

Your tasks:
1.  **Identify the Action:** Determine the primary action the user wants to perform (e.g., mobileRecharge, bookBus, checkBalance, getHistory, greeting, or if it's unsupported). If the user query is unclear, set actionType to 'clarification'.
2.  **Extract Details:** Extract relevant information based on the identified action.
    *   **Mobile Recharge:** Extract mobile number (or contact name), amount, operator, and any plan preferences (like 'unlimited data', '28 days validity').
    *   **Bus Booking:** Extract origin city, destination city, date (interpret "tomorrow", "next friday", specific dates relative to today, assuming today is {{currentDate}}), time preference, seat count, bus type preference, and max price if mentioned.
    *   **Balance/History:** No specific details needed beyond the actionType.
    *   **Greeting:** No specific details needed.
3.  **Formulate Response:**
    *   If the action and details are clear: Generate a confirmation message summarizing the request (e.g., "Okay, recharging mobile number 98XXXXXX10 with ₹299.").
    *   If more information is needed: Set actionType to 'clarification', generate a friendly response asking for the missing details (clarificationQuestion).
    *   If the query is unsupported: Set actionType to 'unsupported' and generate a polite response indicating you cannot fulfill the request but can help with payments, recharges, bookings etc.
    *   If it's just a greeting: Respond appropriately.
4.  **Populate Output:** Fill the output fields: actionType, details (as an object matching the action, or empty object {} if no details), responseText, clarificationQuestion (if any), and originalQuery.

**Current Date:** {{currentDate}} (Use this to resolve relative dates like "tomorrow")

**Example Scenarios:**

*   **Query:** "Recharge my mobile with 239"
    *   **Action:** mobileRecharge
    *   **Details:** { amount: 239 } (Assume 'my mobile' implies the user's primary number, needs clarification if multiple numbers exist or none is linked)
    *   **Response:** "Okay, recharging your primary mobile number with ₹239. Please confirm." (Or ask for number if ambiguous)
*   **Query:** "Book a bus ticket from Hyderabad to Vizag for tomorrow night under 500 rupees"
    *   **Action:** bookBus
    *   **Details:** { fromCity: "Hyderabad", toCity: "Vizag", date: "tomorrow", timePreference: "night", maxPrice: 500 }
    *   **Response:** "Okay, searching for buses from Hyderabad to Vizag for tomorrow night under ₹500."
*   **Query:** "Show my last 5 transactions"
    *   **Action:** getHistory
    *   **Details:** {}
    *   **Response:** "Sure, showing your last 5 transactions."
*   **Query:** "What's my account balance?"
    *   **Action:** checkBalance
    *   **Details:** {}
    *   **Response:** "Let me check your account balance."
*   **Query:** "Book a flight"
    *   **Action:** unsupported (Assuming flight booking isn't implemented *in this flow*)
    *   **Details:** {}
    *   **Response:** "Sorry, I can't book flights currently, but I can help with bus tickets or mobile recharges."
*   **Query:** "Send 500"
    *   **Action:** clarification
    *   **Details:** { amount: 500 }
    *   **Response:** "Sure, I can help with that. Who would you like to send ₹500 to? Please provide their name, mobile number, or UPI ID."
    *   **Clarification:** "Who would you like to send ₹500 to? Please provide their name, mobile number, or UPI ID."
*   **Query:** "Hi"
    *   **Action:** greeting
    *   **Details:** {}
    *   **Response:** "Hello! How can I help you today?"

Analyze the user query and provide the structured output.`,
});

const conversationalActionFlow = ai.defineFlow<
  typeof ConversationalQueryInputSchema,
  typeof ConversationalQueryOutputSchema
>(
  {
    name: 'conversationalActionFlow',
    inputSchema: ConversationalQueryInputSchema,
    outputSchema: ConversationalQueryOutputSchema,
  },
  async (input) => {
    const currentDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format

    // Enhance prompt input with current date
    const promptInput = {
        ...input,
        currentDate,
    };

    const { output } = await prompt(promptInput);
    // Ensure the original query is part of the output
    return { ...output!, originalQuery: input.query };
  }
);
