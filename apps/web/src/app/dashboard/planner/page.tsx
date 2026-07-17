"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import { Loader2, Clock, BookOpen, Target, Zap, ChevronRight, Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SubTopic {
  concept: string;
  understanding_goal: string;
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

const difficultyColors: Record<string, string> = {
  Beginner: "text-green-400 bg-green-400/10 border-green-400/20",
  Intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Advanced: "text-red-400 bg-red-400/10 border-red-400/20",
};

const companies = ["Google", "Amazon", "Microsoft", "Meta", "Apple", "Adobe", "Goldman Sachs", "JP Morgan", "Infosys", "TCS", "Startup"];

export default function PlannerPage() {
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState("");
  const [days, setDays] = useState("30");
  const [skill, setSkill] = useState("Intermediate");
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await fetchApi("/planner/");
      setPlans(data);
      if (data.length > 0 && !activePlanId) {
        setActivePlanId(data[0].id);
      }
    } catch (e) {
      console.error("Failed to load plans", e);
    }
  };

  const activePlan = plans.find(p => p.id === activePlanId) || null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await fetchApi("/planner/generate", {
        method: "POST",
        body: JSON.stringify({ target_company: company, available_days: parseInt(days), skill_level: skill }),
      });
      setPlans([data, ...plans]);
      setActivePlanId(data.id);
      toast.success("Your personalized study plan is ready!");
    } catch (err) {
      toast.error((err as Error).message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const toggleProgress = async (day: number, subTopicIdx: number) => {
    if (!activePlan) return;
    const key = `day-${day}-sub-${subTopicIdx}`;
    const newProgress = { ...activePlan.progress, [key]: !activePlan.progress[key] };
    
    // Optimistic update
    setPlans(plans.map(p => p.id === activePlan.id ? { ...p, progress: newProgress } : p));
    
    try {
      await fetchApi(`/planner/${activePlan.id}/progress`, {
        method: "PUT",
        body: JSON.stringify({ progress: newProgress })
      });
    } catch (e) {
      toast.error("Failed to save progress");
      // Revert on fail
      setPlans(plans);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this study plan?")) return;
    try {
      await fetchApi(`/planner/${id}`, { method: "DELETE" });
      const newPlans = plans.filter(p => p.id !== id);
      setPlans(newPlans);
      if (activePlanId === id) {
        setActivePlanId(newPlans.length > 0 ? newPlans[0].id : null);
      }
      toast.success("Plan deleted successfully");
    } catch (e) {
      toast.error("Failed to delete plan");
    }
  };

  const createNewPlan = () => {
    setActivePlanId(null);
    setCompany("");
    setDays("30");
    setSkill("Intermediate");
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6 w-full max-w-7xl mx-auto">
      
      {/* Sidebar */}
      <div className="w-64 flex flex-col gap-4 shrink-0 hidden md:flex h-full">
        <Button onClick={createNewPlan} className="w-full justify-start gap-2" variant="outline">
          <Plus className="w-4 h-4" />
          Create New Plan
        </Button>
        <ScrollArea className="flex-1 glass-card border-border/50 rounded-xl overflow-hidden">
          <div className="p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Your Plans</p>
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePlanId(p.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors truncate flex flex-col gap-1",
                  activePlanId === p.id ? "bg-primary/20 text-primary font-medium" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{p.target_company || "General Tech"}</span>
                <span className="text-[10px] opacity-70">{p.available_days} Days • {p.skill_level}</span>
              </button>
            ))}
            {plans.length === 0 && (
              <p className="text-xs text-muted-foreground px-2">No plans yet.</p>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          AI Study Planner
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate a personalized day-by-day interview preparation roadmap powered by AI.
        </p>
      </div>

      {/* Config form */}
      {!activePlanId && (
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Configure Your Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="company">Target Company</Label>
                <Select value={company} onValueChange={(val) => setCompany(val as string)} disabled={loading}>
                  <SelectTrigger id="company" className="h-10">
                    <SelectValue placeholder="Pick a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="General">General Tech Role</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="days">Days Available</Label>
                <Input
                  id="days"
                  type="number"
                  min="7" max="90"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  disabled={loading}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skill">Your Level</Label>
                <Select value={skill} onValueChange={(val) => setSkill(val as string)} disabled={loading}>
                  <SelectTrigger id="skill" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading || !company} className="h-10 font-semibold glow">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Zap className="mr-2 h-4 w-4" /> Generate Plan</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Plan results */}
      {activePlan && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl border-border/50">
            <div>
              <h2 className="text-xl font-bold">
                {activePlan.available_days}-Day Plan for{" "}
                <span className="gradient-text">{activePlan.target_company || "General Tech"}</span>
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={cn("text-xs px-3 py-1 rounded-full border font-medium", difficultyColors[activePlan.skill_level])}>
                  {activePlan.skill_level}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Object.values(activePlan.progress || {}).filter(Boolean).length} tasks completed
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => deletePlan(activePlan.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Plan
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {activePlan.plan.tasks.map((task) => (
              <Card key={task.day} className="glass-card border-border/50 hover:border-primary/30 transition-all duration-200 group flex flex-col">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        D{task.day}
                      </span>
                      <div>
                        <CardTitle className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                          {task.topic}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          {task.estimated_hours} hours
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                  
                  {/* Subtopics / Concepts */}
                  {task.sub_topics?.length > 0 && (
                    <div className="space-y-2 mt-auto">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key Concepts</p>
                      {task.sub_topics.map((sub, idx) => {
                        const isDone = activePlan.progress[`day-${task.day}-sub-${idx}`];
                        return (
                          <div 
                            key={idx} 
                            onClick={() => toggleProgress(task.day, idx)}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                              isDone ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/50 hover:border-primary/30"
                            )}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isDone ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div>
                              <p className={cn("text-sm font-medium", isDone && "text-muted-foreground line-through")}>{sub.concept}</p>
                              <p className={cn("text-xs mt-1", isDone ? "text-muted-foreground/70" : "text-muted-foreground")}>{sub.understanding_goal}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Resources */}
                  {task.resources?.length > 0 && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                        <BookOpen className="w-3.5 h-3.5 text-primary" /> Recommended Material
                      </p>
                      <ul className="space-y-1.5">
                        {task.resources.map((r, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!activePlanId && !loading && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Ready to crush your interviews?</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Create your first personalized study plan tailored to your target company, timeline, and current skill level.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
