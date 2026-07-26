"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 移除「設定」— 改由各頁面右上角的 ⚙️ 連結進入，導覽列維持 6 項較為舒適
const NAV_ITEMS = [
  { href: "/", icon: "🏠", label: "首頁" },
  { href: "/scan", icon: "📸", label: "拍照" },
  { href: "/search", icon: "🔍", label: "搜尋" },
  { href: "/history", icon: "📋", label: "歷史" },
  { href: "/inbody", icon: "🏋️", label: "InBody" },
  { href: "/stats", icon: "📊", label: "統計" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
