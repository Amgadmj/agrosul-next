"use client";

import React, { useState, useEffect, useRef } from "react";

interface FieldToCloudIngestionProps {
  missionId: string;
  plotName: string;
  onUploadComplete?: () => void;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export default function FieldToCloudIngestion({
  missionId,
  plotName,
  onUploadComplete,
}: FieldToCloudIngestionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [generationalNotes, setGenerationalNotes] = useState("");
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  
  const currentChunkIndex = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  // Handle Network Connection Drops
  useEffect(() => {
    const handleOffline = () => {
      console.warn("[Network] Connection lost. Pausing upload.");
      setIsOffline(true);
      if (isUploading && !isPaused) {
        setIsPaused(true);
        abortController.current?.abort(); // Cancel current chunk flight
      }
    };

    const handleOnline = () => {
      console.log("[Network] Connection restored. Resuming upload...");
      setIsOffline(false);
      if (isUploading && isPaused) {
        setIsPaused(false);
        // It will automatically resume in the uploadLoop because of state change
        uploadNextChunk(); 
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [isUploading, isPaused]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // Reset states
      setProgress(0);
      setUploadedBytes(0);
      currentChunkIndex.current = 0;
      setIsUploading(false);
      setIsPaused(false);
    }
  };

  const uploadNextChunk = async () => {
    if (!file || isPaused || isOffline) return;

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    if (currentChunkIndex.current >= totalChunks) {
      setIsUploading(false);
      setProgress(100);
      if (onUploadComplete) onUploadComplete();
      return;
    }

    const start = currentChunkIndex.current * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("chunkIndex", currentChunkIndex.current.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("fileName", file.name);
    formData.append("missionId", missionId);
    
    // Send generational knowledge on the final chunk
    if (currentChunkIndex.current === totalChunks - 1) {
      formData.append("generationalNotes", generationalNotes);
      formData.append("plotName", plotName);
    }

    abortController.current = new AbortController();

    try {
      const response = await fetch("/api/upload-dem", {
        method: "POST",
        body: formData,
        signal: abortController.current.signal,
      });

      if (!response.ok) throw new Error("Chunk upload failed");

      // Success, move to next chunk
      currentChunkIndex.current += 1;
      setUploadedBytes(end);
      setProgress(Math.round((end / file.size) * 100));
      
      // Recursively upload next chunk
      uploadNextChunk();

    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Upload paused due to network drop or manual pause.");
      } else {
        console.error("Upload error:", error);
        setIsPaused(true); // Auto-pause on generic failure so user can retry manually
        alert("Upload failed. The connection might be unstable. Press Resume to try again.");
      }
    }
  };

  const startUpload = () => {
    if (!file) return;
    setIsUploading(true);
    setIsPaused(false);
    uploadNextChunk();
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      uploadNextChunk();
    } else {
      setIsPaused(true);
      abortController.current?.abort();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem", background: "var(--bg-card, #FFFFFF)", border: "1px solid var(--border-light, #E5E7EB)", borderRadius: "8px" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Resilient Payload Ingestion</h3>
        {isOffline ? (
          <span style={{ fontSize: "12px", color: "var(--accent-red, #EF4444)", fontWeight: "bold" }}>
            🔴 OFFLINE
          </span>
        ) : (
          <span style={{ fontSize: "12px", color: "var(--primary, #10B981)", fontWeight: "bold" }}>
            🟢 ONLINE
          </span>
        )}
      </div>

      <p style={{ fontSize: "12px", color: "var(--text-muted, #6B7280)", margin: 0 }}>
        Upload massive .tiff orthomosaics or compressed payloads. The upload will automatically pause and resume if your 3G/4G connection drops.
      </p>

      {/* File Selector */}
      <input type="file" accept=".tif,.tiff,.zip" onChange={handleFileChange} disabled={isUploading && !isPaused} />

      {/* Generational Knowledge Vector */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label style={{ fontSize: "12px", fontWeight: "bold" }}>Generational Knowledge / Context Notes</label>
        <textarea
          rows={3}
          placeholder="e.g. 'This specific depression always floods in November...'"
          value={generationalNotes}
          onChange={(e) => setGenerationalNotes(e.target.value)}
          disabled={isUploading && !isPaused}
          style={{ padding: "8px", borderRadius: "4px", border: "1px solid var(--border-light, #E5E7EB)", fontSize: "13px", resize: "vertical" }}
        />
      </div>

      {/* Progress & Controls */}
      {file && (
        <div style={{ padding: "1rem", background: "#F9FAFB", borderRadius: "8px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "8px" }}>
            <span style={{ fontWeight: "bold" }}>{file.name}</span>
            <span>{progress}% ({(uploadedBytes / (1024 * 1024)).toFixed(1)} / {(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
          </div>
          
          <div style={{ height: "10px", background: "#E5E7EB", borderRadius: "5px", overflow: "hidden", marginBottom: "1rem" }}>
            <div 
              style={{ 
                height: "100%", 
                width: `${progress}%`, 
                background: isOffline || isPaused ? "var(--accent-amber, #F59E0B)" : "var(--primary, #10B981)",
                transition: "width 0.2s ease"
              }} 
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {!isUploading && progress === 0 ? (
              <button 
                onClick={startUpload} 
                disabled={isOffline}
                style={{ background: "var(--primary, #10B981)", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: isOffline ? "not-allowed" : "pointer" }}
              >
                Start Upload
              </button>
            ) : progress < 100 ? (
              <button 
                onClick={togglePause} 
                disabled={isOffline}
                style={{ background: isPaused ? "var(--primary, #10B981)" : "var(--accent-amber, #F59E0B)", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: isOffline ? "not-allowed" : "pointer" }}
              >
                {isPaused ? "Resume Upload" : "Pause Upload"}
              </button>
            ) : (
              <span style={{ color: "var(--primary, #10B981)", fontWeight: "bold", fontSize: "14px" }}>
                ✅ Processing complete!
              </span>
            )}
          </div>
          
          {(isOffline || isPaused) && progress > 0 && progress < 100 && (
            <p style={{ fontSize: "11px", color: "var(--accent-amber, #F59E0B)", margin: "8px 0 0 0" }}>
              {isOffline ? "Upload paused automatically due to network drop. Waiting for connection..." : "Upload paused manually."}
            </p>
          )}

        </div>
      )}
    </div>
  );
}
