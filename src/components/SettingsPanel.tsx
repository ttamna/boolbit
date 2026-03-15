// ABOUTME: SettingsPanel component - collapsible panel for widget appearance settings
// ABOUTME: Provides opacity slider, theme switcher, GitHub PAT input, and data export/import

import { useState, useEffect, useRef, CSSProperties } from "react";
import { fontSizes, colors, THEMES, ThemeKey } from "../theme";
import type { WidgetSettings, WidgetData } from "../types";
import { buildExportBlob, triggerDownload, parseImportedData } from "../lib/dataIO";

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
  widgetData?: WidgetData;
  onImport?: (data: WidgetData) => void;
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
  color: colors.textDim,
  flexShrink: 0,
};

export function SettingsPanel({ settings, onUpdate, widgetData, onImport }: SettingsPanelProps) {
  const currentTheme = settings.theme;
  const themeAccent = THEMES[currentTheme].accent;

  const [patDraft, setPatDraft] = useState(settings.githubPat ?? "");
  const [patStatus, setPatStatus] = useState<PatStatus>('idle');
  const [patMsg, setPatMsg] = useState("");

  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {(Object.keys(THEMES) as ThemeKey[]).map(key => {
            const t = THEMES[key];
            const active = currentTheme === key;
            return (
              <button
                key={key}
                title={t.name}
                onClick={() => onUpdate({ theme: key })}
                style={{
                  position: "relative",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: `rgb(${t.bgRgb})`,
                  border: active
                    ? `2px solid ${t.accent}`
                    : `2px solid rgba(255,255,255,0.15)`,
                  cursor: "pointer",
                  padding: 0,
                  overflow: "hidden",
                  boxShadow: active ? `0 0 6px ${t.accent}60` : "none",
                  transition: "border 0.15s, box-shadow 0.15s",
                }}
              >
                {/* Accent dot — always visible so themes are distinguishable without hovering */}
                <span style={{
                  position: "absolute",
                  top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 6, height: 6,
                  borderRadius: "50%",
                  background: t.accent,
                  opacity: active ? 0.95 : 0.55,
                  transition: "opacity 0.15s",
                  pointerEvents: "none",
                }} />
              </button>
            );
          })}
          {/* Active theme name — renders next to swatches so the selected theme is labelled without hover */}
          <span style={{
            fontSize: fontSizes.mini,
            color: colors.textMid,
            letterSpacing: 0.5,
            userSelect: "none",
          }}>
            {THEMES[currentTheme].name}
          </span>
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

      <div style={{ ...row, alignItems: "flex-start", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: `1px solid ${colors.borderFaint}` }}>
        <span style={label}>데이터 백업</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => {
              if (!widgetData) return;
              const date = new Date().toISOString().slice(0, 10);
              triggerDownload(buildExportBlob(widgetData), `vision-widget-${date}.json`);
            }}
            disabled={!widgetData}
            style={{
              fontSize: fontSizes.xs,
              padding: "3px 10px",
              borderRadius: 4,
              background: "transparent",
              color: widgetData ? themeAccent : colors.textPhantom,
              border: `1px solid ${widgetData ? themeAccent : colors.borderFaint}`,
              cursor: widgetData ? "pointer" : "default",
              transition: "border 0.15s, color 0.15s",
            }}
          >
            내보내기
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              fontSize: fontSizes.xs,
              padding: "3px 10px",
              borderRadius: 4,
              background: "transparent",
              color: colors.textSubtle,
              border: `1px solid ${colors.borderFaint}`,
              cursor: "pointer",
              transition: "border 0.15s, color 0.15s",
            }}
          >
            가져오기
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => {
                const text = ev.target?.result;
                if (typeof text !== "string") return;
                const result = parseImportedData(text);
                if (result.ok) {
                  onImport?.(result.data);
                  setImportMsg({ text: "가져오기 완료", ok: true });
                  // Auto-clear success message after 3 s so re-imports are distinguishable
                  setTimeout(() => setImportMsg(null), 3000);
                } else {
                  setImportMsg({ text: result.error, ok: false });
                }
                // Reset so same file can be re-selected
                e.target.value = "";
              };
              reader.onerror = () => {
                setImportMsg({ text: "파일 읽기 오류가 발생했습니다.", ok: false });
                e.target.value = "";
              };
              reader.readAsText(file);
            }}
          />
        </div>
        {importMsg && (
          <span style={{
            fontSize: fontSizes.xs,
            color: importMsg.ok ? colors.statusActive : colors.statusPaused,
          }}>
            {importMsg.text}
          </span>
        )}
      </div>
    </div>
  );
}
