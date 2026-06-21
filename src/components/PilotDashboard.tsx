"use client";

import React, { useState } from "react";
import FieldToCloudIngestion from "./FieldToCloudIngestion";
import { useTranslation } from "react-i18next";

import { Farm, Mission, PurchasedReport, PlotFeature } from "@/types/agrosul";

interface PilotDashboardProps {
  farms: Farm[];
  setFarms: React.Dispatch<React.SetStateAction<Farm[]>>;
  flightQueue: Mission[];
  setFlightQueue: React.Dispatch<React.SetStateAction<Mission[]>>;
  purchasedReports: PurchasedReport[];
  setPurchasedReports: React.Dispatch<React.SetStateAction<PurchasedReport[]>>;
}

export default function PilotDashboard({
  farms,
  setFarms,
  flightQueue,
  setFlightQueue,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  purchasedReports,
  setPurchasedReports,
}: PilotDashboardProps) {
  const { t } = useTranslation();
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [advisories, setAdvisories] = useState<any[]>([]);

  React.useEffect(() => {
    // Poll the Next.js API for incoming Swarm Agent advisories
    const interval = setInterval(() => {
      fetch('/api/notifications')
        .then(r => r.json())
        .then(data => {
          if (data.notifications && data.notifications.length > 0) {
            setAdvisories(data.notifications);
          }
        })
        .catch(e => console.error("Failed to fetch advisories:", e));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const activeMission = flightQueue.find((m) => m.id === activeMissionId) || flightQueue[0];

  const handleDownloadKML = (mission: Mission) => {
    if (!mission) return;
    
    // Find the plot geometry in the farms state
    let plotGeometry: unknown = null;
    let plotName = "";
    
    for (const farm of farms) {
      const found = farm.plots.features.find((f: PlotFeature) => f.properties.id === mission.plotId);
      if (found) {
        plotGeometry = found.geometry;
        plotName = found.properties.name;
        break;
      }
    }

    if (!plotGeometry) {
      alert("Error: Plot geometry not found.");
      return;
    }

    const geojsonData = {
      type: "Feature",
      properties: {
        missionId: mission.id,
        plotId: mission.plotId,
        plotName: plotName,
        crop: mission.crop,
        reportType: mission.reportType,
        timestamp: new Date().toISOString(),
      },
      geometry: plotGeometry,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojsonData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `agrosul_flightplan_${mission.plotId}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    // Show feedback toast
    triggerToast(`⬇️ ${t('pilot.toastKmlDownloaded')} ${plotName}`);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, mission: Mission) => {
    e.preventDefault();
    if (!mission) return;
    startMockImageProcessing(mission);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mission: Mission) => {
    if (e.target.files && e.target.files.length > 0 && mission) {
      startMockImageProcessing(mission);
    }
  };

  const startMockImageProcessing = (mission: Mission) => {
    if (isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);
    setProcessingStage(t('pilot.stageUploading'));

    // Stage 1: Uploading progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        
        // Stage 2: Orthomosaic stitching
        setTimeout(() => {
          setUploadProgress(100);
          setProcessingStage(t('pilot.stageStitching'));
          
          // Stage 3: AI Classification models
          setTimeout(() => {
            setProcessingStage(t('pilot.stageRunningAI'));
            
            // Stage 4: Processing Complete
            setTimeout(() => {
              setProcessingStage(t('pilot.stageComplete'));
              
              // 1. Update plot vigor to 98%
              setFarms((prevFarms) => {
                return prevFarms.map((farm) => {
                  const updatedFeatures = farm.plots.features.map((feature: PlotFeature) => {
                    if (feature.properties.id === mission.plotId) {
                      return {
                        ...feature,
                        properties: {
                          ...feature.properties,
                          health: 98, // Restored vigor
                        },
                      };
                    }
                    return feature;
                  });
                  return {
                    ...farm,
                    plots: {
                      ...farm.plots,
                      features: updatedFeatures,
                    },
                  };
                });
              });

              // 2. Add dynamic report to purchasedReports
              const reportTitle = mission.reportTitle || "Agricultural Intelligence";
              setPurchasedReports((prev) => [
                ...prev,
                {
                  id: `purchased-${mission.id}`,
                  plotId: mission.plotId,
                  reportId: mission.reportId,
                  title: reportTitle,
                  crop: mission.crop,
                  completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);

              // 3. Mark the flight mission as completed (or remove it from the queue)
              setFlightQueue((prev) => prev.filter((item) => item.id !== mission.id));

              // Clean up state
              setIsUploading(false);
              setActiveMissionId(null);
              triggerToast(`✅ ${t('pilot.toastMissionComplete')}`);
            }, 1800);
          }, 1800);
        }, 1200);
      }
    }, 150);
  };

  return (
    <>
      <div className="view-header">
        <div>
          <h2>{t('pilot.headerTitle')}</h2>
          <p>{t('pilot.headerDesc')}</p>
        </div>
      </div>

      {advisories.length > 0 && advisories[0].topic.includes('urgent') && (
        <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', color: '#B91C1C', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🚨</span>
          <div>
            <h4 style={{ margin: 0, fontWeight: 800, textTransform: 'uppercase' }}>{advisories[0].agent_source} SYSTEM ADVISORY</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600 }}>{advisories[0].message}</p>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="premium-card stat-box">
          <div className="stat-lbl">{t('pilot.pilotBadge')}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
            <div className="stat-icon" style={{ background: "var(--primary-light)", color: "var(--primary)", width: "40px", height: "40px" }}>
              🚁
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700 }}>João Pedro Silva</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t('pilot.license')}</div>
            </div>
          </div>
        </div>
        <div className="premium-card stat-box">
          <div className="stat-lbl">{t('pilot.flightsPending')}</div>
          <div className="stat-val">{flightQueue.length} {flightQueue.length === 1 ? t('pilot.missionSingle') : t('pilot.missionPlural')}</div>
        </div>
      </div>

      <div className="gis-container-grid">
        {/* Left Column: Dispatched Missions */}
        <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            {t('pilot.dispatchedMissions')}
          </h3>

          {flightQueue.length === 0 ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center", border: "1px dashed var(--border-light)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📭</div>
              <h4 style={{ fontWeight: 600, color: "var(--text-dark)", marginBottom: "4px" }}>{t('pilot.noMissions')}</h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {t('pilot.noMissionsDesc')}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {flightQueue.map((mission) => {
                const isSelected = activeMission?.id === mission.id;
                return (
                  <div
                    key={mission.id}
                    className={`plot-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      if (!isUploading) {
                        setActiveMissionId(mission.id);
                      }
                    }}
                    style={{
                      flexDirection: "column",
                      alignItems: "stretch",
                      gap: "12px",
                      cursor: isUploading ? "not-allowed" : "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-dark)" }}>
                            {mission.plotName}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "rgba(245, 158, 11, 0.1)",
                              color: "var(--accent-amber)",
                              fontWeight: 700,
                            }}
                          >
                            {t('pilot.dispatched')}
                          </span>
                        </div>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                          {mission.farmName} • {mission.areaSize} ha
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)" }}>
                          {mission.crop}
                        </span>
                        <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {mission.reportTitle}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          borderTop: "1px solid var(--border-light)",
                          paddingTop: "12px",
                          marginTop: "4px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            className="btn-secondary"
                            onClick={() => handleDownloadKML(mission)}
                            style={{ padding: "8px 16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                            disabled={isUploading}
                          >
                            <span>💾</span> {t('pilot.downloadKml')}
                          </button>
                        </div>

                        {/* Resilient Field-to-Cloud Ingestion Component */}
                        <FieldToCloudIngestion
                          missionId={mission.id}
                          plotName={mission.plotName}
                          onUploadComplete={() => {
                            // Stage 4: Processing Complete simulation after successful backend trigger
                            setFarms((prevFarms) => {
                              return prevFarms.map((farm) => {
                                const updatedFeatures = farm.plots.features.map((feature: PlotFeature) => {
                                  if (feature.properties.id === mission.plotId) {
                                    return {
                                      ...feature,
                                      properties: {
                                        ...feature.properties,
                                        health: 98, // Restored vigor
                                      },
                                    };
                                  }
                                  return feature;
                                });
                                return {
                                  ...farm,
                                  plots: {
                                    ...farm.plots,
                                    features: updatedFeatures,
                                  },
                                };
                              });
                            });

                            // Add dynamic report to purchasedReports
                            const reportTitle = mission.reportTitle || "Agricultural Intelligence";
                            setPurchasedReports((prev) => [
                              ...prev,
                              {
                                id: `purchased-${mission.id}`,
                                plotId: mission.plotId,
                                reportId: mission.reportId,
                                title: reportTitle,
                                crop: mission.crop,
                                completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              },
                            ]);

                            // Mark the flight mission as completed
                            setFlightQueue((prev) => prev.filter((item) => item.id !== mission.id));
                            setActiveMissionId(null);
                            triggerToast(`✅ ${t('pilot.toastMissionComplete')}`);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Telemetry & Equipment */}
        <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "16px", height: "fit-content" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            {t('pilot.equipmentTelemetry')}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Battery status */}
            <div style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                {t('pilot.droneStatus')}
              </span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>DJI Mavic 3M</span>
                <span style={{ fontSize: "12px", color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }}></span>
                  {t('pilot.connected')}
                </span>
              </div>
            </div>

            {/* Battery percentage */}
            <div style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                {t('pilot.smartBatteries')}
              </span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>Pack A & Pack B</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)" }}>🔋 100% {t('pilot.charged')}</span>
              </div>
            </div>

            {/* MicroSD & Storage */}
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                {t('pilot.storageCapacity')}
              </span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>Ultra High-Speed SD</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-dark)" }}>118 GB {t('pilot.free')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      <div className={`toast-notification ${showToast ? "show" : ""}`}>
        <div className="toast-dot"></div>
        <span>{toastMessage}</span>
      </div>
    </>
  );
}
