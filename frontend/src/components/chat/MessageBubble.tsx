"use client";

import { motion } from "framer-motion";
import { ChatMessage } from "@/store/chatStore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { Activity } from "lucide-react";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3 px-1`}
    >
      {!isUser && (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
          style={{
            background: "linear-gradient(135deg, rgba(0,214,122,0.15), rgba(0,214,122,0.05))",
            border: "1px solid rgba(0,214,122,0.2)",
          }}
        >
          <Activity className="w-3.5 h-3.5" style={{ color: "#00d67a" }} />
        </div>
      )}

      <div className={`flex flex-col gap-1 ${isUser ? "items-end max-w-[72%]" : "items-start max-w-[78%]"}`}>
        <div
          className="px-4 py-3 text-sm leading-relaxed"
          style={isUser ? {
            background: "linear-gradient(135deg, rgba(0,214,122,0.18) 0%, rgba(0,160,90,0.12) 100%)",
            border: "1px solid rgba(0,214,122,0.25)",
            borderRadius: "18px 18px 4px 18px",
            color: "#d4edda",
          } : {
            background: "rgba(8,24,14,0.9)",
            border: "1px solid rgba(13,51,32,0.8)",
            borderRadius: "4px 18px 18px 18px",
            color: "#a8d5b5",
          }}
        >
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                strong: ({ children }) => (
                  <strong style={{ color: "#7adba4", fontWeight: 600 }}>{children}</strong>
                ),
                em: ({ children }) => (
                  <em style={{ color: "#6aad87", fontStyle: "italic" }}>{children}</em>
                ),
                ul: ({ children }) => <ul className="mt-1.5 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="mt-1.5 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#00d67a" }} />
                    <span style={{ color: "#a8d5b5" }}>{children}</span>
                  </li>
                ),
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{ background: "rgba(0,214,122,0.08)", color: "#00d67a", border: "1px solid rgba(0,214,122,0.15)" }}>
                    {children}
                  </code>
                ),
                h3: ({ children }) => (
                  <h3 className="font-semibold text-sm mb-1 mt-2" style={{ color: "#c8e8d4" }}>{children}</h3>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        <span className="text-[10px] font-mono px-1" style={{ color: "#1e4a2e" }}>
          {format(message.timestamp, "HH:mm", { locale: ptBR })}
        </span>
      </div>
    </motion.div>
  );
}
