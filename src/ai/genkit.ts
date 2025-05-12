'use server';
/**
 * @fileOverview Initializes and exports the Genkit AI instance.
 */
import { genkit, Ai } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { configureGenkit } from 'genkit';


// Initialize Genkit with the Google AI plugin
export const ai: Ai = genkit({
  plugins: [
    googleAI({
      // You can specify the API key directly here or ensure it's set in the environment
      // apiKey: process.env.GOOGLE_GENAI_API_KEY, 
    }),
  ],
  // Flow state and trace data is stored locally in development by default.
  // You can configure a different store if needed for production.
  // flowStateStore: 'firebase', // Example: using Firebase for flow state
  // traceStore: 'firebase',     // Example: using Firebase for traces
  //
  // We will use the default local storage for now.
});

// The configureGenkit call is not needed if using genkit() initialization in Genkit 1.x
// configureGenkit({
//   plugins: [
//     googleAI({
//       // apiKey: process.env.GOOGLE_GENAI_API_KEY, // Ensure GOOGLE_GENAI_API_KEY is set in .env
//     }),
//   ],
//   logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
//   enableTracingAndMetrics: true,
// });

// export default ai; // Export the initialized AI instance