"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function ChatWidget({ courseId }: { courseId: string }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'bot', content: string }[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMsg }],
                    context: { courseId } // Pass course ID for RAG context
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => [...prev, { role: 'bot', content: data.message }]);
            } else {
                setMessages(prev => [...prev, { role: 'bot', content: "Error: " + data.error }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'bot', content: "Failed to send message." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!open && (
                <Button size="icon" className="h-12 w-12 rounded-full shadow-lg" onClick={() => setOpen(true)}>
                    <MessageCircle className="h-6 w-6" />
                </Button>
            )}

            {open && (
                <div className="bg-background border rounded-lg shadow-xl w-80 h-[500px] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center bg-primary text-primary-foreground rounded-t-lg">
                        <h3 className="font-semibold">AI Tutor</h3>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground" onClick={() => setOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground mt-10">
                                    Ask me anything about this course!
                                </p>
                            )}
                            {messages.map((m, i) => (
                                <div key={i} className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "rounded-lg px-3 py-2 text-sm max-w-[80%]",
                                        m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                                    )}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted rounded-lg px-3 py-2 text-sm animate-pulse">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t flex gap-2">
                        <Input
                            placeholder="Type a question..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <Button size="icon" onClick={handleSend} disabled={loading || !input}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
