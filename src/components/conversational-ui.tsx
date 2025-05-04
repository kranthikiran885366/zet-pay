
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Mic, Loader2, Bot, User } from 'lucide-react';
import { processConversationalQuery, ConversationalQueryInput, ConversationalQueryOutput } from '@/ai/flows/conversational-action';
import { useToast } from '@/hooks/use-toast';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase'; // Import auth to get user ID
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isLoading?: boolean;
  actionData?: ConversationalQueryOutput; // Store the structured AI response
}

export function ConversationalUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { isListening, transcript, startListening, stopListening, error: voiceError } = useVoiceCommands();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get user ID
    const unsubscribe = auth.onAuthStateChanged((user) => {
        setUserId(user ? user.uid : null);
         if (!user && messages.length === 0) {
             // Add initial message if user logs out or isn't logged in initially
             setMessages([{ id: `ai-initial-${Date.now()}`, text: "Hello! Please log in to use conversational actions.", sender: 'ai'}]);
         } else if (user && messages.length === 0) {
              // Add initial greeting when logged in
              setMessages([{ id: `ai-initial-${Date.now()}`, text: "Hello! How can I help you with recharges, bookings, or payments today?", sender: 'ai'}]);
         }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Handle voice input transcript
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
      // Optionally send immediately after transcript finalized:
      // handleSendMessage(transcript);
    }
  }, [transcript]);

   // Handle voice errors
  useEffect(() => {
    if (voiceError) {
      toast({ variant: 'destructive', title: 'Voice Error', description: voiceError });
    }
  }, [voiceError, toast]);

  const handleSendMessage = useCallback(async (messageText?: string) => {
    const textToSend = (messageText || inputValue).trim();
    if (!textToSend || isSending || !userId) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: textToSend,
      sender: 'user',
    };
    const loadingMessage: Message = {
      id: `ai-loading-${Date.now()}`,
      text: 'Thinking...',
      sender: 'ai',
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      const input: ConversationalQueryInput = { userId, query: textToSend };
      const result = await processConversationalQuery(input);

      const aiResponseMessage: Message = {
        id: `ai-${Date.now()}`,
        text: result.responseText,
        sender: 'ai',
        actionData: result, // Store the full result
      };

      // Replace loading message with actual response
      setMessages(prev => prev.map(msg => msg.id === loadingMessage.id ? aiResponseMessage : msg));

      // TODO: Add logic here to handle the `result.actionType` and `result.details`
      // For now, it just displays the response.
      // Example: If action is 'mobileRecharge' and details are complete, show a confirmation button.
      // If action is 'clarification', keep the input focused for user reply.
      if (result.actionType === 'clarification' && inputRef.current) {
          inputRef.current.focus();
      }

    } catch (error) {
      console.error("Error processing conversational query:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not process your request.' });
      // Replace loading message with error message
       const aiErrorMessage: Message = {
         id: loadingMessage.id, // Use same ID to replace
         text: "Sorry, I encountered an error. Please try again.",
         sender: 'ai',
         isLoading: false,
       };
       setMessages(prev => prev.map(msg => msg.id === loadingMessage.id ? aiErrorMessage : msg));
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, userId, toast]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceButtonClick = () => {
      if (isListening) {
          stopListening();
      } else {
          startListening();
      }
  };


  return (
    <Card className="w-full h-[calc(100vh-150px)] flex flex-col shadow-xl"> {/* Adjust height as needed */}
      <CardHeader className="border-b p-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="text-primary" /> Conversational Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0 flex flex-col">
        <ScrollArea ref={scrollAreaRef} className="flex-grow p-4 space-y-4">
           {messages.map((message) => (
             <div
               key={message.id}
               className={cn(
                 "flex items-start gap-3",
                 message.sender === 'user' ? 'justify-end' : 'justify-start'
               )}
             >
               {message.sender === 'ai' && (
                 <Avatar className="w-7 h-7 border">
                   <AvatarFallback><Bot size={16} className="text-primary" /></AvatarFallback>
                 </Avatar>
               )}
               <div
                 className={cn(
                   "max-w-[75%] rounded-lg px-3 py-2 text-sm break-words",
                   message.sender === 'user'
                     ? 'bg-primary text-primary-foreground'
                     : 'bg-muted',
                   message.isLoading && 'text-muted-foreground italic'
                 )}
               >
                 {message.isLoading ? (
                    <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin"/>
                        <span>Thinking...</span>
                    </div>
                 ) : (
                    message.text
                 )}
               </div>
                {message.sender === 'user' && (
                 <Avatar className="w-7 h-7 border">
                   <AvatarFallback><User size={16} /></AvatarFallback>
                 </Avatar>
               )}
             </div>
           ))}
        </ScrollArea>
        <div className="p-4 border-t flex items-center gap-2 bg-background">
           <Button variant="ghost" size="icon" onClick={handleVoiceButtonClick} disabled={isSending || !userId}>
              <Mic className={cn("h-5 w-5", isListening ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
           </Button>
          <Input
            ref={inputRef}
            placeholder={isListening ? "Listening..." : "Ask me to recharge, book, or pay..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || isListening || !userId}
            className="flex-grow"
          />
          <Button onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isSending || isListening || !userId}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
