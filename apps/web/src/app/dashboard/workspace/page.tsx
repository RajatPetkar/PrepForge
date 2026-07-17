"use client";

import { useState, useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Code2, Play, CheckCircle2, Circle, Sparkles, MessageSquare, BookOpen, Send, Bot, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SubTopic {
  concept: string;
  understanding_goal: string;
  questions?: string[];
}

interface StudyTask {
  day: number;
  topic: string;
  description: string;
  sub_topics: SubTopic[];
  resources: string[];
  estimated_hours: number;
}

interface StudyPlan {
  id: string;
  target_company: string;
  available_days: number;
  skill_level: string;
  plan: { tasks: StudyTask[] };
  progress: Record<string, boolean>;
  created_at: string;
}

export default function WorkspacePage() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  
  const [selectedQuestion, setSelectedQuestion] = useState<{ day: number; subIdx: number; qIdx: number; question: string } | null>(null);
  const [code, setCode] = useState<string>("// Write your solution here...\n");
  const [language, setLanguage] = useState("javascript");
  
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const [chatMessages, setChatMessages] = useState<{role: "user" | "assistant", content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Clear chat when question changes
  useEffect(() => {
    setChatMessages([]);
    setFeedback(null);
    setIsCorrect(null);
  }, [selectedQuestion]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const userMsg = { role: "user" as const, content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    const assistantMsg = { role: "assistant" as const, content: "" };
    setChatMessages([...newMessages, assistantMsg]);

    try {
      // Build context from feedback
      const contextMsg = feedback ? { role: "system" as const, content: `Context: We are discussing the user's code solution for the problem "${selectedQuestion?.question}". Here was the feedback given: ${feedback}` } : null;
      
      const payloadMessages = contextMsg ? [contextMsg, ...newMessages] : newMessages;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!res.ok) throw new Error("Failed to chat");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accText = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === "chunk") {
                accText += data.content;
                setChatMessages([...newMessages, { role: "assistant", content: accText }]);
              }
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      toast.error("Failed to send message.");
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await fetchApi("/planner/");
      setPlans(data);
      if (data.length > 0) {
        setActivePlanId(data[0].id);
      }
    } catch (e) {
      console.error("Failed to load plans", e);
    }
  };

  const activePlan = plans.find(p => p.id === activePlanId) || null;

  const markQuestionCompleted = async (day: number, subIdx: number, qIdx: number) => {
    if (!activePlan) return;
    const key = `day-${day}-sub-${subIdx}-q-${qIdx}`;
    if (activePlan.progress[key]) return; // already done

    const newProgress = { ...activePlan.progress, [key]: true };
    setPlans(plans.map(p => p.id === activePlan.id ? { ...p, progress: newProgress } : p));
    
    try {
      await fetchApi(`/planner/${activePlan.id}/progress`, {
        method: "PUT",
        body: JSON.stringify({ progress: newProgress })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleEvaluate = async () => {
    if (!selectedQuestion) return;
    setEvaluating(true);
    setFeedback(null);
    setIsCorrect(null);
    
    try {
      const res = await fetchApi("/planner/evaluate", {
        method: "POST",
        body: JSON.stringify({
          question: selectedQuestion.question,
          code,
          language
        })
      });
      
      setIsCorrect(res.is_correct);
      setFeedback(res.feedback);
      
      if (res.is_correct) {
        toast.success("Correct! Great job.");
        markQuestionCompleted(selectedQuestion.day, selectedQuestion.subIdx, selectedQuestion.qIdx);
      } else {
        toast.error("Not quite right. Check the feedback.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to evaluate code");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4 w-full mx-auto overflow-hidden">
      
      {/* Left Panel: Plan / Questions */}
      <div className="w-80 flex flex-col gap-4 shrink-0 h-full">
        <div className="glass-card p-4 rounded-xl border-border/50">
          <h2 className="font-bold flex items-center gap-2 mb-3"><BookOpen className="w-4 h-4 text-primary" /> Select Plan</h2>
          {plans.length > 0 ? (
            <Select value={activePlanId || ""} onValueChange={(val) => {
              setActivePlanId(val);
              setSelectedQuestion(null);
            }}>
              <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.target_company || "General Tech"} ({p.available_days} Days)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">No active plan. Generate one in the Planner.</p>
          )}
        </div>
        
        <ScrollArea className="flex-1 glass-card border-border/50 rounded-xl overflow-y-auto">
          <div className="p-3 space-y-4">
            {activePlan?.plan.tasks.map((task) => (
              <div key={task.day} className="space-y-2">
                <div className="font-semibold text-sm flex items-center gap-2 text-primary">
                  <span>Day {task.day}:</span>
                  <span className="truncate">{task.topic}</span>
                </div>
                <div className="pl-2 space-y-3">
                  {task.sub_topics?.map((sub, sIdx) => (
                    <div key={sIdx} className="space-y-1.5">
                      <p className="text-xs font-medium text-foreground">{sub.concept}</p>
                      {sub.questions?.length ? (
                        <div className="space-y-1">
                          {sub.questions.map((q, qIdx) => {
                            const isDone = activePlan.progress[`day-${task.day}-sub-${sIdx}-q-${qIdx}`];
                            const isSelected = selectedQuestion?.day === task.day && selectedQuestion?.subIdx === sIdx && selectedQuestion?.qIdx === qIdx;
                            return (
                              <button
                                key={qIdx}
                                onClick={() => setSelectedQuestion({ day: task.day, subIdx: sIdx, qIdx, question: q })}
                                className={cn(
                                  "w-full text-left flex items-start gap-2 p-2 rounded-lg text-xs transition-colors border",
                                  isSelected ? "bg-primary/20 border-primary/50 text-primary" : "hover:bg-muted/50 border-transparent",
                                  isDone && !isSelected && "opacity-60"
                                )}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                                </div>
                                <span className={cn("leading-tight", isDone && "line-through")}>{q}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">No questions for this topic.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Center Panel: Code Editor */}
      <Card className="flex-1 flex flex-col glass-card border-border/50 overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            {selectedQuestion ? "Code Editor" : "Select a question"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-muted text-xs rounded px-2 py-1 border-border/50 focus:outline-none"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
            <Button 
              size="sm" 
              onClick={handleEvaluate} 
              disabled={!selectedQuestion || evaluating}
              className="h-7 text-xs gap-1.5 glow"
            >
              {evaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Submit Code
            </Button>
          </div>
        </CardHeader>
        <div className="p-4 bg-muted/20 border-b border-border/50 min-h-16">
          <p className="text-sm font-medium">
            {selectedQuestion ? selectedQuestion.question : "Select a practice question from your study plan on the left to begin coding."}
          </p>
        </div>
        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              padding: { top: 16 },
              scrollBeyondLastLine: false
            }}
          />
        </div>
      </Card>

      {/* Right Panel: Feedback & Chat */}
      <div className="w-96 flex flex-col gap-4 shrink-0 h-full">
        <Card className="flex-1 flex flex-col glass-card border-border/50 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border/50">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Evaluation & Feedback
            </CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {evaluating && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">Analyzing your approach...</p>
              </div>
            )}
            
            {!evaluating && feedback && (
              <div className="space-y-4">
                <div className={cn(
                  "p-3 rounded-xl border flex items-start gap-3",
                  isCorrect ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-red-500/10 border-red-500/30 text-red-500"
                )}>
                  {isCorrect ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <Circle className="w-5 h-5 shrink-0" />}
                  <div>
                    <p className="font-semibold">{isCorrect ? "Correct Solution!" : "Needs Improvement"}</p>
                    <p className="text-xs opacity-90 mt-0.5">
                      {isCorrect ? "Your code solves the problem and handles edge cases." : "Your code has some issues. See the feedback below."}
                    </p>
                  </div>
                </div>
                
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {feedback}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {!evaluating && !feedback && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-10 opacity-60">
                <MessageSquare className="w-10 h-10" />
                <p className="text-sm text-center px-4">Submit your code to get detailed feedback, edge case analysis, and alternate approaches.</p>
              </div>
            )}

            {/* Chat Messages */}
            {chatMessages.length > 0 && (
              <div className="mt-6 space-y-4 border-t border-border/50 pt-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Follow-up Discussion</h3>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div className={cn("rounded-xl px-3 py-2 max-w-[85%] text-sm", msg.role === "user" ? "bg-primary/10 text-primary" : "bg-muted")}>
                      {msg.content ? (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-snug prose-pre:bg-background/50 prose-pre:p-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center h-5">
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce mr-1"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce mr-1" style={{ animationDelay: "0.2s" }}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Chat Input */}
          {feedback && (
            <div className="p-3 border-t border-border/50 bg-background/50">
              <form onSubmit={handleChatSubmit} className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ask a question about this feedback..."
                  className="w-full bg-muted border border-border/50 rounded-full pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-1 w-8 h-8 rounded-full text-primary hover:bg-primary/20 hover:text-primary"
                  disabled={!chatInput.trim() || chatLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
