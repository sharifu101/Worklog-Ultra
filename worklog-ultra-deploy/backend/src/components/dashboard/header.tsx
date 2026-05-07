"use client";

import Link from "next/link";
import { Bell, LogOut, MessageSquareMore, Search, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MobileSidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function DashboardHeader({
  user,
}: {
  user: {
    name: string;
    role: "employee" | "hr" | "manager" | "admin";
    roleTitle: string;
    designation: string | null;
    avatarUrl?: string | null;
    unreadMessages: number;
    pendingApprovals: number;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadMessages, setUnreadMessages] = useState(user.unreadMessages);
  const previousUnreadRef = useRef(user.unreadMessages);
  const visibleUnreadMessages = pathname === "/dashboard/messages" ? 0 : unreadMessages;

  useEffect(() => {
    let cancelled = false;

    async function pollUnread() {
      const response = await fetch("/api/messages/status", { cache: "no-store" });
      const raw = await response.text();
      const result = raw ? JSON.parse(raw) : { unreadCount: 0 };

      if (!response.ok || cancelled) {
        return;
      }

      const nextCount = pathname === "/dashboard/messages" ? 0 : Number(result.unreadCount ?? 0);
      if (nextCount > previousUnreadRef.current) {
        try {
          const AudioContextRef = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioContextRef) {
            const audioContext = new AudioContextRef();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.24);
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.24);
          }
        } catch {
          // Ignore browser autoplay / audio-context restrictions.
        }
      }

      previousUnreadRef.current = nextCount;
      setUnreadMessages(nextCount);
    }

    pollUnread().catch(() => null);
    const interval = window.setInterval(() => {
      pollUnread().catch(() => null);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const result = await response.json();
    toast.success(result.message);
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-4 border-b border-[var(--panel-border)] bg-[rgba(15,23,37,0.96)] px-4 py-4 backdrop-blur xl:px-6">
      <MobileSidebar
        user={{
          name: user.name,
          role: user.role,
          designation: user.designation,
          avatarUrl: user.avatarUrl,
        }}
      />
      <div className="flex min-w-[220px] flex-1 items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 md:min-w-[280px]">
        <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
        <input
          className="w-full bg-transparent text-sm text-white placeholder:text-[var(--muted-foreground)]"
          placeholder="Search employee, task, report..."
        />
      </div>
      <Link
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        href="/dashboard/messages"
      >
        <MessageSquareMore className="h-5 w-5" />
        {visibleUnreadMessages > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[10px] font-semibold text-white shadow-[0_0_18px_rgba(239,68,68,0.45)]">
            {visibleUnreadMessages > 9 ? "9+" : visibleUnreadMessages}
          </span>
        ) : null}
      </Link>
      <Link
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        href="/dashboard/history"
      >
        <Bell className="h-5 w-5" />
        {user.pendingApprovals > 0 ? (
          <span className="absolute right-2 top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--warning)] px-1.5 text-[10px] font-semibold text-white">
            {user.pendingApprovals > 9 ? "9+" : user.pendingApprovals}
          </span>
        ) : null}
      </Link>
      <ThemeToggle className="h-12 w-12 rounded-2xl" />
      <Link
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] text-[var(--muted-foreground)] transition-colors hover:text-white"
        href="/dashboard/settings"
      >
        <Settings className="h-4 w-4" />
      </Link>
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2">
        <Avatar>
          {user.avatarUrl ? <AvatarImage alt={user.name} src={user.avatarUrl} /> : null}
          <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-white">{user.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{user.roleTitle}</p>
        </div>
        <Button onClick={logout} size="icon" variant="ghost">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
