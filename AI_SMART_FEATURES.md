
# Zet Pay Super App: AI & Smart Features Documentation

This document provides an overview of the Artificial Intelligence (AI) and smart features integrated into the Zet Pay application, primarily leveraging Google's Genkit framework.

## 1. Introduction

Zet Pay utilizes AI to enhance user experience, provide personalized recommendations, automate tasks, and offer intelligent insights. These features are designed to make the app more intuitive, proactive, and helpful in users' daily financial and lifestyle management.

## 2. Core AI-Powered Features

### 2.1. Conversational AI ("Ask PayFriend")
-   **Functionality:** Allows users to interact with the app using natural language (text or voice) to perform actions like making payments, checking balances, booking services, or getting information.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/conversation/page.tsx` provides the chat interface. Voice input uses `useVoiceCommands` hook (Web Speech API).
    -   Backend AI Flow: `src/ai/flows/conversational-action.ts` (`conversationalActionFlow`).
        -   This Genkit flow receives the user's query.
        -   It uses an LLM (e.g., Gemini) to understand user intent and extract entities (e.g., payee, amount, service type).
        -   Based on the intent, it can:
            *   Provide direct information.
            *   Trigger other backend services/APIs (e.g., initiate a payment, fetch bill details).
            *   Ask clarifying questions if the query is ambiguous.
        -   Returns a structured response (`responseText`, `actionType`, `details`) to the frontend.
    -   **Genkit Instance:** Uses the global `ai` object initialized in `src/ai/genkit.ts`.

### 2.2. Smart Payee Suggestions
-   **Functionality:** When initiating a payment (e.g., "Send Money"), the app suggests frequent or relevant payees based on the user's transaction history and potentially other contextual cues.
-   **Implementation:**
    -   Frontend: Payment initiation screens (e.g., `/src/app/(features)/send/mobile/page.tsx`) would display these suggestions.
    -   Backend AI Flow: `src/ai/flows/smart-payee-suggestion.ts`.
        -   This flow takes the `userId` as input.
        -   It queries the user's transaction history from Firestore.
        -   It uses an LLM or custom logic to analyze patterns and identify likely payees.
        -   Returns a list of suggested payees with their details.
    -   **Data Source:** `transactions` collection in Firestore.

### 2.3. Spending Analysis & Insights
-   **Functionality:** Provides users with an automated analysis of their spending patterns, categorizes expenses, highlights trends, and offers insights (e.g., "You spent 20% more on food this month").
-   **Implementation:**
    -   Frontend: `/src/app/(features)/analysis/page.tsx` displays charts and summaries.
    -   Backend AI Flow: `src/ai/flows/spending-analysis.ts`.
        -   Takes `userId` and optionally a date range as input.
        -   Fetches relevant transactions from Firestore.
        -   Uses an LLM to categorize transactions (if not already well-categorized), identify spending patterns, and generate textual summaries and insights.
        -   Returns structured data (categories, amounts, insights text).
    -   **Data Source:** `transactions` collection.

### 2.4. AI Gifting Assistant
-   **Functionality:** Helps users find suitable gift ideas based on occasion, relationship, recipient's interests, and budget.
-   **Implementation:**
    -   Frontend: `/src/app/(features)/ai-gifting/page.tsx` provides a form for users to input criteria.
    -   Backend AI Flow: `src/ai/flows/gift-suggestion-flow.ts`.
        -   Takes user criteria (occasion, relationship, interests, budget) as input.
        -   Uses an LLM to generate a list of diverse and relevant gift suggestions, including name, category, price range, description, and potentially image URLs or search hints.
    -   **Output:** Returns a list of `GiftSuggestion` objects.

### 2.5. AI-Powered Recharge Plan Recommendations
-   **Functionality:** When a user is on the mobile recharge page, the app can suggest the best recharge plans based on their past usage, current balance (if available), and operator offers.
-   **Implementation:**
    -   Frontend: Recharge page (`/src/app/(features)/recharge/[type]/page.tsx`) would display these recommendations.
    -   Backend AI Flow: `src/ai/flows/recharge-plan-recommendation.ts`.
        -   Takes `userId`, mobile number, and operator details as input.
        -   Fetches user's past recharge history and current operator plans.
        -   Uses an LLM to analyze usage and suggest optimal plans.
    -   **Data Sources:** `transactions` collection (for recharge history), `rechargeProviderService.js` (for current plans).

## 3. Conceptual / Future AI Features

### 3.1. AI Travel Assistant
-   **Functionality (Conceptual):** An advanced version of the conversational AI, specifically focused on travel planning. It could create detailed itineraries, book flights/hotels/activities based on complex requests, and adapt to changes.
-   **Implementation:** Would require a more sophisticated Genkit flow, deeper integration with booking APIs, and potentially calendar/weather service integration.
    -   Frontend: `/src/app/(features)/travels/assistant/page.tsx` (Placeholder).

### 3.2. Smart Schedule Builder
-   **Functionality (Conceptual):** AI helps users plan their day or trips by optimizing routes, suggesting meal times, and scheduling work or leisure activities.
-   **Implementation:** Would involve calendar integration, location services, and complex planning algorithms.
    -   Frontend: `/src/app/(features)/smart-schedule/page.tsx` (Placeholder).

### 3.3. AI Queue Prediction (Temple Services)
-   **Functionality (Conceptual):** For temple darshan, predict queue wait times based on historical data, day of the week, time of day, and special events.
-   **Implementation:** Requires data collection and a predictive model, possibly a Genkit flow.

## 4. Genkit Implementation Details

-   **Global Instance:** A single Genkit `ai` instance is initialized in `src/ai/genkit.ts` using the `googleAI` plugin.
-   **Flows:** Each AI feature is typically encapsulated in a Genkit flow defined in the `src/ai/flows/` directory.
    -   Flows are defined using `ai.defineFlow(...)`.
    -   Prompts within flows are defined using `ai.definePrompt(...)`.
    -   Input and output schemas for flows and prompts are defined using Zod (`z` from `genkit/zod`).
    -   Flows are server-side JavaScript/TypeScript functions marked with `'use server';`.
-   **Data Handling:** Flows interact with Firestore for user data and use Handlebars templating for constructing prompts.
-   **Tool Use:** More complex flows might utilize Genkit tools (`ai.defineTool(...)`) to call external services or perform specific actions as part of the LLM's reasoning process.

Zet Pay's AI features aim to make the app not just a utility but an intelligent assistant, simplifying tasks and providing valuable, personalized support to users.

