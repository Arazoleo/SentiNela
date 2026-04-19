"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push("/login");
  }, [_hasHydrated, isAuthenticated, router]);

  // Aguarda hidratação do localStorage antes de decidir
  if (!_hasHydrated) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}
