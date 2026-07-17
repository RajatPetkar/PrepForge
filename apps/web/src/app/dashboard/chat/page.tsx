"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Sparkles, RotateCcw, Copy, Check, Paperclip, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Citation {
  score: number;
  title?: string;
  topic?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

const suggestions = [
  "Explain Dynamic Programming with examples",
  "How does database indexing work?",
  "What are the SOLID principles?",
  "Explain CAP theorem in distributed systems",
  "How to approach system design interviews?",
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hello! 👋 I'm your AI Placement Assistant powered by a curated knowledge base. Ask me anything about **DSA**, **System Design**, **DBMS**, **OS**, **Computer Networks**, or specific **company interview prep**. I'll answer with cited sources!",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfContext, setPdfContext] = useState<string>("");
  const [pdfName, setPdfName] = useState<string>("");
  const [conversations, setConversations] = useState<{id: string, title: string}[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectConversation = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setThreadId(id);
    setPdfContext("");
    setPdfName("");
    try {
      const res = await fetch(`${API_URL}/chat/history?thread_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          clearChat();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/chat/conversations/${id}`, { 
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const newConvs = conversations.filter(c => c.id !== id);
      setConversations(newConvs);
      if (threadId === id) {
        clearChat();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/chat/upload-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to extract PDF");
      const data = await res.json();
      setPdfContext(data.text);
      setPdfName(file.name);
    } catch (err) {
      console.error(err);
      alert("Could not upload PDF.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const assistantMsg: Message = { role: "assistant", content: "", citations: [] };
    setMessages([...newMessages, assistantMsg]);

    try {
      const res = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: newMessages, thread_id: threadId || undefined, pdf_context: pdfContext || undefined }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const message =
          errorBody?.message ||
          errorBody?.detail ||
          `Server error: ${res.status}`;

        if (
          res.status === 401 ||
          res.status === 403 ||
          (res.status === 404 && message.toLowerCase().includes("user"))
        ) {
          localStorage.removeItem("token");
          router.replace("/auth/login");
          throw new Error("Your session is no longer valid. Please sign in again.");
        }

        throw new Error(message);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accText = "";
      let accCitations: Citation[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.token) {
              const tokenText: string = parsed.token;
              const metaMatch = tokenText.match(/<CONTEXT_METADATA>([\.\s\S]*?)<\/CONTEXT_METADATA>/);
              let cleanText = tokenText;
              if (metaMatch) {
                try { accCitations = JSON.parse(metaMatch[1]); } catch { /* ignore */ }
                cleanText = tokenText.replace(metaMatch[0], "");
              }
              accText = accText + cleanText;
              const snapshot = accText;
              const citSnap = accCitations;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: snapshot, citations: citSnap };
                return updated;
              });
            } else if (parsed.status === "done" && parsed.thread_id) {
              if (!threadId) {
                setThreadId(parsed.thread_id);
                loadConversations();
              }
            }
          } catch { /* partial chunk, ignore */ }
        }
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `⚠️ ${message}`,
        };
        return updated;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setThreadId(null);
    setPdfContext("");
    setPdfName("");
    setMessages([{
      role: "assistant",
      content: "Chat cleared! Ask me anything about DSA, System Design, or interview preparation. 🚀",
    }]);
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4 w-full max-w-6xl mx-auto">
      {/* Sidebar for conversations */}
      <div className="w-64 flex flex-col gap-4 shrink-0 hidden md:flex">
        <Button onClick={clearChat} className="w-full justify-start gap-2" variant="outline">
          <Sparkles className="w-4 h-4" />
          New Chat
        </Button>
        <ScrollArea className="flex-1 glass-card border-border/50 rounded-xl">
          <div className="p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">History</p>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between cursor-pointer group",
                  threadId === conv.id ? "bg-primary/20 text-primary font-medium" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="truncate pr-2">{conv.title}</span>
                <button 
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all shrink-0"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-col flex-1 gap-0 overflow-hidden">
        {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Interview Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">RAG-powered answers with citations from the knowledge base</p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground">
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Clear
        </Button>
      </div>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col glass-card border-border/50 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}

                <div className={cn("flex flex-col gap-2 max-w-[85%]", msg.role === "user" ? "items-end" : "items-start")}>
                  {/* Bubble */}
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed group relative",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted/50 rounded-tl-sm"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || "▍"}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {/* Copy btn */}
                    {msg.content && (
                      <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton text={msg.content} />
                      </div>
                    )}
                  </div>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.slice(0, 4).map((c, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium"
                        >
                          [{idx + 1}] {c.title ?? c.topic ?? "Source"} · {Math.round((c.score ?? 0) * 100)}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
                <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-4 py-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-accent/50 text-accent-foreground border border-border/50 hover:bg-primary/15 hover:text-primary hover:border-primary/30 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex flex-col gap-2 max-w-3xl mx-auto">
            {pdfName && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-lg w-fit border border-primary/20">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="font-medium">{pdfName}</span>
                <button onClick={() => { setPdfContext(""); setPdfName(""); }} className="hover:text-primary/70 transition-colors">
                  <X className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-xl shrink-0 border-border/50 hover:bg-muted/50 transition-colors"
                title="Upload PDF Context"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              </Button>
              <div className="flex-1 relative">
                <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about DSA, System Design, or any tech interview topic... (Enter to send)"
                disabled={loading}
                rows={1}
                className="w-full resize-none bg-muted/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50 placeholder:text-muted-foreground max-h-32"
                style={{ minHeight: "48px" }}
              />
            </div>
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              size="icon"
              className="h-12 w-12 rounded-xl shrink-0 glow disabled:glow-none"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          </div>
          <p className="text-xs text-muted-foreground/50 text-center mt-2">Shift+Enter for new line</p>
        </div>
      </Card>
      </div>
    </div>
  );
}
