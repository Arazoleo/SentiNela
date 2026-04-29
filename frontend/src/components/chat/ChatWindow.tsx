"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, WifiOff, Activity, ArrowDown, Plus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { SentinelaWS } from "@/lib/websocket";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import SyndromeCard from "./SyndromeCard";

export default function ChatWindow() {
  const { token } = useAuthStore();
  const {
    messages, isTyping, syndrome, nearestClinics, isConnected, _hasHydrated,
    addMessage, setMessages, clearHistory, setTyping,
    setSyndrome, setNearestClinics, setSessionId, setConnected,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newSessionPending, setNewSessionPending] = useState(false);
  const wsRef    = useRef<SentinelaWS | null>(null);
  const endRef   = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const connectWS = useCallback((forceNew = false) => {
    if (!token) return;
    wsRef.current?.disconnect();

    const ws = new SentinelaWS(token, forceNew);
    wsRef.current = ws;

    const unsub = ws.onMessage((msg) => {
      setTyping(false);

      if (msg.type === "history") {
        // Sessão existente — carrega mensagens do servidor (fonte de verdade)
        const serverMsgs = (msg.messages ?? []).map((m: any) => ({
          id:        m.id,
          role:      m.role as "user" | "assistant",
          content:   m.content,
          timestamp: m.timestamp,
        }));
        setMessages(serverMsgs);
        setSessionId(msg.session_id!);
        setConnected(true);
        // Restaura síndrome se já classificada
        if (msg.syndrome) {
          // Keep existing syndrome card if we have one; only update sessionId
          // The SyndromeCard data comes from the last classification event
        }
        return;
      }

      if (msg.type === "connected") {
        setConnected(true);
        setSessionId(msg.session_id!);
        // Saudação apenas em sessão nova (sem histórico no server)
        addMessage({
          id:        crypto.randomUUID(),
          role:      "assistant",
          content:   msg.message!,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (msg.type === "typing") { setTyping(true); return; }

      if (msg.type === "message" || msg.type === "classification") {
        if (msg.message) {
          addMessage({
            id:        crypto.randomUUID(),
            role:      "assistant",
            content:   msg.message,
            timestamp: new Date().toISOString(),
          });
        }
        if (msg.syndrome)        setSyndrome(msg.syndrome as any);
        if (msg.nearest_clinics) setNearestClinics(msg.nearest_clinics as any);
      }
    });

    ws.connect();
    return unsub;
  }, [token]);

  // Connect on mount (after hydration) and on token change
  useEffect(() => {
    if (!token || !_hasHydrated) return;
    const unsub = connectWS(false);
    return () => {
      unsub?.();
      wsRef.current?.disconnect();
      setConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, _hasHydrated]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const handleNewConversation = useCallback(() => {
    setNewSessionPending(true);
    clearHistory();
    const unsub = connectWS(true);
    setNewSessionPending(false);
    return () => unsub?.();
  }, [connectWS, clearHistory]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !wsRef.current?.isOpen) return;
    addMessage({
      id:        crypto.randomUUID(),
      role:      "user",
      content:   text,
      timestamp: new Date().toISOString(),
    });
    wsRef.current.send(text);
    setInput("");
    inputRef.current?.focus();
  }, [input, addMessage]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#020e07" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(13,51,32,0.6)", background: "rgba(3,14,8,0.8)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(0,214,122,0.15), rgba(0,214,122,0.05))", border: "1px solid rgba(0,214,122,0.2)" }}>
              <Activity className="w-4.5 h-4.5 text-[#00d67a]" style={{ width: 18, height: 18 }} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
              style={{ borderColor: "#020e07", background: isConnected ? "#00ff87" : "#2a5e3a", boxShadow: isConnected ? "0 0 6px #00ff87" : "none", transition: "all 0.4s" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">Sentinela</p>
            <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: isConnected ? "#00d67a" : "#3d6e50" }}>
              {isConnected
                ? <><span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] inline-block" style={{ boxShadow: "0 0 4px #00ff87" }} />Online · Pronto para analisar</>
                : <><WifiOff className="w-3 h-3" />Conectando...</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewConversation}
            disabled={newSessionPending}
            title="Nova conversa"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
            style={{ border: "1px solid #0d3320", color: "#3d6e50", background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,214,122,0.3)"; e.currentTarget.style.color = "#00d67a"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#0d3320"; e.currentTarget.style.color = "#3d6e50"; }}
          >
            <Plus className="w-3 h-3" />
            Nova conversa
          </button>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#1e4a2e" }}>
            Assistente Sindrômico
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-6 space-y-4"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,214,122,0.025) 0%, transparent 60%), #020e07" }}>

        {messages.length === 0 && !isConnected && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(0,214,122,0.06)", border: "1px solid rgba(0,214,122,0.1)" }}>
              <Activity className="w-6 h-6 text-[#3d6e50]" />
            </div>
            <p className="text-sm text-[#3d6e50]">Conectando ao assistente...</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
        </AnimatePresence>

        <AnimatePresence>
          {isTyping && (
            <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="px-1">
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        {syndrome && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }} className="px-1">
            <SyndromeCard syndrome={syndrome} clinics={nearestClinics} />
          </motion.div>
        )}

        <div ref={endRef} className="h-1" />
      </div>

      {/* Scroll button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-24 right-6 w-8 h-8 rounded-full flex items-center justify-center z-10"
            style={{ background: "rgba(0,214,122,0.15)", border: "1px solid rgba(0,214,122,0.3)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
            <ArrowDown className="w-4 h-4 text-[#00d67a]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid rgba(13,51,32,0.5)" }}>
        <div className="flex items-end gap-2 rounded-2xl px-4 py-3 transition-all duration-200"
          style={{ background: "rgba(6,18,10,0.9)", border: "1px solid rgba(13,51,32,0.8)" }}
          onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,214,122,0.3)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(0,214,122,0.06)"; }}
          onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(13,51,32,0.8)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
          <textarea ref={inputRef} value={input} onChange={handleInput} onKeyDown={handleKey}
            placeholder="Descreva seus sintomas..." rows={1} disabled={!isConnected}
            className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed disabled:opacity-40"
            style={{ color: "#d4edda", caretColor: "#00d67a", maxHeight: 120, minHeight: 22, scrollbarWidth: "none" }} />
          <motion.button onClick={handleSend} disabled={!input.trim() || !isConnected}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: input.trim() && isConnected ? "linear-gradient(135deg,#00d67a,#00a85c)" : "rgba(13,51,32,0.5)", boxShadow: input.trim() && isConnected ? "0 0 12px rgba(0,214,122,0.3)" : "none" }}>
            <Send className="w-3.5 h-3.5" style={{ color: input.trim() && isConnected ? "#020b07" : "#2a5e3a" }} />
          </motion.button>
        </div>
        <p className="text-center text-[10px] font-mono mt-2" style={{ color: "#1e4a2e" }}>
          Enter para enviar · Shift+Enter nova linha
        </p>
      </div>
    </div>
  );
}
