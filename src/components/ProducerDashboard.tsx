"use client";

import React, { useState, useEffect, useRef } from "react";
import { AGROSUL_DATA, getDebateTopic, getVigorStats, getStandStats } from "@/lib/mockData";
import { useTranslation } from "react-i18next";

import { Farm, Mission, PurchasedReport, PlotFeature, ReportService, SwarmChat } from "@/types/agrosul";

interface ProducerDashboardProps {
  farms: Farm[];
  flightQueue: Mission[];
  setFlightQueue: React.Dispatch<React.SetStateAction<Mission[]>>;
  purchasedReports: PurchasedReport[];
}

// Ray Casting Algorithm to check if point is inside a polygon
const isPointInPolygon = (x: number, y: number, polygon: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

export default function ProducerDashboard({
  farms,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  flightQueue,
  setFlightQueue,
  purchasedReports,
}: ProducerDashboardProps) {
  const { t } = useTranslation();
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>("plot-b"); // Default to plot-b to immediately show details
  const [activeLayer, setActiveLayer] = useState<"natural" | "ndvi" | "weed">("ndvi"); // Default to ndvi to show plant vigor on load
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Hovered state for donut chart coordination
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  
  // Toast Notification States
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // UI Control states for premium height containment & opacity controls
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [dotLayerOpacity, setDotLayerOpacity] = useState(0.65);
  const [pulseRadius, setPulseRadius] = useState(38);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const plots = farms[0].plots.features;
  const selectedPlotFeature = plots.find((f: PlotFeature) => f.properties.id === selectedPlotId);
  const selectedPlot = selectedPlotFeature?.properties;

  // Pre-load the high-resolution farm orthomosaic background
  useEffect(() => {
    const img = new Image();
    img.src = "/farm_orthomosaic.png";
    img.onload = () => {
      setBgImage(img);
    };
  }, []);

  // Hardware-accelerated continuous tracking pulse loop at 60fps
  useEffect(() => {
    let animFrame: number;
    const start = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - start) / 1000;
      // Oscillate between 34.5px and 43.5px smoothly using sine wave
      const r = 38 + Math.sin(elapsed * 5.0) * 4.5;
      setPulseRadius(r);
      animFrame = requestAnimationFrame(animate);
    };
    
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  // Smooth auto-scroll behavior for the AI Swarm terminal console
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedPlotId, activeLayer]);

  // Dynamic Tag mapper for standard Agrosul AI agent loops
  const getAgentTag = (agentName: string) => {
    switch (agentName?.toLowerCase()) {
      case "solis": return "[CORE_SYS]";
      case "fauna": return "[FARM_DATA]";
      case "ceres": return "[AGRO_AI]";
      case "aero": return "[DRONE_SWARM]";
      default: return `[${agentName?.toUpperCase() || "SYSTEM"}]`;
    }
  };

  // High contrast terminal color values for readability
  const getAgentColor = (agentName: string) => {
    switch (agentName?.toLowerCase()) {
      case "solis": return "#38BDF8"; // Sky Blue (System Core)
      case "fauna": return "#34D399"; // Mint Green (Agricultural database logs)
      case "ceres": return "#34D399"; // Mint Green (Botanist recommendation logs)
      case "aero": return "#FBBF24";  // Amber Gold (Airspace Warnings & recommendations)
      default: return "#E0F2FE";
    }
  };

  // Sync canvas width and draw plots
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight || 450;
    }

    const mapWidth = canvas.width;
    const mapHeight = canvas.height;

    // Draw Background Orthomosaic Image
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, mapWidth, mapHeight);
      
      // Draw subtle dark overlay so vectors and heatmaps stand out clearly
      ctx.fillStyle = "rgba(10, 15, 29, 0.28)";
      ctx.fillRect(0, 0, mapWidth, mapHeight);
    } else {
      // Fallback structured terrain representation
      ctx.fillStyle = "#1E293B";
      ctx.fillRect(0, 0, mapWidth, mapHeight);
    }

    // Draw grid overlay (Futuristic radar lines)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < mapWidth; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, mapHeight);
      ctx.stroke();
    }
    for (let j = 0; j < mapHeight; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(mapWidth, j);
      ctx.stroke();
    }

    // Draw GeoJSON Plots
    plots.forEach((feature: PlotFeature) => {
      const plot = feature.properties;
      const coords = feature.geometry.coordinates[0];
      const isSelected = selectedPlotId === plot.id;

      // Scale coordinates to fit current canvas size
      const scaledCoords = coords.map((c: number[]) => [
        c[0] * mapWidth,
        c[1] * mapHeight,
      ] as [number, number]);

      // Calculate centroid of the polygon dynamically
      let cx = 0, cy = 0;
      scaledCoords.forEach((c: number[]) => {
        cx += c[0];
        cy += c[1];
      });
      cx = cx / scaledCoords.length;
      cy = cy / scaledCoords.length;

      // Draw Field Shape Path
      ctx.beginPath();
      scaledCoords.forEach((c: number[], index: number) => {
        if (index === 0) ctx.moveTo(c[0], c[1]);
        else ctx.lineTo(c[0], c[1]);
      });
      ctx.closePath();

      // Bounding Box for Grid Casting
      const xs = scaledCoords.map((c: number[]) => c[0]);
      const ys = scaledCoords.map((c: number[]) => c[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      if (activeLayer === "ndvi") {
        // Draw standard translucent overlay base
        ctx.fillStyle = isSelected ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.15)";
        ctx.fill();

        // Pixelated Grid Analysis Overlay (Exactly like Agremo Tobacco Plant Vigor!)
        const cellSize = 7;
        const gapSize = 1;

        for (let x = minX; x < maxX; x += cellSize + gapSize) {
          for (let y = minY; y < maxY; y += cellSize + gapSize) {
            // Check if cell center is inside polygon boundary
            if (isPointInPolygon(x + cellSize/2, y + cellSize/2, scaledCoords)) {
              
              // Dynamic crop vigor calculations with localized pseudo-noise clustering
              const dx = x - cx;
              const dy = y - cy;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              // Seeded pseudo-random noise to make it blocky and organic
              const noise = Math.abs(Math.sin(x * 12.9898 + y * 78.233)) * 43758.5453 % 1;
              
              let cellColor = "rgba(34, 197, 94, 0.65)"; // Default: Good Vigor (Green)

              if (plot.id === "plot-b") {
                // Setor B Weed Issue (Yellow/Orange patch around centroid)
                if (dist < 40) {
                  cellColor = noise > 0.3 ? "rgba(245, 158, 11, 0.75)" : "rgba(234, 179, 8, 0.75)"; // Orange/Yellow
                } else if (dist < 75) {
                  cellColor = noise > 0.65 ? "rgba(245, 158, 11, 0.7)" : "rgba(34, 197, 94, 0.65)"; 
                } else {
                  cellColor = noise > 0.85 ? "rgba(37, 99, 235, 0.75)" : "rgba(34, 197, 94, 0.65)"; // Green & Blue
                }
              } else if (plot.id === "plot-d") {
                // Plot D: Severe Moisture Issue (Red/Orange center, yellow transition)
                if (dist < 45) {
                  cellColor = noise > 0.25 ? "rgba(239, 68, 68, 0.85)" : "rgba(249, 115, 22, 0.8)"; // Red/Orange
                } else if (dist < 85) {
                  cellColor = noise > 0.5 ? "rgba(234, 179, 8, 0.75)" : "rgba(249, 115, 22, 0.75)"; // Yellow/Orange
                } else {
                  cellColor = noise > 0.8 ? "rgba(34, 197, 94, 0.65)" : "rgba(37, 99, 235, 0.75)";
                }
              } else {
                // Healthy sectors: mostly green & blue
                if (noise > 0.78) {
                  cellColor = "rgba(37, 99, 235, 0.78)"; // Excellent Vigor (Blue)
                } else if (noise < 0.05) {
                  cellColor = "rgba(234, 179, 8, 0.68)"; // Minor Yellow
                } else {
                  cellColor = "rgba(34, 197, 94, 0.7)"; // Good Vigor (Green)
                }
              }

              ctx.fillStyle = cellColor;
              ctx.fillRect(x, y, cellSize, cellSize);
            }
          }
        }
      } else if (activeLayer === "weed") {
        // Plant Counting Layer (Exactly like Agremo Stand Count screenshot!)
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fill();

        const rowSpacing = 14;
        const cropSpacing = 11;
        const dotRadius = 2.8;

        // Apply opacities dynamically to the red-dot layer group
        ctx.save();
        ctx.globalAlpha = dotLayerOpacity;
        // Draw thousands of translucent red crop dots along diagonal rows inside the polygons
        for (let rowOffset = minX - maxY; rowOffset < maxX; rowOffset += rowSpacing) {
          for (let py = minY; py < maxY; py += cropSpacing) {
            const px = rowOffset + py;
            
            if (isPointInPolygon(px, py, scaledCoords)) {
              ctx.beginPath();
              ctx.arc(px, py, dotRadius, 0, 2 * Math.PI);
              ctx.fillStyle = "rgba(239, 68, 68, 1.0)"; // Alpha handles transparency
              ctx.fill();
            }
          }
        }
        ctx.restore();

        // Draw glowing AI alert overlays for plots with stand/moisture issues
        if (plot.id === "plot-b" && isSelected) {
          // Soft outermost tracking scanner ring (low opacity)
          ctx.strokeStyle = "rgba(239, 68, 68, 0.18)";
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseRadius + 8, 0, 2 * Math.PI);
          ctx.stroke();

          // Soft middle tracking scanner ring
          ctx.strokeStyle = "rgba(239, 68, 68, 0.42)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseRadius + 4, 0, 2 * Math.PI);
          ctx.stroke();

          // Core dashed focus ring
          ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(cx, cy, pulseRadius, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
          
          ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
          ctx.font = "bold 9px monospace";
          ctx.fillText("[AI: DENSIDADE DE STAND 21% ABAIXO DA NORMA]", cx + 45, cy - 8);
        } else if (plot.id === "plot-d" && isSelected) {
          // Soft outermost moisture scanner ring
          ctx.strokeStyle = "rgba(239, 68, 68, 0.18)";
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseRadius + 12.5, 0, 2 * Math.PI);
          ctx.stroke();

          // Soft middle moisture scanner ring
          ctx.strokeStyle = "rgba(239, 68, 68, 0.42)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseRadius + 8.5, 0, 2 * Math.PI);
          ctx.stroke();

          // Core dashed moisture focus ring
          ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(cx, cy, pulseRadius + 4.5, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
          ctx.font = "bold 9px monospace";
          ctx.fillText("[AI: CRITICAL MOISTURE STRESS]", cx + 48, cy - 8);
        }
      } else {
        // Natural satellite view - translucent green fill
        ctx.fillStyle = isSelected ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.02)";
        ctx.fill();
      }

      // Draw vector outlines
      ctx.lineWidth = isSelected ? 3.5 : 1.5;
      ctx.strokeStyle = isSelected ? "var(--primary)" : "rgba(255, 255, 255, 0.35)";
      ctx.stroke();

      // Plot Labels
      ctx.fillStyle = isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)";
      ctx.font = isSelected ? "bold 12px var(--font-main, sans-serif)" : "600 11px var(--font-main, sans-serif)";
      
      // Draw dynamic crosshair target overlay for selected sector
      if (isSelected) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillText("🎯 " + plot.name, cx - 35, cy - 12);
        ctx.shadowBlur = 0; // reset
      } else {
        const plotIdLetter = "PLOT-" + (plot.name.split(" ")[1] || "A");
        ctx.fillText(plotIdLetter, cx - 22, cy);
      }
    });
  }, [selectedPlotId, activeLayer, plots, bgImage, pulseRadius, dotLayerOpacity]);

  // Context-aware AI Swarm Debate (now uses per-plot scenario mapping)
  const debateTopic = getDebateTopic(selectedPlotId, activeLayer);
  const activeDebate = AGROSUL_DATA.swarmDebates[debateTopic];

  // Per-plot vigor & stand statistics from centralized mock data
  const vigorData = selectedPlotId ? getVigorStats(selectedPlotId) : null;
  const standData = selectedPlotId ? getStandStats(selectedPlotId) : null;

  // Helper trigger to show custom toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4500);
  };

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (!selectedPlotId) {
      triggerToast("⚠️ Selecione um talhão no mapa primeiro.");
      return;
    }
    setCheckoutStep(1);
    setSelectedCrop("");
    setSelectedServiceId("");
    setIsModalOpen(true);
  };

  const handleNextStep = () => {
    if (checkoutStep === 1 && !selectedCrop) {
      alert("Por favor, selecione a cultura agrícola.");
      return;
    }
    if (checkoutStep === 2 && !selectedServiceId) {
      alert("Por favor, selecione o relatório que deseja gerar.");
      return;
    }
    setCheckoutStep(checkoutStep + 1);
  };

  const handlePrevStep = () => {
    setCheckoutStep(checkoutStep - 1);
  };

  const selectedService = AGROSUL_DATA.reportCatalog.find((c: ReportService) => c.id === selectedServiceId);
  const calculatedCost = selectedPlot && selectedService ? selectedPlot.size * selectedService.pricePerHectare : 0;

  const handleConfirmOrder = () => {
    if (!selectedPlot || !selectedService) return;

    const newMission = {
      // eslint-disable-next-line react-hooks/purity
      id: `mission-${Date.now()}`,
      plotId: selectedPlot.id,
      plotName: selectedPlot.name,
      farmName: farms[0].name,
      areaSize: selectedPlot.size,
      crop: selectedCrop,
      reportId: selectedService.id,
      reportTitle: selectedService.title,
      reportPrice: calculatedCost,
      status: "Pending Imagery",
    };

    setFlightQueue((prev) => [...prev, newMission]);
    setIsModalOpen(false);
    
    triggerToast(
      `🚁 Voo solicitado para ${selectedPlot.name}! A missão foi enviada para o painel de João Silva (Piloto).`
    );
  };

  // Checks if a premium report is unlocked for this plot
  const unlockedReportsForPlot = purchasedReports.filter((r) => r.plotId === selectedPlotId);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "100%", overflow: "hidden", gap: "10px", flex: 1, minHeight: 0 }}>
        <div className="producer-header">
          <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "1.75rem" }}>{t('producer.headerTitle')}</h1>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              {t('producer.headerDesc')}
            </p>
          </div>
          
          <div className="producer-stats">
            <div>
              <div className="stat-lbl" style={{ fontSize: "10px" }}>{t('producer.monitoredArea')}</div>
              <div className="stat-val text-primary" style={{ color: "var(--primary)", fontSize: "1.25rem" }}>{farms[0].totalArea} ha</div>
            </div>
            <div>
              <div className="stat-lbl" style={{ fontSize: "10px" }}>{t('producer.activeAlerts')}</div>
              <div className="stat-val text-alert" style={{ color: "var(--accent-amber)", fontSize: "1.25rem" }}>
                {plots.filter((p: PlotFeature) => p.properties.health <= 85).length} {t('producer.sectors')}
              </div>
            </div>
          </div>
        </div>

      {/* Main dashboard content container budgeting heights strictly */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden" }}>
        
        <div className="gis-container-grid" style={{ flex: 1, minHeight: 0, display: "grid", gap: "12px", marginBottom: 0 }}>
          {/* Left Column: Stacked GIS Map + Plant Vigor Summary */}
          <div className="gis-left-column" style={{ display: "flex", flexDirection: "column", gap: "12px", minHeight: 0, height: "100%" }}>
            
            {/* GIS Map */}
            <div className="premium-card map-card" style={{ display: "flex", flexDirection: "column", padding: "10px", minHeight: 0, height: "100%", gap: "8px", flex: activeLayer === "weed" || activeLayer === "ndvi" ? 1.3 : 1 }}>
              <div className="map-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontWeight: 700, margin: 0, fontSize: "0.95rem" }}>{t('producer.mapTitle')}</h3>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                    21&deg;10&apos;39&quot;S, 47&deg;48&apos;37&quot;W
                  </span>
                </div>
                <div className="map-controls" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button className={`layer-btn ${activeLayer === 'natural' ? 'active' : ''}`} onClick={() => setActiveLayer('natural')}>{t('producer.ortho')}</button>
                    <button className={`layer-btn ${activeLayer === 'ndvi' ? 'active' : ''}`} onClick={() => setActiveLayer('ndvi')}>
                      {t('producer.ndvi')}
                    </button>
                    <button className={`layer-btn ${activeLayer === 'weed' ? 'active' : ''}`} onClick={() => setActiveLayer('weed')}>{t('producer.weed')}</button>

                  {/* Minimal dynamic native range slider styled in primary green */}
                  {activeLayer === "weed" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "6px", paddingLeft: "8px", borderLeft: "1px solid var(--border-light)" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{t('producer.opacity')} {Math.round(dotLayerOpacity * 100)}%</span>
                      <input
                        type="range"
                        min="0.10"
                        max="1.0"
                        step="0.05"
                        value={dotLayerOpacity}
                        onChange={(e) => setDotLayerOpacity(parseFloat(e.target.value))}
                        style={{ width: "55px", accentColor: "var(--primary)", height: "3px", cursor: "pointer" }}
                      />
                    </div>
                  )}

                  {/* Unlocked Premium floating badge button */}
                  {purchasedReports.length > 0 && (
                    <button 
                      onClick={() => setIsReportOpen(true)}
                      style={{
                        background: "var(--primary)",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "9999px",
                        padding: "4px 10px",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginLeft: "6px",
                        boxShadow: "0 0 12px rgba(22, 163, 74, 0.4)",
                        animation: "pulse-border 2s infinite"
                      }}
                    >
                      <span>🔓</span> {t('producer.reports')} ({purchasedReports.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="map-view-wrapper" style={{ flex: 1, minHeight: 0, display: "flex", height: "auto" }}>
                <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }}></canvas>
              </div>
            </div>

            {/* Agrosul AI Analysis Plant Vigor Summary */}
            <div className="premium-card plot-list-card" style={{ display: "flex", flexDirection: "column", padding: "1rem", minHeight: 0, height: "100%", flex: 1, overflow: "hidden" }}>
            
            {/* NDVI STATS SIDEBAR (If active plot & Vigor NDVI selected) */}
            {selectedPlot && activeLayer === "ndvi" ? (
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: "10px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {t('producer.aiAnalysis')}
                    </span>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "2px 0 0 0", color: "var(--text-dark)" }}>
                      {t('producer.plantVigorSummary')}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedPlotId(null)}
                    style={{ background: "#F3F4F6", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "11px", color: "var(--text-muted)" }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "6px 12px", background: "#F9FAFB", padding: "10px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.plot')}</span><span style={{ fontWeight: 600 }}>{selectedPlot.name}</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.size')}</span><span style={{ fontWeight: 600 }}>{selectedPlot.size} ha</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.crop')}</span><span style={{ fontWeight: 600 }}>{vigorData?.cropType}</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.stage')}</span><span style={{ fontWeight: 600 }}>{vigorData?.cropStage}</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.comment')}</span><span style={{ fontWeight: 600, color: vigorData?.commentSeverity === 'critical' ? 'var(--accent-red)' : vigorData?.commentSeverity === 'warning' ? 'var(--accent-amber)' : 'var(--primary)' }}>{vigorData?.comment}</span></div>
                </div>

                {/* Style block for animated entries and row transitions */}
                <style>{`
                  @keyframes draw-donut {
                    from {
                      stroke-dasharray: 0 100;
                    }
                  }
                  .donut-segment {
                    animation: draw-donut 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transform-origin: center;
                    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                  }
                  .donut-segment:hover {
                    transform: scale(1.05) !important;
                  }
                  .hovered-row {
                    background: rgba(0, 0, 0, 0.035);
                  }
                  .vigor-table tr {
                    transition: background 0.2s ease;
                  }
                `}</style>

                {/* Dynamic SVG Donut Chart — driven from vigorData */}
                {vigorData && (
                <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                  <svg width="110" height="110" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#F3F4F6" strokeWidth="3.2" />

                    {/* Good Vigor (Green) */}
                    <circle className="donut-segment" cx="18" cy="18" r="15.915" fill="transparent"
                      stroke={vigorData.good.color} strokeWidth="3.2"
                      strokeDasharray={`${vigorData.good.pct} 100`} strokeDashoffset="0"
                      onMouseEnter={() => setHoveredSlice("bom")} onMouseLeave={() => setHoveredSlice(null)}
                      style={{ transform: hoveredSlice === "bom" ? "scale(1.05)" : "scale(1)" }}
                    />
                    {/* Regular Vigor (Yellow) */}
                    <circle className="donut-segment" cx="18" cy="18" r="15.915" fill="transparent"
                      stroke={vigorData.regular.color} strokeWidth="3.2"
                      strokeDasharray={`${vigorData.regular.pct} 100`} strokeDashoffset={`${-vigorData.good.pct}`}
                      onMouseEnter={() => setHoveredSlice("regular")} onMouseLeave={() => setHoveredSlice(null)}
                      style={{ transform: hoveredSlice === "regular" ? "scale(1.05)" : "scale(1)" }}
                    />
                    {/* Excellent Vigor (Blue) */}
                    <circle className="donut-segment" cx="18" cy="18" r="15.915" fill="transparent"
                      stroke={vigorData.excellent.color} strokeWidth="3.2"
                      strokeDasharray={`${vigorData.excellent.pct} 100`}
                      strokeDashoffset={`${-(vigorData.good.pct + vigorData.regular.pct)}`}
                      onMouseEnter={() => setHoveredSlice("excelente")} onMouseLeave={() => setHoveredSlice(null)}
                      style={{ transform: hoveredSlice === "excelente" ? "scale(1.05)" : "scale(1)" }}
                    />
                    {/* Bare Soil (Red) */}
                    <circle className="donut-segment" cx="18" cy="18" r="15.915" fill="transparent"
                      stroke={vigorData.bareSoil.color} strokeWidth="3.2"
                      strokeDasharray={`${vigorData.bareSoil.pct} 100`}
                      strokeDashoffset={`${-(vigorData.good.pct + vigorData.regular.pct + vigorData.excellent.pct)}`}
                      onMouseEnter={() => setHoveredSlice("solo")} onMouseLeave={() => setHoveredSlice(null)}
                      style={{ transform: hoveredSlice === "solo" ? "scale(1.05)" : "scale(1)" }}
                    />

                    {/* Center text */}
                    <text x="18" y="17.2" textAnchor="middle" fontWeight="800" fontSize="5.8" fill="var(--text-dark)"
                      style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
                      {vigorData.overallHealth}%
                    </text>
                    <text x="18" y="21.5" textAnchor="middle" fontWeight="500" fontSize="2.1" fill="var(--text-muted)"
                      style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
                      {t('producer.overallAvg')}
                    </text>
                  </svg>
                </div>
                )}

                {/* Vigor classification table — data-driven */}
                {vigorData && (
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <table className="vigor-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1.5px solid var(--border-light)", color: "var(--text-muted)", fontWeight: 700, textAlign: "left" }}>
                        <th style={{ paddingBottom: "4px" }}>{t('producer.color')}</th>
                        <th style={{ paddingBottom: "4px" }}>{t('producer.vigor')}</th>
                        <th style={{ paddingBottom: "4px" }}>ha</th>
                        <th style={{ paddingBottom: "4px", textAlign: "right" }}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: "excelente", label: t('producer.excellent'), data: vigorData.excellent, colorName: "Azul" },
                        { key: "bom", label: t('producer.good'), data: vigorData.good, colorName: "Verde" },
                        { key: "regular", label: t('producer.regular'), data: vigorData.regular, colorName: "Amarelo" },
                        { key: "solo", label: t('producer.bareSoil'), data: vigorData.bareSoil, colorName: "Vermelho" },
                      ].map((row) => (
                        <tr key={row.key}
                          style={{ borderBottom: "1px solid var(--border-light)", cursor: "pointer" }}
                          onMouseEnter={() => setHoveredSlice(row.key)}
                          onMouseLeave={() => setHoveredSlice(null)}
                          className={hoveredSlice === row.key ? "hovered-row" : ""}
                        >
                          <td style={{ padding: "4px 0" }}><span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: row.data.color, marginRight: "4px" }}></span> {row.colorName}</td>
                          <td>{row.label}</td>
                          <td>{(selectedPlot.size * row.data.pct / 100).toFixed(1)} ha</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: row.data.color }}>{row.data.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button className="btn-primary w-100" style={{ padding: "8px", fontSize: "12px", display:"flex", justifyContent:"center", alignItems:"center", gap:"6px" }} onClick={() => triggerToast("📊 Comparação de safras em andamento...")}>
                    <span>📊</span> {t('producer.compare')}
                  </button>
                </div>
              </div>
            ) : selectedPlot && activeLayer === "weed" ? (
              // PLANT COUNT STATS SIDEBAR (If active plot & Plant Count selected)
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: "10px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-red)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {t('producer.standAudit')}
                    </span>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "2px 0 0 0", color: "var(--text-dark)" }}>
                      {t('producer.plantCountingSummary')}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedPlotId(null)}
                    style={{ background: "#F3F4F6", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "11px", color: "var(--text-muted)" }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "6px 12px", background: "#F9FAFB", padding: "8px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.plot')}</span><span style={{ fontWeight: 600 }}>{selectedPlot.name}</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.size')}</span><span style={{ fontWeight: 600 }}>{selectedPlot.size} ha</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.crop')}</span><span style={{ fontWeight: 600 }}>Cana-de-Açúcar 🌾</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.analysis')}</span><span style={{ fontWeight: 600 }}>Plant Count</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.stage')}</span><span style={{ fontWeight: 600 }}>BBCH 19 (Stand)</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}><span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 600 }}>{t('producer.comment')}</span><span style={{ fontWeight: 600, color: "var(--accent-amber)" }}>Auditoria falhas</span></div>
                </div>

                {/* Massive Plant Count Numbers! (Agremo Plant Counting UI) */}
                <div style={{ textAlign: "center", padding: "8px", background: "rgba(34, 197, 94, 0.06)", border: "1.5px solid var(--primary-light)", borderRadius: "var(--radius-md)", margin: "4px 0" }}>
                  <span style={{ display: "block", fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", letterSpacing: "-1px" }}>
                    {(selectedPlot.size * 3420).toLocaleString()}
                  </span>
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>
                    {t('producer.estimatedPlants')}
                  </span>
                </div>

                {/* Stand norm audit alert (pink card for warnings) */}
                {selectedPlot.health <= 85 ? (
                  <div style={{ padding: "8px", background: "#FFE4E6", border: "1.5px solid #FCA5A5", borderRadius: "var(--radius-md)", fontSize: "11px", color: "#9F1239", lineHeight: 1.4, fontWeight: 500 }}>
                    ⚠️ <strong>{t('producer.gapDetected')}</strong> {t('producer.gapDetectedText')} <strong>21% {t('producer.belowNormal')}</strong>.
                  </div>
                ) : (
                  <div style={{ padding: "8px", background: "var(--primary-light)", border: "1.5px solid #A7F3D0", borderRadius: "var(--radius-md)", fontSize: "11px", color: "#065F46", lineHeight: 1.4, fontWeight: 500 }}>
                    ✔️ <strong>{t('producer.standExcellent')}</strong> {t('producer.standExcellentText')}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button className="btn-primary w-100" style={{ padding: "8px", fontSize: "11.5px" }} onClick={() => triggerToast("📥 Exportando coordenadas do stand (KML)...")}>
                    {t('producer.getReportData')}
                  </button>
                  <button className="btn-secondary w-100" style={{ padding: "8px", fontSize: "11.5px" }} onClick={() => triggerToast("🔗 Relatório gerado! Link copiado para transferência.")}>
                    {t('producer.shareResults')}
                  </button>
                </div>
              </div>
            ) : (
              // STANDARD PLOT SELECTOR (Default / Natural view or when no plot is selected)
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "0.95rem" }}>{t('producer.reports')}</h3>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", maxHeight: "150px" }}>
                  {plots.map((feature: PlotFeature) => {
                    const plot = feature.properties;
                    return (
                      <div
                        key={plot.id}
                        className={`plot-item ${selectedPlotId === plot.id ? "selected" : ""}`}
                        style={{ padding: "8px 12px", marginBottom: "4px" }}
                        onClick={() => setSelectedPlotId(plot.id)}
                      >
                        <div>
                          <span className="plot-name" style={{ fontSize: "12px" }}>{plot.name}</span>
                          <span className="plot-size" style={{ fontSize: "10px" }}>{plot.size} {t('producer.hectares')}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: "11px", color: plot.health > 85 ? "var(--primary)" : "var(--accent-amber)" }}>
                          {t('producer.vigor')} {plot.health}%
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: "4px", paddingTop: "8px", borderTop: "1px solid var(--border-light)" }}>
                  {selectedPlot ? (
                    <>
                      <p style={{ fontSize: "11.5px", color: "var(--text-dark)", fontWeight: 700, marginBottom: "2px" }}>
                        {t('producer.sect')} {selectedPlot.name} ({selectedPlot.size} ha)
                      </p>
                      <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "8px", lineHeight: 1.35 }}>
                        {selectedPlot.health <= 85
                          ? `⚠️ ${t('producer.alertStress')}`
                          : `✔️ ${t('producer.healthyLevel')}`}
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", lineHeight: 1.35 }}>
                      {t('producer.selectPlotToStart')}
                    </p>
                  )}

                  <button className="btn-primary w-100" style={{ padding: "8px", fontSize: "12px" }} onClick={handleOpenCheckout} disabled={!selectedPlotId}>
                    {t('producer.requestMapping')}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

          {/* Right Column: AI Swarm Command Center */}
          <div className="premium-card swarm-card" style={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%", padding: "1rem", overflow: "hidden", minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, borderBottom: "1px solid var(--border-light)", paddingBottom: "8px" }}>
              <div>
                <h3 style={{ fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", margin: 0, color: "var(--text-dark)" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10B981", animation: "pulse 2s infinite" }}></span>
                  {t('producer.aiSwarmTitle')}
                </h3>
                <p style={{ fontSize: "10.5px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                  {t('producer.aiSwarmDesc')}
                </p>
              </div>
              {selectedPlotId && (
                <span style={{ fontSize: "10px", padding: "2px 6px", background: "var(--primary-light)", color: "var(--primary)", borderRadius: "var(--radius-sm)", fontWeight: 700 }}>
                  {selectedPlot?.name} {t('producer.activeTarget')}
                </span>
              )}
            </div>

            {/* Scrolling Debate Console with auto-scroll and top boundary linear mask fading */}
            <div 
              className="terminal-card" 
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "6px", 
                flex: 1, 
                minHeight: 0, 
                overflowY: "auto", 
                padding: "8px", 
                fontSize: "11px",
                lineHeight: 1.45,
                maskImage: "linear-gradient(to bottom, transparent 0%, black 18%)", 
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%)",
                background: "#111827",
                borderRadius: "var(--radius-md)"
              }}
            >
              <div style={{ borderBottom: "1px dashed rgba(56, 189, 248, 0.3)", paddingBottom: "6px", marginBottom: "6px", fontSize: "11px", color: "#38BDF8", fontFamily: "monospace" }}>
                {t('producer.aiCoreInit')}
                <br />
                {`[ANALYSIS_FOCUS] Target: ${selectedPlotId ? selectedPlot?.name : t('producer.aiGeneralOverview')}`}
              </div>

              {activeDebate.map((chat: SwarmChat, i: number) => {
                const tagColor = getAgentColor(chat.agent);
                const tagText = getAgentTag(chat.agent);
                return (
                  <div key={i} style={{ display: "flex", gap: "8px", fontSize: "11px", fontFamily: "monospace", color: tagColor }}>
                    <span style={{ fontWeight: 800, minWidth: "105px", flexShrink: 0 }}>
                      {tagText}:
                    </span>
                    <span style={{ color: "#F3F4F6", lineHeight: 1.4 }}>
                      {chat.text}
                    </span>
                  </div>
                );
              })}

              {selectedPlotId === "plot-b" && (
                <div style={{ fontSize: "11px", color: "#FBBF24", marginTop: "4px", fontWeight: 600, fontFamily: "monospace" }}>
                  {t('producer.aiRecWeed')}
                </div>
              )}
              {selectedPlotId === "plot-d" && (
                <div style={{ fontSize: "11px", color: "#FBBF24", marginTop: "4px", fontWeight: 600, fontFamily: "monospace" }}>
                  {t('producer.aiRecDrip')}
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

        </div>
      </div>
    </div>

    {/* Premium Unlocked Reports moved to floating toolbar drawer modal */}

      {/* Dynamic Checkout Modal */}
      <div className={`modal-backdrop ${isModalOpen ? "is-open" : ""}`}>
        <div className="modal-sheet">
          <div className="modal-header">
            <div>
              <h3>{t('producer.requestMapping')}</h3>
              <p>{t('producer.checkoutStep')} {checkoutStep} {t('producer.checkoutOf')} 3 • {t('producer.plot')} {selectedPlot?.name}</p>
            </div>
            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="modal-steps">
              <div className={`modal-step-pip ${checkoutStep >= 1 ? "active" : ""}`}></div>
              <div className={`modal-step-pip ${checkoutStep >= 2 ? "active" : ""}`}></div>
              <div className={`modal-step-pip ${checkoutStep >= 3 ? "active" : ""}`}></div>
            </div>

            {/* STEP 1: Select Crop Type */}
            {checkoutStep === 1 && (
              <div className="checkout-step active">
                <div className="crop-dropdown-section">
                  <span className="crop-dropdown-label">{t('producer.checkoutCropTitle')}</span>
                  <select
                    className="crop-select-custom"
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                  >
                    <option value="" disabled>{t('producer.checkoutSelectCrop')}</option>
                    <option value="cana">{t('producer.cropSugarcane')}</option>
                    <option value="soja">{t('producer.cropSoy')}</option>
                    <option value="milho">{t('producer.cropCorn')}</option>
                    <option value="eucalipto">{t('producer.cropEucalyptus')}</option>
                  </select>
                </div>

                <div className={`crop-selected-chip ${selectedCrop ? "visible" : ""}`}>
                  <span className="chip-emoji">
                    {selectedCrop === "cana" ? "🌾" : selectedCrop === "soja" ? "🌱" : selectedCrop === "milho" ? "🌽" : "🌲"}
                  </span>
                  <div>
                    <span className="chip-label">{t('producer.checkoutCropDefined')}</span>
                    <span className="chip-sub">{t('producer.checkoutCropDesc').replace('{{crop}}', selectedCrop)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Select Report Service */}
            {checkoutStep === 2 && (
              <div className="checkout-step active">
                <span className="crop-dropdown-label" style={{ display: "block", marginBottom: "1rem" }}>
                  {t('producer.checkoutSelectService')}
                </span>
                <div className="service-catalog-grid">
                  {AGROSUL_DATA.reportCatalog.map((service: ReportService) => {
                    const isSelected = selectedServiceId === service.id;
                    return (
                      <div
                        key={service.id}
                        className={`service-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedServiceId(service.id)}
                      >
                        <div className="service-info">
                          <h3>{service.title}</h3>
                          <p>{service.description}</p>
                          <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 700, display: "block", marginTop: "4px" }}>
                            {t('producer.checkoutDelivery').replace('{{time}}', service.deliveryTime)}
                          </span>
                        </div>
                        <div className="service-price">
                          <span className="amt">R$ {service.pricePerHectare.toFixed(2)}</span>
                          <span className="unit">/ hectare</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: Confirm Details & Checkout */}
            {checkoutStep === 3 && (
              <div className="checkout-step active">
                <span className="crop-dropdown-label" style={{ display: "block", marginBottom: "1rem" }}>
                  {t('producer.checkoutConfirmFlight')}
                </span>

                <div className="pricing-card">
                  <div className="pricing-row">
                    <span className="pr-label">{t('producer.checkoutPlotSelected')}</span>
                    <span className="pr-value">{selectedPlot?.name}</span>
                  </div>
                  <div className="pricing-row">
                    <span className="pr-label">{t('producer.checkoutPlotArea')}</span>
                    <span className="pr-value">{selectedPlot?.size} ha</span>
                  </div>
                  <div className="pricing-row">
                    <span className="pr-label">{t('producer.checkoutCrop')}</span>
                    <span className="pr-value">{selectedCrop}</span>
                  </div>
                  <div className="pricing-row">
                    <span className="pr-label">{t('producer.checkoutService')}</span>
                    <span className="pr-value">{selectedService?.title}</span>
                  </div>
                  <div className="pricing-row">
                    <span className="pr-label">{t('producer.checkoutPrice')}</span>
                    <span className="pr-value">R$ {selectedService?.pricePerHectare.toFixed(2)}</span>
                  </div>

                  <div className="pricing-total">
                    <span className="pt-label">{t('producer.checkoutTotalCost')}</span>
                    <span className="pt-value">R$ {calculatedCost.toFixed(2)}</span>
                  </div>
                </div>

                <div className="info-badge">
                  <span>ℹ️</span>
                  <span>{t('producer.checkoutDroneDesc')}</span>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {checkoutStep > 1 && (
              <button className="btn-modal-back" onClick={handlePrevStep}>
                {t('producer.checkoutBack')}
              </button>
            )}
            
            {checkoutStep < 3 ? (
              <button
                className="btn-modal-confirm"
                onClick={handleNextStep}
                disabled={(checkoutStep === 1 && !selectedCrop) || (checkoutStep === 2 && !selectedServiceId)}
              >
                {t('producer.checkoutContinue')}
              </button>
            ) : (
              <button className="btn-modal-confirm" onClick={handleConfirmOrder}>
                {t('producer.checkoutConfirm')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Toast */}
      <div className={`toast-notification ${showToast ? "show" : ""}`}>
        <div className="toast-dot"></div>
        <span>{toastMessage}</span>
      </div>

      {/* Sleek Blurred Modal Overlay Card for Unlocked Premium Reports & 3D Topography Triggers */}
      {isReportOpen && (
        <div 
          className="modal-backdrop is-open" 
          onClick={() => setIsReportOpen(false)}
          style={{ 
            position: "fixed", 
            inset: 0, 
            zIndex: 3000, 
            background: "rgba(10, 15, 30, 0.45)", 
            backdropFilter: "blur(12px)", 
            WebkitBackdropFilter: "blur(12px)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            padding: "1.5rem" 
          }}
        >
          <div 
            className="modal-sheet" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              background: "rgba(255, 255, 255, 0.88)", 
              border: "1px solid rgba(255, 255, 255, 0.4)", 
              borderRadius: "24px", 
              boxShadow: "0 30px 60px rgba(0, 0, 0, 0.25)", 
              width: "100%", 
              maxWidth: "520px", 
              overflow: "hidden" 
            }}
          >
            <div className="modal-header" style={{ borderBottom: "1px solid var(--border-light)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                  🔓 {t('producer.premiumIntelDesk')}
                </h3>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                  {t('producer.premiumIntelDesc')}
                </p>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => setIsReportOpen(false)}
                style={{ width: "28px", height: "28px", borderRadius: "50%", border: "none", background: "#E5E7EB", cursor: "pointer", color: "var(--text-dark)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              {/* Topografia & Drenagem 3D Triggers Section */}
              <div style={{ background: "rgba(37, 99, 235, 0.08)", border: "1.5px solid rgba(37, 99, 235, 0.2)", borderRadius: "var(--radius-md)", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  🗺️ {t('producer.topography3D')}
                </span>
                <p style={{ fontSize: "11.5px", color: "var(--text-dark)", margin: 0, lineHeight: 1.45 }}>
                  {t('producer.topographyDesc')}
                </p>
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      setActiveLayer("natural");
                      setIsReportOpen(false);
                      triggerToast("🗺️ Camada de Relevo 3D integrada à Ortoimagem.");
                    }}
                    style={{ padding: "6px 12px", fontSize: "11px", height: "auto", background: "var(--accent-blue)", boxShadow: "none" }}
                  >
                    {t('producer.enableContours')}
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      triggerToast("🔄 Simulando canais de drenagem superficial...");
                    }}
                    style={{ padding: "6px 12px", fontSize: "11px", height: "auto" }}
                  >
                    {t('producer.simulateDrainage')}
                  </button>
                </div>
              </div>

              {/* Dynamic Unlocked Crop Reports List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t('producer.availableReports')} ({unlockedReportsForPlot.length})
                </span>
                {unlockedReportsForPlot.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "12px", border: "1px dashed var(--border-light)", borderRadius: "var(--radius-sm)" }}>
                    {t('producer.noReportsFound')}
                  </div>
                ) : (
                  unlockedReportsForPlot.map((report) => (
                    <div
                      key={report.id}
                      style={{
                        padding: "12px",
                        border: "1.5px solid var(--primary-light)",
                        borderRadius: "var(--radius-md)",
                        background: "rgba(220, 252, 231, 0.35)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: "12.5px", color: "var(--text-dark)", margin: 0 }}>{report.title}</h4>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                          {t('producer.crop')}: {report.crop} • {t('producer.completedAt')} {report.completedAt}
                        </p>
                      </div>
                      <button
                        className="btn-primary"
                        style={{ padding: "6px 10px", fontSize: "10.5px", height: "auto" }}
                        onClick={() => {
                          if (report.reportId === "rep-weed" || report.reportId === "rep-stand") {
                            setActiveLayer("weed");
                          } else {
                            setActiveLayer("ndvi");
                          }
                          setIsReportOpen(false);
                          triggerToast(`📊 Visualizando ${report.title} no talhão ativo.`);
                        }}
                      >
                        {t('producer.viewMap')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
