
'use client';

import { useState, useEffect, useCallback } from 'react';

interface VoiceCommandsHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

// Placeholder hook - requires integration with a Speech Recognition library
// like Web Speech API or a third-party service.
export function useVoiceCommands(): VoiceCommandsHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null); // Store recognition instance

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported by this browser.");
      setError("Speech Recognition API not supported by this browser.");
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false; // Listen for single utterances
    recognitionInstance.lang = 'en-IN'; // Default to English (India), make configurable later
    recognitionInstance.interimResults = false; // We only want final results
    recognitionInstance.maxAlternatives = 1;

    recognitionInstance.onresult = (event: any) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.trim();
      console.log('Voice command recognized:', command);
      setTranscript(command);
      setIsListening(false); // Stop listening after result
    };

    recognitionInstance.onspeechend = () => {
      console.log('Speech ended.');
       if (isListening) { // Avoid stopping if already stopped by result
            stopListeningInternal(recognitionInstance);
       }
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = 'An unknown error occurred.';
      if (event.error === 'no-speech') {
        errorMessage = 'No speech detected. Please try again.';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'Audio capture failed. Check microphone permissions.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone access denied. Please allow access.';
      } else if (event.error === 'network') {
          errorMessage = 'Network error during speech recognition.';
      }
      setError(errorMessage);
      setIsListening(false);
    };

     recognitionInstance.onend = () => {
        console.log('Recognition instance ended.');
        // Ensure listening state is false if ended unexpectedly
        // setIsListening(false); // Careful: might interfere with manual start/stop
     }

    setRecognition(recognitionInstance);

    // Cleanup function
    return () => {
      if (recognitionInstance) {
        recognitionInstance.abort(); // Ensure it stops cleanly
        console.log("Speech recognition instance cleaned up.");
      }
    };
  }, []); // Run only once on mount

  const startListening = useCallback(() => {
    if (!recognition) {
        setError("Speech recognition not initialized.");
        return;
    }
    if (isListening) {
        console.log("Already listening.");
        return; // Prevent multiple starts
    }
    try {
        console.log("Starting voice listening...");
        setTranscript('');
        setError(null);
        setIsListening(true);
        recognition.start();
    } catch (err: any) {
         console.error("Error starting recognition:", err);
         setError(`Could not start listening: ${err.message}`);
         setIsListening(false);
    }
  }, [recognition, isListening]);

  const stopListeningInternal = (instance: any) => {
     if (instance) {
        try {
            instance.stop();
            console.log("Stopped voice listening.");
        } catch (err) {
             console.error("Error stopping recognition:", err);
             // Don't set error here, might be expected if already stopped
        } finally {
             setIsListening(false);
        }
     }
  };

  const stopListening = useCallback(() => {
     stopListeningInternal(recognition);
  }, [recognition]);

  return { isListening, transcript, startListening, stopListening, error };
}
