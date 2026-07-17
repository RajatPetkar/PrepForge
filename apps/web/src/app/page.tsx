"use client";

import Link from "next/link";
import { ArrowRight, Brain, Zap, Shield, Star, BookOpen, FileText, MessageSquare, BarChart3, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: MessageSquare, title: "AI Chat with RAG", desc: "Ask DSA, aptitude, OS, DBMS questions with verified citations from our curated knowledge base." },
  { icon: FileText, title: "Resume Analyzer", desc: "Upload your resume and get instant ATS score, keyword gaps, and company-specific optimization tips." },
  { icon: BookOpen, title: "Smart Study Planner", desc: "Generate a personalized day-by-day roadmap based on your target company and available time." },
  { icon: Shield, title: "Production-Ready RAG", desc: "Hybrid BM25 + dense retrieval with reranking and context compression for accurate answers." },
];

const stats = [
  { value: "10k+", label: "Interview Questions" },
  { value: "98%", label: "Accuracy Rate" },
  { value: "500+", label: "Active Users" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen animated-bg text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Placement AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="glow">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium">
            <Zap className="w-4 h-4" />
            Powered by Groq + LlamaIndex RAG Pipeline
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
            Ace Every
            <span className="gradient-text block">Tech Interview</span>
            with AI Precision
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Your intelligent placement co-pilot. Practice DSA, analyze your resume, generate study plans, 
            and get cited answers from a curated knowledge base — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="px-8 py-6 text-base font-semibold glow group">
                Start for Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="px-8 py-6 text-base">
                View Dashboard
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 max-w-2xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold gradient-text">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold tracking-tight">Everything you need to get placed</h2>
            <p className="text-muted-foreground mt-3 text-lg">A comprehensive AI-powered toolkit built for serious interview preparation.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all duration-300 group">
                <div className="w-11 h-11 rounded-lg bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center glass-card rounded-2xl p-12 border-primary/20">
          <Star className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Ready to land your dream job?</h2>
          <p className="text-muted-foreground mb-8">Join hundreds of engineers preparing smarter with AI-powered guidance.</p>
          <Link href="/auth/register">
            <Button size="lg" className="px-10 py-6 text-base font-semibold glow">
              Create Free Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4 text-center text-sm text-muted-foreground">
        © 2026 Placement AI. Built with Next.js, FastAPI & LangGraph RAG.
      </footer>
    </div>
  );
}
