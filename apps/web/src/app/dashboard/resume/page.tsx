"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle, XCircle, Lightbulb, FileText, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ATSScore {
  overall_score: number;
  keyword_match: number;
  formatting_score: number;
  impact_score: number;
}

interface ResumeAnalysis {
  ats_score: ATSScore;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
          <circle
            cx="32" cy="32" r={r} fill="none" strokeWidth="5"
            strokeDasharray={`${fill} ${circ}`}
            className={cn("transition-all duration-700", color)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">{score}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
    </div>
  );
}

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDesc, setJobDesc] = useState("Software Engineer - Full Stack");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") setFile(dropped);
    else toast.error("Please upload a PDF file.");
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Please upload a resume PDF."); return; }
    setLoading(true);
    setAnalysis(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_description", jobDesc);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/resume/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || "Failed to analyze resume");
      }
      const data: ResumeAnalysis = await res.json();
      setAnalysis(data);
      toast.success("Resume analyzed! Check your results below.");
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getColor = (s: number) => s >= 80 ? "stroke-green-400" : s >= 60 ? "stroke-yellow-400" : "stroke-red-400";
  const getBg = (s: number) => s >= 80 ? "text-green-400" : s >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Resume Analyzer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Upload your resume to get an ATS score, keyword analysis, and actionable feedback.</p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Upload form */}
        <Card className="glass-card border-border/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Upload & Configure</CardTitle>
            <CardDescription>We support PDF format only.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById("resume-input")?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                  dragOver ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50 hover:bg-muted/30",
                  file ? "bg-primary/5 border-primary/50" : ""
                )}
              >
                <input
                  id="resume-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium text-primary truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Drop your PDF here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDesc">Target Job Description</Label>
                <Input
                  id="jobDesc"
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer at Google"
                  disabled={loading}
                  className="h-10"
                />
              </div>

              <Button type="submit" disabled={!file || loading} className="w-full h-11 font-semibold glow">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing your resume...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Analyze Resume</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Score card */}
        <div className="md:col-span-3 space-y-5">
          {analysis ? (
            <>
              {/* Overall score */}
              <Card className="glass-card border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">ATS Score Overview</CardTitle>
                    <span className={cn("text-4xl font-black", getBg(analysis.ats_score.overall_score))}>
                      {analysis.ats_score.overall_score}
                      <span className="text-lg text-muted-foreground font-normal">/100</span>
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-around py-2">
                    <ScoreRing score={analysis.ats_score.keyword_match} label="Keywords" color={getColor(analysis.ats_score.keyword_match)} />
                    <ScoreRing score={analysis.ats_score.formatting_score} label="Formatting" color={getColor(analysis.ats_score.formatting_score)} />
                    <ScoreRing score={analysis.ats_score.impact_score} label="Impact" color={getColor(analysis.ats_score.impact_score)} />
                  </div>
                </CardContent>
              </Card>

              {/* Feedback grid */}
              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="glass-card border-green-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-4 h-4" /> Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-green-400 mt-0.5">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="glass-card border-red-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                      <XCircle className="w-4 h-4" /> Weaknesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-red-400 mt-0.5">•</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="glass-card border-blue-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-blue-400">
                      <Lightbulb className="w-4 h-4" /> Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="glass-card border-border/50 h-full flex items-center justify-center min-h-64">
              <div className="text-center p-8">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">Upload your resume to see your ATS score and detailed feedback here.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
