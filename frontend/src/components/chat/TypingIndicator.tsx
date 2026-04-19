"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-center gap-3"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(0,214,122,0.08)", border: "1px solid rgba(0,214,122,0.2)" }}>
        <Activity className="w-4 h-4" style={{ color: "#00d67a" }} />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1"
        style={{ background: "rgba(6,26,14,0.9)", border: "1px solid #0d3320" }}>
        <span className="text-xs font-mono mr-2" style={{ color: "#2a5e3a" }}>Analisando</span>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </motion.div>
  );
}
