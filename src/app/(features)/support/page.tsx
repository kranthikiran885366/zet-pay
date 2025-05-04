
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, MessageSquare, Bot, User, Loader2, Paperclip, Phone } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation'; // To get ticket ID from URL

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: Date;
}

export default function SupportChatPage() {
  const searchParams = useSearchParams();
  const initialTicketId = searchParams.get('ticketId');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Simulate connection and initial messages
  useEffect(() => {
    setIsConnecting(true);
    setMessages([
      { id: 'sys-1', text: `Connecting you to support...${initialTicketId ? ` (Regarding Ticket: ${initialTicketId})` : ''}`, sender: 'system', timestamp: new Date() },
    ]);

    // Simulate connection delay
    const connectTimer = setTimeout(() => {
      setIsConnecting(false);
      setIsAgentConnected(true);
      setMessages(prev => [
        ...prev,
        { id: 'sys-2', text: "Connected to Support Agent Priya.", sender: 'system', timestamp: new Date() },
        { id: 'agent-1', text: "Hello! Thanks for reaching out. How can I help you today?", sender: 'agent', timestamp: new Date() }
      ]);
    }, 2500);

    return () => clearTimeout(connectTimer);
  }, [initialTicketId]);

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
    if (!textToSend || isSending || !isAgentConnected) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);

    // Simulate agent response delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate agent response (TODO: Replace with real-time chat integration e.g., Firebase, WebSocket)
    const agentResponse: ChatMessage = {
      id: `agent-${Date.now()}`,
      text: "Okay, I understand. Let me check that for you...", // Generic response
      sender: 'agent',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, agentResponse]);
    setIsSending(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUploadClick = () => {
      // Trigger hidden file input
      document.getElementById('chat-file-upload')?.click();
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          // TODO: Implement file upload logic (e.g., to Firebase Storage)
          console.log("Selected file:", file.name);
          toast({ description: `Uploading ${file.name}... (Not implemented)`});
           // Simulate upload and sending file message
           const fileMessage: ChatMessage = {
              id: `user-file-${Date.now()}`,
              text: `Attached file: ${file.name}`,
              sender: 'user',
              timestamp: new Date(),
          };
          setMessages(prev => [...prev, fileMessage]);
      }
       // Reset file input value so the same file can be selected again
       event.target.value = '';
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-md">
        <div className='flex items-center gap-2'>
            <Link href="/profile" passHref>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-green-400">
                  <AvatarImage src="/logos/support_agent.png" alt="Agent" />
                  <AvatarFallback>A</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-base font-semibold">PayFriend Support</h1>
                    <p className="text-xs opacity-80">{isAgentConnected ? 'Agent Priya (Online)' : isConnecting ? 'Connecting...' : 'Offline'}</p>
                </div>
            </div>
        </div>
        {/* Optional: Call Button */}
         <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => alert('Calling support... (Not implemented)')}>
             <Phone className="h-5 w-5"/>
         </Button>
      </header>

      {/* Chat Area */}
      <main className="flex-grow flex flex-col p-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="flex-grow p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2 max-w-[85%]",
                message.sender === 'user' ? 'ml-auto flex-row-reverse' : message.sender === 'system' ? 'justify-center' : 'mr-auto',
              )}
            >
              {message.sender === 'agent' && (
                <Avatar className="w-6 h-6 border self-start">
                  <AvatarImage src="/logos/support_agent.png" alt="Agent" />
                  <AvatarFallback>A</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm break-words shadow-sm",
                  message.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' :
                  message.sender === 'agent' ? 'bg-background text-foreground rounded-bl-none' :
                  'bg-transparent text-muted-foreground text-xs italic text-center w-full' // System message style
                )}
              >
                {message.text}
                {message.sender !== 'system' && (
                    <p className="text-[10px] text-right mt-1 opacity-70">
                        {format(message.timestamp, 'p')}
                    </p>
                )}
              </div>
              {message.sender === 'user' && (
                 <Avatar className="w-6 h-6 border self-start">
                   <AvatarFallback><User size={14} /></AvatarFallback>
                 </Avatar>
              )}
            </div>
          ))}
           {isConnecting && (
            <div className="flex justify-center py-2">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/>
            </div>
           )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t flex items-center gap-2 bg-background">
           <Button variant="ghost" size="icon" onClick={handleFileUploadClick} disabled={!isAgentConnected || isSending}>
               <Paperclip className="h-5 w-5 text-muted-foreground"/>
               <input type="file" id="chat-file-upload" className="hidden" onChange={handleFileChange} />
           </Button>
          <Input
            placeholder={isAgentConnected ? "Type your message..." : "Please wait for an agent..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isAgentConnected || isSending}
            className="flex-grow"
          />
          <Button onClick={handleSendMessage} disabled={!inputValue.trim() || !isAgentConnected || isSending}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </main>
    </div>
  );
}
