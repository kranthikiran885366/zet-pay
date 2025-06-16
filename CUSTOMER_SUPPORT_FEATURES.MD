
# Zet Pay Super App: Customer Support Features Documentation

This document outlines the Customer Support features integrated into the Zet Pay application, designed to assist users and resolve their queries efficiently.

## 1. Introduction

Zet Pay aims to provide excellent customer support through various channels, including a 24/7 live chat with human agents, a comprehensive FAQ section, and a system for managing support tickets related to specific issues or transactions.

## 2. Core Support Features

### 2.1. 24/7 Live Human Support Chat (ZetChat)
-   **Functionality:** Users can initiate a live chat session with a human support agent directly within the app to get assistance for any issues, queries, or guidance they need.
-   **Implementation:**
    -   Frontend:
        -   `/src/app/(features)/support/page.tsx`: Serves as the main entry point for support, potentially including a button to start a new chat.
        -   `src/components/zet-chat.tsx`: A reusable chat UI component that handles message display, input, and real-time communication.
    -   Backend:
        -   WebSocket Server: Managed in `backend/server.js`, handles real-time message exchange between users and support agents.
        -   Routes: `POST /api/chat/initiate/:recipientId` (can be adapted for initiating support chat with an agent pool or specific agent), `GET /api/chat/:chatId/messages`, `POST /api/chat/:chatId/messages`.
        -   Controller: `chatController.js`.
        -   Service: `chatService.js` handles message routing, storage, and agent assignment logic (conceptual).
            -   **Agent Dashboard:** (Conceptual external system) Support agents would use a separate dashboard to view incoming chats, respond to users, and manage chat history. Zet Pay backend would integrate with this dashboard.
    -   Firestore:
        -   `chats` collection: Stores metadata for each chat session (participants, timestamps, last message).
        -   `chats/{chatId}/messages` subcollection: Stores individual messages within a session.
        -   `supportAgents` collection (conceptual): Stores profiles of support agents.
    -   **Real-time Communication:** Leverages WebSockets for instant message delivery.

### 2.2. FAQ & Help Center (Conceptual)
-   **Functionality:** A searchable knowledge base within the app containing answers to frequently asked questions, troubleshooting guides, tutorials, and information about Zet Pay features and policies.
-   **Implementation (Conceptual):**
    -   Frontend: A dedicated page (e.g., `/help-center` or integrated within `/support`) with categorized FAQs and a search bar.
    -   Backend:
        -   Route: `GET /api/support/faqs?query=...&category=...`.
        -   Controller: `supportController.js` (conceptual).
        -   Service: `supportService.js` (conceptual) would fetch FAQ content from Firestore or a CMS.
    -   Firestore: `faqs` collection to store question-answer pairs, categories, and keywords.

### 2.3. Support Ticket System (Conceptual for User-Facing; Partially for Backend)
-   **Functionality:**
    -   **Automatic Ticket Creation:** For critical issues like "payment failed but amount debited," the system can automatically raise a support ticket (as seen in `upiController.js` for UPI failures).
    -   **Manual Ticket Creation (Conceptual):** Users could manually raise a support ticket for complex issues not resolved via chat or FAQ.
    -   **Ticket Tracking:** Users can view the status and updates for their submitted tickets.
-   **Implementation:**
    -   Frontend:
        -   A "My Tickets" section within `/support` or profile.
        -   UI to view ticket details and communicate on a ticket thread (could reuse ZetChat component in a ticket context).
    -   Backend:
        -   Routes: `POST /api/support/tickets/create`, `GET /api/support/tickets`, `GET /api/support/tickets/:ticketId`, `POST /api/support/tickets/:ticketId/reply`.
        -   Controller: `supportController.js` (conceptual).
        -   Service: `supportService.js` (conceptual) to manage ticket lifecycle, assignment to agents, and communication.
    -   Firestore: `supportTickets` collection to store ticket details (userId, issueType, description, status, priority, attachments, agentId, resolutionDetails, communication thread as subcollection).

## 3. Advanced Support Features (Conceptual)

### 3.1. AI-Powered Chatbot (Initial Triage)
-   **Functionality:** An AI chatbot can handle initial user queries, provide instant answers from the FAQ, guide users through common troubleshooting steps, and escalate to a human agent if needed.
-   **Implementation (Conceptual):**
    -   Genkit AI Flow: An AI flow (`src/ai/flows/support-chatbot-flow.ts`) integrated with the chat system to understand user intent and respond.
    -   Handover Protocol: Clear mechanism for the chatbot to transfer the chat to a human agent with context.

### 3.2. Contextual Help
-   **Functionality:** Provide help links or prompts within specific feature pages that lead directly to relevant FAQ articles or initiate a chat pre-filled with context about the user's current screen/action.
-   **Implementation (Conceptual):**
    -   Frontend: "Help" icons or links on various pages.
    -   Backend: Chat initiation can accept contextual parameters.

### 3.3. Screen Sharing / Co-browsing (with consent)
-   **Functionality:** For complex issues, support agents (with explicit user consent) could initiate a secure screen sharing or co-browsing session to guide the user.
-   **Implementation (Conceptual):**
    -   Requires integration with specialized third-party SDKs for secure screen sharing.

## 4. Technical Implementation Summary

-   **Frontend:** React components for support hub, chat interface (`ZetChat`), FAQ display, ticket management UI. API calls via `src/services/support.ts` (conceptual) and direct WebSocket interactions via `src/lib/websocket.ts`.
-   **Backend:** Express.js routes (`supportRoutes.js`, `chatRoutes.js`), controllers (`supportController.js`, `chatController.js`), services (`supportService.js`, `chatService.js`). WebSocket server for real-time chat.
-   **Data Storage:**
    -   Firestore: `chats`, `supportTickets`, `faqs`.
-   **AI (Conceptual):** Genkit for AI chatbot.

Zet Pay's customer support features are designed to be accessible, responsive, and helpful, ensuring users have a positive experience even when they encounter issues.

    