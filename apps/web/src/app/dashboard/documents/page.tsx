"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchApi, API_URL } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface Document {
  id: string;
  title: string;
  source_type: string;
  status: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  uploaded: { label: "Uploaded", variant: "secondary", icon: <Clock className="w-3 h-3" /> },
  queued: { label: "Queued", variant: "secondary", icon: <Clock className="w-3 h-3" /> },
  processing: { label: "Processing", variant: "outline", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  indexed: { label: "Indexed", variant: "default", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: "Failed", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  deleted: { label: "Deleted", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/documents/");
      setDocuments(data);
    } catch (err: any) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source_type", "upload");

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || "Upload failed");
      }

      const doc = await res.json();
      toast.success(
        doc.status === "indexed"
          ? `"${file.name}" uploaded and indexed`
          : `"${file.name}" uploaded (non-text file — manual indexing required)`
      );
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleUpload(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleIndex = async (docId: string) => {
    try {
      await fetchApi(`/documents/${docId}/index`, { method: "POST" });
      toast.success("Document indexed successfully");
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message || "Indexing failed");
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This will remove it from the database and vector store.`)) return;
    try {
      await fetchApi(`/documents/${docId}`, { method: "DELETE" });
      toast.success(`"${title}" deleted`);
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload text files to build your knowledge base for AI-powered search and chat.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <Card
        className={`glass-card border-border/50 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Drop a file here or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PDF, .txt, .md, .py, .js, .ts, .java, .cpp, .json, .csv and more
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading ? "Uploading..." : "Choose File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.md,.py,.js,.ts,.java,.cpp,.c,.h,.json,.csv,.log"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <Card className="glass-card border-border/50">
        <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Uploaded Documents ({documents.length})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadDocuments} className="h-7 px-2">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              No documents uploaded yet. Upload a file above to get started.
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="divide-y divide-border/50">
                {documents.map((doc) => {
                  const status = STATUS_MAP[doc.status] || STATUS_MAP.uploaded;
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.source_type} &middot;{" "}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={status.variant} className="gap-1 text-xs shrink-0">
                        {status.icon}
                        {status.label}
                      </Badge>
                      {doc.status !== "indexed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={() => handleIndex(doc.id)}
                        >
                          Index
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(doc.id, doc.title)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
