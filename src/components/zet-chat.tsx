'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Mic, Paperclip, Bot, User, Loader2, ArrowLeft, Phone, MoreVertical, Ban, IndianRupee, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { ChatMessage, ChatSession } from '@/services/types'; // Import types
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import { apiClient } from '@/lib/apiClient'; // To interact with backend chat API
import { subscribeToWebSocketMessages, sendWebSocketMessage, ensureWebSocketConnection } from '@/lib/websocket'; // For real-time chat

interface ZetChatProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  chatId?: string; // Optional: If chat already exists
  onPaymentAction?: (type: 'request' | 'send', amount?: number) => void; // For in-chat payment actions
}

const MOCK_CURRENT_USER_ID = auth.currentUser?.uid || "currentUser123"; // Replace with actual current user ID from auth

export function ZetChat({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientAvatar,
  chatId: initialChatId,
  onPaymentAction,
}: ZetChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [chatSessionId, setChatSessionId] = useState<string | null>(initialChatId || null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const currentUserId = auth.currentUser?.uid;

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // Initialize or load chat
  useEffect(() => {
    if (!isOpen || !currentUserId || !recipientId) return;

    setIsLoadingHistory(true);
    setMessages([]); // Clear previous messages

    const initializeChat = async () => {
      try {
        // API call to backend to initiate/get chat session and load history
        const sessionData = await apiClient<ChatSession>(`/chat/initiate/${recipientId}`, { method: 'POST' });
        setChatSessionId(sessionData.id);

        const history = await apiClient<ChatMessage[]>(`/chat/${sessionData.id}/messages`);
        const formattedHistory = history.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
        })).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(formattedHistory);

      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Chat Error', description: error.message || 'Could not load chat.' });
        onClose(); // Close chat on error
      } finally {
        setIsLoadingHistory(false);
      }
    };

    initializeChat();
  }, [isOpen, currentUserId, recipientId, toast, onClose]);

  // WebSocket listener for new messages
  useEffect(() => {
    if (!isOpen || !chatSessionId) return;

    ensureWebSocketConnection(); // Ensure WS is active

    const handleNewMessage = (newMessage: ChatMessage) => {
      if (newMessage.chatId === chatSessionId) {
        setMessages(prev => [...prev, { ...newMessage, timestamp: new Date(newMessage.timestamp) }].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      }
    };

    const unsubscribe = subscribeToWebSocketMessages('chat_message', handleNewMessage);
    return () => unsubscribe();
  }, [isOpen, chatSessionId]);


  const handleSendMessage = async () => {
    const textToSend = inputValue.trim();
    if (!textToSend || isSending || !chatSessionId || !currentUserId) return;

    const tempMessageId = `temp-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: tempMessageId,
      chatId: chatSessionId,
      senderId: currentUserId,
      senderName: auth.currentUser?.displayName || "Me", // Get from auth
      receiverId: recipientId,
      text: textToSend,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      // Send message via API (which will also broadcast via WebSocket)
      const sentMessage = await apiClient<ChatMessage>(`/chat/${chatSessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: textToSend, receiverId: recipientId }),
      });
      // Replace temporary message with confirmed one from server
      setMessages(prev => prev.map(msg => msg.id === tempMessageId ? { ...sentMessage, timestamp: new Date(sentMessage.timestamp) } : msg));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Send Error', description: 'Could not send message.' });
      // Optionally mark message as failed or remove temporary one
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
    } finally {
      setIsSending(false);
    }
  };
  
  const formatTimestampGroup = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  let lastMessageDate: string | null = null;


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] md:max-w-md p-0 flex flex-col h-[85vh] max-h-[700px]">
        <DialogHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={recipientAvatar || `https://picsum.photos/seed/${recipientId}/40/40`} alt={recipientName} data-ai-hint="chat user avatar"/>
              <AvatarFallback>{recipientName?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base">{recipientName}</DialogTitle>
              {/* TODO: Add online/offline status */}
              <DialogDescription className="text-xs">Online</DialogDescription>
            </div>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
          </div>
        </DialogHeader>

        <ScrollArea ref={scrollAreaRef} className="flex-grow p-3 space-y-3 bg-muted/30">
          {isLoadingHistory && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!isLoadingHistory && messages.map((message, index) => {
            const messageDate = formatTimestampGroup(new Date(message.timestamp));
            const showDateSeparator = messageDate !== lastMessageDate;
            lastMessageDate = messageDate;

            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && (
                  <div className="text-center my-3">
                    <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">{messageDate}</span>
                  </div>
                )}
                <div
                  className={cn(
                    "flex items-end gap-2 max-w-[80%]",
                    message.senderId === currentUserId ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  )}
                >
                  <Avatar className={cn("w-6 h-6 border self-start", message.senderId === currentUserId ? "hidden" : "block")}>
                     <AvatarImage src={recipientAvatar || `https://picsum.photos/seed/${message.senderId}/30/30`} alt={message.senderName} data-ai-hint="chat user avatar small"/>
                     <AvatarFallback>{message.senderName?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm break-words shadow-sm relative group",
                      message.senderId === currentUserId
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-background text-foreground rounded-bl-none'
                    )}
                  >
                    {message.text}
                    {/* Payment action buttons (example) */}
                    {message.type === 'payment_request' && onPaymentAction && (
                        <Button size="xs" className="mt-1.5 h-6 text-[10px]" onClick={() => onPaymentAction('send', Number(message.text?.match(/₹(\d+)/)?.[1] || 0))}>Pay Request</Button>
                    )}
                    {message.type === 'payment_receipt' && (
                        <div className="mt-1.5 p-1.5 border-t border-current/20 text-xs flex items-center gap-1">
                           <FileText className="h-3 w-3"/> Receipt: {message.text}
                        </div>
                    )}
                    <span className="text-[10px] text-right mt-0.5 opacity-70 block clear-both">
                        {format(new Date(message.timestamp), 'p')}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </ScrollArea>
        
        <div className="p-3 border-t flex items-center gap-2 bg-background">
          <Button variant="ghost" size="icon" disabled={isSending}><Paperclip className="h-5 w-5 text-muted-foreground"/></Button>
          <Input
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            disabled={isSending || isLoadingHistory}
            className="flex-grow h-9"
          />
          <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isSending || isLoadingHistory} className="h-9">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
