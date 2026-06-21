"use client";

import React, { useState } from "react";
import { AGROSUL_DATA } from "@/lib/mockData";

import { User } from "@/types/agrosul";
import { useTranslation } from "react-i18next";

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const user = AGROSUL_DATA.users.find(u => u.email === email);
    if (user) {
      onLogin(user);
    } else {
      setError(t('auth.invalidLogin'));
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          <div className="auth-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22 22 2"/>
              <path d="M3.47 11.53c.47.47 1.04.83 1.67 1.05.65.23 1.34.33 2.03.31.69-.02 1.37-.15 2.02-.38.64-.23 1.25-.56 1.78-1.01.53-.45.98-.99 1.31-1.61.34-.61.55-1.28.64-1.97.09-.69.06-1.39-.1-2.07-.15-.68-.42-1.32-.78-1.89-1.25-2.03-3.69-2.91-5.91-2.07-2.22.84-3.5 3.12-3.05 5.46.22 1.15.76 2.19 1.54 3.01.3.32.64.6 1.01.83"/>
              <path d="M11.53 3.47c.47.47.83 1.04 1.05 1.67.23.65.33 1.34.31 2.03-.02.69-.15 1.37-.38 2.02-.23.64-.56 1.25-1.01 1.78-.45.53-.99.98-1.61 1.31-.61.34-1.28.55-1.97.64-.69.09-1.39.06-2.07-.1-.68-.15-1.32-.42-1.89-.78-2.03-1.25-2.91-3.69-2.07-5.91.84-2.22 3.12-3.5 5.46-3.05 1.15.22 2.19.76 3.01 1.54.32.3.6.64.83 1.01"/>
            </svg>
            <span>{"Agrosul"}</span>
          </div>
          <div style={{ marginBottom: "2rem" }}>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "2rem", color: "var(--text-dark)", letterSpacing: "-0.5px" }}>{t('auth.title')}</h1>
            <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6 }}>
              {t('auth.subtitle')}
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="input-group">
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-dark)" }}>
                {t('auth.email')}
              </label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com" 
                required 
              />
            </div>
            <div className="input-group">
              <label>{t('auth.password')}</label>
              <input type="password" value="123" readOnly />
            </div>
            {error && <p style={{ color: "red", fontSize: "0.85rem" }}>{error}</p>}
            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "16px" }}>
              {t('auth.submit')}
            </button>
          </form>

          <div style={{ marginTop: '32px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '24px' }}>
            <div style={{ textAlign: "center", margin: "16px 0", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
              {t('auth.demoTitle')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn-secondary w-100" onClick={() => { setEmail("carlos@fazenda.com.br"); setTimeout(() => onLogin(AGROSUL_DATA.users[0]), 100); }}>
                {t('auth.loginProducer')}
              </button>
              <button className="btn-secondary w-100" onClick={() => { setEmail("joao@agrosul.com.br"); setTimeout(() => onLogin(AGROSUL_DATA.users[1]), 100); }}>
                {t('auth.loginPilot')}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="auth-image-side">
        <div className="auth-hero-text">
          <h1>{t('auth.heroTitle')}</h1>
          <p>{t('auth.heroSubtitle')}</p>
        </div>
      </div>
    </div>
  );
}
