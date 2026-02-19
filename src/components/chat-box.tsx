"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

export function ChatBox() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input.trim(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: data.content || "Done!",
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: "Sorry, something went wrong. Please try again.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.01] shadow-xl backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-100">AI Assistant</h3>
                        <p className="text-xs text-zinc-500">Ask me to manage your bookmarks</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
                            <Sparkles className="h-8 w-8 text-zinc-600" />
                        </div>
                        <h4 className="mb-2 text-sm font-medium text-zinc-300">How can I help?</h4>
                        <p className="max-w-[200px] text-xs text-zinc-500">
                            Try &quot;Add a bookmark for Google&quot; or &quot;Delete the Twitter bookmark&quot;
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user"
                                        ? "bg-indigo-600/80 text-white"
                                        : "bg-white/[0.05] text-zinc-200"
                                        }`}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="rounded-2xl bg-white/[0.05] px-4 py-2.5">
                                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-white/[0.08] bg-white/[0.02] p-3">
                <div className="relative flex items-center">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full rounded-xl border border-white/[0.05] bg-black/20 px-4 py-3 pr-12 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 rounded-lg bg-indigo-500 p-1.5 text-white shadow-lg transition-transform hover:bg-indigo-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
}
