// ABOUTME: SettingsPanel component - collapsible panel for widget appearance settings
// ABOUTME: Provides opacity slider, theme switcher, GitHub PAT input with connection test

import { useState, useEffect, CSSProperties } from "react";
import { fontSizes, colors, THEMES, ThemeKey } from "../theme";
import type { WidgetSettings } from "../types";

type PatStatus = 'idle' | 'testing' | 'ok' | 'error';

async function testPat(pat: string): Promise<{ status: PatStatus; msg: string }> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json" },
    });
    if (res.ok) {
      const data = await res.json();
      return { status: 'ok', msg: `✓ ${data.login}` };
    }
    if (res.status === 401) return { status: 'error', msg: "유효하지 않은 토큰" };
    return { status: 'error', msg: `오류 ${res.status}` };
  } catch {
    return { status: 'error', msg: "네트워크 오류" };
  }
}

interface SettingsPanelProps {
  settings: WidgetSettings;
  onUpdate: (patch: Partial<WidgetSettings>) => void;
}

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "6px 0",
};

const label: CSSProperties = {
  fontSize: fontSizes.xs,
  color: colors.textSubtle,
  flexShrink: 0,
};

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  const currentTheme = settings.theme;
  const themeAccent = THEMES[currentTheme].accent;

  const [patDraft, setPatDraft] = useState(settings.githubPat ?? "");
  const [patStatus, setPatStatus] = useState<PatStatus>('idle');
  const [patMsg, setPatMsg] = useState("");

  // Sync if PAT changes externally
  useEffect(() => { setPatDraft(settings.githubPat ?? ""); }, [settings.githubPat]);

  // Test PAT on mount if one is already saved
  useEffect(() => {
    const pat = settings.githubPat;
    if (!pat) return;
    setPatStatus('testing');
    setPatMsg("확인 중...");
    testPat(pat).then(r => { setPatStatus(r.status); setPatMsg(r.msg); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  const handlePatBlur = async () => {
    const val = patDraft.trim();
    onUpdate({ githubPat: val || undefined });
    if (!val) { setPatStatus('idle'); setPatMsg(""); return; }
    setPatStatus('testing');
    setPatMsg("확인 중...");
    const result = await testPat(val);
    setPatStatus(result.status);
    setPatMsg(result.msg);
  };

  return (
    <div style={{
      borderTop: `1px solid ${colors.borderFaint}`,
      padding: "10px 24px 14px",
    }}>
      <div style={row}>
        <span style={label}>투명도</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <input
            type="range"
            min={20}
            max={100}
            value={Math.round(settings.opacity * 100)}
            onChange={e => onUpdate({ opacity: Number(e.target.value) / 100 })}
            style={{ flex: 1, accentColor: themeAccent, cursor: "pointer" }}
          />
          <span style={{ fontSize: fontSizes.xs, color: colors.textDim, width: 32, textAlign: "right" }}>
            {Math.round(settings.opacity * 100)}%
          </span>
        </div>
      </div>

      <div style={row}>
        <span style={label}>테마</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(Object.keys(THEMES) as ThemeKey[]).map(key => {
            const t = THEMES[key];
            const active = currentTheme === key;
            return (
              <button
                key={key}
                title={t.name}
                onClick={() => onUpdate({ theme: key })}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: `rgb(${t.bgRgb})`,
                  border: active
                    ? `2px solid ${t.accent}`
                    : `2px solid rgba(255,255,255,0.15)`,
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: active ? `0 0 6px ${t.accent}60` : "none",
                  transition: "border 0.15s, box-shadow 0.15s",
                }}
              />
            );
          })}
        </div>
      </div>

      <div style={{ ...row, flexWrap: "wrap", gap: 6 }}>
        <span style={label}>GitHub PAT</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
          <input
            type="password"
            placeholder="ghp_..."
            value={patDraft}
            onChange={e => { setPatDraft(e.target.value); setPatStatus('idle'); setPatMsg(""); }}
            onBlur={handlePatBlur}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${
                patStatus === 'ok' ? colors.statusActive :
                patStatus === 'error' ? colors.statusPaused :
                colors.borderFaint
              }`,
              borderRadius: 4,
              color: colors.textHigh,
              fontSize: fontSizes.xs,
              padding: "3px 6px",
              outline: "none",
              fontFamily: "monospace",
              transition: "border-color 0.2s",
            }}
          />
          {patMsg && (
            <span style={{
              fontSize: fontSizes.xs,
              color: patStatus === 'ok' ? colors.statusActive :
                     patStatus === 'error' ? colors.statusPaused :
                     colors.textDim,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              {patMsg}
            </span>
          )}
        </div>
      </div>

      <div style={row}>
        <span style={label}>GitHub 새로고침</span>
        <div style={{ display: "flex", gap: 4 }}>
          {([5, 10, 30, 60] as const).map(min => {
            const active = (settings.githubRefreshInterval ?? 10) === min;
            return (
              <button
                key={min}
                onClick={() => onUpdate({ githubRefreshInterval: min })}
                style={{
                  fontSize: fontSizes.xs,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "transparent",
                  color: active ? themeAccent : colors.textSubtle,
                  border: `1px solid ${active ? themeAccent : colors.borderFaint}`,
                  cursor: "pointer",
                  fontWeight: active ? 600 : 400,
                  transition: "border 0.15s, color 0.15s",
                }}
              >
                {min}m
              </button>
            );
          })}
        </div>
      </div>

      <div style={row}>
        <span style={label}>시계</span>
        <div style={{ display: "flex", gap: 4 }}>
          {(["24h", "12h"] as const).map(fmt => {
            const active = (settings.clockFormat ?? "24h") === fmt;
            return (
              <button
                key={fmt}
                onClick={() => onUpdate({ clockFormat: fmt })}
                style={{
                  fontSize: fontSizes.xs,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "transparent",
                  color: active ? themeAccent : colors.textSubtle,
                  border: `1px solid ${active ? themeAccent : colors.borderFaint}`,
                  cursor: "pointer",
                  fontWeight: active ? 600 : 400,
                  transition: "border 0.15s, color 0.15s",
                }}
              >
                {fmt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
