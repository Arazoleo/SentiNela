"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";

// ChatWindow usa WebSocket e localStorage — não pode ser SSR
const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), { ssr: false });

export default function PatientChatPage() {
  return (
    <div className="h-screen flex flex-col p-4 gap-4" style={{ background: "#020e07" }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 rounded-2xl overflow-hidden"
        style={{ border: "1px solid #0d3320", maxHeight: "calc(100vh - 2rem)" }}
      >
        <ChatWindow />
      </motion.div>
    </div>
  );
}
