"use client";

import { useState } from "react";
import AuthScreen from "@/components/AuthScreen";
import ProducerDashboard from "@/components/ProducerDashboard";
import PilotDashboard from "@/components/PilotDashboard";
import { AGROSUL_DATA } from "@/lib/mockData";

import { User, Farm, Mission, PurchasedReport } from "@/types/agrosul";
import "../i18n/config";
import { useTranslation } from "react-i18next";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'pt' : 'en');
  };

  // Shared reactive states to enable real-time synchronization between Producer and Pilot
  const [farms, setFarms] = useState<Farm[]>(AGROSUL_DATA.farms as unknown as Farm[]);
  const [flightQueue, setFlightQueue] = useState<Mission[]>([]);
  const [purchasedReports, setPurchasedReports] = useState<PurchasedReport[]>([]);

  if (!currentUser) {
    return <AuthScreen onLogin={setCurrentUser} />;
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col w-screen" style={{ height: "100vh", maxHeight: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", width: "100vw" }}>
      <div className="app-container active" id="app-view" style={{ display: 'flex', flex: 1, minHeight: 0, height: "100%" }}>
      
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="mobile-header">
        <button 
          className="btn-mobile-toggle" 
          id="btn-mobile-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="sidebar-brand" style={{ margin:0, padding:0, fontSize:"18px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight:"6px" }}>
            <path d="M2 22 22 2"/>
            <path d="M3.47 11.53c.47.47 1.04.83 1.67 1.05.65.23 1.34.33 2.03.31.69-.02 1.37-.15 2.02-.38.64-.23 1.25-.56 1.78-1.01.53-.45.98-.99 1.31-1.61.34-.61.55-1.28.64-1.97.09-.69.06-1.39-.1-2.07-.15-.68-.42-1.32-.78-1.89-1.25-2.03-3.69-2.91-5.91-2.07-2.22.84-3.5 3.12-3.05 5.46.22 1.15.76 2.19 1.54 3.01.3.32.64.6 1.01.83"/>
            <path d="M11.53 3.47c.47.47.83 1.04 1.05 1.67.23.65.33 1.34.31 2.03-.02.69-.15 1.37-.38 2.02-.23.64-.56 1.25-1.01 1.78-.45.53-.99.98-1.61 1.31-.61.34-1.28.55-1.97.64-.69.09-1.39.06-2.07-.1-.68-.15-1.32-.42-1.89-.78-2.03-1.25-2.91-3.69-2.07-5.91.84-2.22 3.12-3.5 5.46-3.05 1.15.22 2.19.76 3.01 1.54.32.3.6.64.83 1.01"/>
          </svg>
          <span>{t('page.brand')}</span>
        </div>
        <div style={{ width:"24px" }}></div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`} id="sidebar">
        <div className="sidebar-brand desktop-only">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight:"8px" }}>
            <path d="M2 22 22 2"/>
            <path d="M3.47 11.53c.47.47 1.04.83 1.67 1.05.65.23 1.34.33 2.03.31.69-.02 1.37-.15 2.02-.38.64-.23 1.25-.56 1.78-1.01.53-.45.98-.99 1.31-1.61.34-.61.55-1.28.64-1.97.09-.69.06-1.39-.1-2.07-.15-.68-.42-1.32-.78-1.89-1.25-2.03-3.69-2.91-5.91-2.07-2.22.84-3.5 3.12-3.05 5.46.22 1.15.76 2.19 1.54 3.01.3.32.64.6 1.01.83"/>
            <path d="M11.53 3.47c.47.47.83 1.04 1.05 1.67.23.65.33 1.34.31 2.03-.02.69-.15 1.37-.38 2.02-.23.64-.56 1.25-1.01 1.78-.45.53-.99.98-1.61 1.31-.61.34-1.28.55-1.97.64-.69.09-1.39.06-2.07-.1-.68-.15-1.32-.42-1.89-.78-2.03-1.25-2.91-3.69-2.07-5.91.84-2.22 3.12-3.5 5.46-3.05 1.15.22 2.19.76 3.01 1.54.32.3.6.64.83 1.01"/>
          </svg>
          <span>{t('page.brand')}</span>
        </div>
        
        <nav className="nav-menu" id="nav-menu">
          <button className="nav-btn active">
            <span className="nav-icon">
              {currentUser.role === "producer" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                  <line x1="9" y1="3" x2="9" y2="18"></line>
                  <line x1="15" y1="6" x2="15" y2="21"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              )}
            </span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-dark)" }}>
                {currentUser.role === "producer" ? t('page.mapping') : t('page.pilotConsole')}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{currentUser.company}</div>
            </div>
          </button>
        </nav>
        
        <div style={{ flex: 1 }}></div>

        <div className="language-switcher" style={{ padding: "0 24px", marginBottom: "16px" }}>
          <button 
            onClick={toggleLanguage}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "20px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--text-dark)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            {i18n.language === 'en' ? 'EN' : 'PT-BR'}
          </button>
        </div>
        
        <div className="user-profile-badge">
          <div className="user-avatar" id="sidebar-avatar">{currentUser.avatar}</div>
          <div className="user-info">
            <h4 id="sidebar-user-name">{currentUser.name}</h4>
            <p id="sidebar-user-company">{currentUser.company}</p>
          </div>
          <button 
            id="btn-logout" 
            onClick={() => {
              setCurrentUser(null);
              setIsSidebarOpen(false);
            }} 
            style={{ marginLeft: "auto", background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="content-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 }}>
        <section className="portal-view active" style={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {currentUser.role === "producer" ? (
            <ProducerDashboard 
              farms={farms}
              flightQueue={flightQueue}
              setFlightQueue={setFlightQueue}
              purchasedReports={purchasedReports}
            />
          ) : currentUser.role === "pilot" ? (
            <PilotDashboard 
              farms={farms}
              setFarms={setFarms}
              flightQueue={flightQueue}
              setFlightQueue={setFlightQueue}
              purchasedReports={purchasedReports}
              setPurchasedReports={setPurchasedReports}
            />
          ) : (
            <div className="empty-state">
              <h3>{t('page.unsupportedRole')}</h3>
              <p>{t('page.unsupportedRoleDesc')}</p>
            </div>
          )}
        </section>
      </main>

      </div>
    </div>
  );
}
