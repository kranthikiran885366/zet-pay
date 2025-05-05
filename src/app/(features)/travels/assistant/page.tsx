'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Bot, User, Loader2, WandSparkles, Mic } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AssistantMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
}

// Mock Travel Assistant Responses (Replace with actual AI integration)
const getAssistantResponse = async (userMessage: string): Promise<string> => {
  console.log("Sending message to travel assistant:", userMessage);
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); // Simulate AI thinking time

  const lowerCaseMessage = userMessage.toLowerCase();

  if (lowerCaseMessage.includes("plan a trip to goa")) {
    return "Okay, planning a trip to Goa! For how many days and when are you planning to travel? Also, what's your approximate budget per person?";
  } else if (lowerCaseMessage.includes("book flight") && lowerCaseMessage.includes("mumbai")) {
    return "Sure, I can help with that. Which date are you looking to fly from your current location to Mumbai?";
  } else if (lowerCaseMessage.includes("find hotels in ooty")) {
    return "Looking for hotels in Ooty. What are your check-in and check-out dates, and how many guests will be staying?";
  } else if (lowerCaseMessage.includes("suggest")) {
     return "I can suggest activities based on your destination and interests! Where are you thinking of going?";
  } else if (lowerCaseMessage.includes("help") || lowerCaseMessage.includes("can you")) {
     return "I can help you plan trips, book flights, buses, trains, hotels, find activities, and manage your itinerary. How can I assist you today?";
  } else {
    return "I'm ready to help plan your next adventure! Tell me where you want to go or what you need help with (e.g., 'Plan a 3-day trip to Manali', 'Book a flight to Delhi next Friday').";
  }
};

export default function TravelAssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initial message from assistant
  useEffect(() => {
    setMessages([
      { id: 'assistant-init', text: "Hi there! I'm your AI Travel Assistant. How can I help you plan or book your travel today?", sender: 'assistant', timestamp: new Date() }
    ]);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    const textToSend = inputValue.trim();
    if (!textToSend || isSending) return;

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };
    const loadingMessage: AssistantMessage = {
        id: `assistant-loading-${Date.now()}`,
        text: 'Thinking...',
        sender: 'assistant',
        timestamp: new Date(),
        isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      const responseText = await getAssistantResponse(textToSend);
      const assistantResponse: AssistantMessage = {
        id: loadingMessage.id, // Use same ID to replace loading indicator
        text: responseText,
        sender: 'assistant',
        timestamp: new Date(),
        isLoading: false, // Mark as not loading
      };
      setMessages(prev => prev.map(msg => msg.id === loadingMessage.id ? assistantResponse : msg));
    } catch (error) {
      console.error("Error getting assistant response:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not get a response from the assistant." });
       setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id)); // Remove loading message on error
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <WandSparkles className="h-6 w-6" />
        <h1 className="text-lg font-semibold">AI Travel Assistant</h1>
      </header>

      {/* Chat Area */}
       <main className="flex-grow flex flex-col p-0 overflow-hidden">
         <ScrollArea ref={scrollAreaRef} className="flex-grow p-4 space-y-4">
           {messages.map((message) => (
             <div
               key={message.id}
               className={cn(
                 "flex items-start gap-3 max-w-[85%]",
                 message.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
               )}
             >
               <Avatar className="w-8 h-8 border self-start">
                  <AvatarFallback>
                     {message.sender === 'user' ? <User size={18} /> : <Bot size={18} className="text-primary"/>}
                  </AvatarFallback>
               </Avatar>
               <div
                 className={cn(
                   "rounded-lg px-3 py-2 text-sm break-words shadow-sm",
                   message.sender === 'user'
                     ? 'bg-primary text-primary-foreground rounded-br-none'
                     : 'bg-background text-foreground rounded-bl-none',
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
             </div>
           ))}
         </ScrollArea>

         {/* Input Area */}
         <div className="p-4 border-t flex items-center gap-2 bg-background">
           <Button variant="ghost" size="icon" disabled>
              <Mic className="h-5 w-5 text-muted-foreground"/>
           </Button>
           <Input
             placeholder="Ask me to plan a trip, book flights, find hotels..."
             value={inputValue}
             onChange={(e) => setInputValue(e.target.value)}
             onKeyDown={handleKeyDown}
             disabled={isSending}
             className="flex-grow"
           />
           <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isSending}>
             {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
           </Button>
         </div>
       </main>
    </div>
  );
}
