"use client";
import { useState, useRef, useEffect } from "react";
import { Brain, Send, Sparkles, ChevronRight, User, RotateCcw, Copy, Check } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";

const API = "http://localhost:8000/api/v1";

const suggestedPrompts = [
  "Why did the Warriors beat the Lakers last season?",
  "Why is Nikola Jokic so efficient in the pick-and-roll?",
  "Why does Steph Curry generate so many open shots?",
  "Why is OKC's offense so hard to defend?",
  "Why did the Celtics struggle defensively in the playoffs?",
  "Why is Wembanyama already elite at 20?",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  loading?: boolean;
}

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--cv-orange)",
          animation: "livePulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg, onCopy }: { msg: Message; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = () => {
    onCopy(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: "flex", gap: 12,
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: isUser ? "linear-gradient(135deg, #F97316, #EA6A0A)" : "linear-gradient(135deg, #8B5CF6, #6D28D9)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${isUser ? "rgba(249,115,22,0.3)" : "rgba(139,92,246,0.3)"}`,
      }}>
        {isUser
          ? <User style={{ width: 14, height: 14, color: "white" }} />
          : <Brain style={{ width: 14, height: 14, color: "white" }} />
        }
      </div>

      <div style={{ maxWidth: "75%", minWidth: 60 }}>
        <div style={{
          background: isUser ? "rgba(249,115,22,0.1)" : "var(--cv-card)",
          border: `1px solid ${isUser ? "rgba(249,115,22,0.2)" : "var(--cv-border)"}`,
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          padding: "12px 14px",
        }}>
          {msg.loading ? (
            <TypingDots />
          ) : (
            <>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--cv-text)", whiteSpace: "pre-wrap" }}>
                {msg.content}
              </p>
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--cv-border)" }}>
                  <p style={{ fontSize: 10, color: "var(--cv-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Sources</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {msg.sources.map((s, i) => (
                      <span key={i} style={{
                        padding: "2px 8px",
                        background: "rgba(139,92,246,0.1)",
                        border: "1px solid rgba(139,92,246,0.2)",
                        borderRadius: 100, fontSize: 11, color: "#8B5CF6", fontWeight: 500,
                      }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!msg.loading && !isUser && (
          <button onClick={handleCopy} style={{
            marginTop: 6, display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--cv-muted)", fontSize: 11, padding: "2px 4px",
            borderRadius: 4, transition: "color 150ms",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cv-text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--cv-muted)")}
          >
            {copied
              ? <><Check style={{ width: 10, height: 10, color: "#10B981" }} /><span style={{ color: "#10B981" }}>Copied</span></>
              : <><Copy style={{ width: 10, height: 10 }} />Copy</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "assistant",
    content: "Hey! I'm Coach AI — ask me any basketball \"why\" question and I'll break it down using real stats, play patterns, and game context.\n\nTry: \"Why is Jokic the most efficient big man in history?\"",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setInput(q);
  }, []);

  const sendMessage = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q };
    const loadingMsg: Message = { id: "loading", role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/coach/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `HTTP ${res.status}`);
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        { id: Date.now().toString(), role: "assistant", content: data.answer, sources: data.sources || [] },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Failed: ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <PageWrapper>
      <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ padding: 8, borderRadius: 10, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <Brain style={{ width: 18, height: 18, color: "#8B5CF6" }} />
            </div>
            <div>
              <h1 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--cv-text)" }}>Coach AI</h1>
              <p style={{ fontSize: 12, color: "var(--cv-muted)" }}>Powered by Llama 3.3 · Real stats · Game-level context</p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <span className="badge badge-ai"><Sparkles style={{ width: 9, height: 9 }} /> AI</span>
              <span className="badge badge-live">
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
                Live
              </span>
            </div>
          </div>
        </div>

        {messages.length === 1 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: "var(--cv-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Try asking</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {suggestedPrompts.map((p) => (
                <button key={p} onClick={() => sendMessage(p)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px", background: "var(--cv-card)",
                  border: "1px solid var(--cv-border)", borderRadius: 10,
                  cursor: "pointer", textAlign: "left", transition: "all 150ms ease",
                }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.4)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cv-border)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--cv-card)"; }}
                >
                  <Brain style={{ width: 12, height: 12, color: "var(--cv-muted)", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--cv-muted)", lineHeight: 1.4 }}>{p}</span>
                  <ChevronRight style={{ width: 11, height: 11, color: "var(--cv-subtle)", marginLeft: "auto", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingRight: 4, marginBottom: 16 }}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onCopy={(text) => navigator.clipboard.writeText(text).catch(() => {})} />
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={{
          background: "var(--cv-card)", border: "1px solid var(--cv-border)",
          borderRadius: 14, padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <Brain style={{ width: 16, height: 16, color: "var(--cv-orange)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask a basketball question... (Enter to send)"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: "var(--cv-text)", fontFamily: "Inter, sans-serif" }}
          />
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {messages.length > 1 && (
              <button onClick={() => setMessages(messages.slice(0, 1))} title="Clear chat" style={{
                padding: 6, background: "transparent", border: "1px solid var(--cv-border)",
                borderRadius: 7, color: "var(--cv-muted)", cursor: "pointer",
                display: "flex", alignItems: "center", transition: "all 150ms",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.4)"; (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cv-border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--cv-muted)"; }}
              >
                <RotateCcw style={{ width: 13, height: 13 }} />
              </button>
            )}
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{
              padding: "6px 14px",
              background: input.trim() && !loading ? "var(--cv-orange)" : "rgba(249,115,22,0.2)",
              border: "none", borderRadius: 8,
              color: input.trim() && !loading ? "white" : "rgba(249,115,22,0.5)",
              cursor: input.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 600, transition: "all 150ms",
            }}>
              <Send style={{ width: 13, height: 13 }} /> Ask
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--cv-subtle)", marginTop: 8 }}>
          Powered by Llama 3.3 70B via Groq · Grounded in real NBA data
        </p>
      </div>
    </PageWrapper>
  );
}