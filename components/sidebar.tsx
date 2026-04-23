"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Genel Bakış", icon: "📊" },
  { href: "/programs", label: "Programlar", icon: "🏋️" },
  { href: "/plans", label: "Planlar", icon: "📅" },
  { href: "/categories", label: "Kategoriler", icon: "📁" },
  { href: "/rewards", label: "Ödüller", icon: "🎁" },
  { href: "/claims", label: "Talepler", icon: "📦" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col">
      <div className="p-6 border-b border-[var(--border)]">
        <h1 className="text-xl font-bold text-[var(--accent)]">ATHLEVO</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Admin Panel</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border)]">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-white transition-colors text-left"
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
