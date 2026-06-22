"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface UserInfo {
  profileImage?: string;
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [token, setToken] = useState<string>("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userImageFailed, setUserImageFailed] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      const storedToken = localStorage.getItem("token") || "";
      const storedUser = localStorage.getItem("user");
      setToken(storedToken);

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setUserImageFailed(false);
        } catch {
          localStorage.removeItem("user");
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    syncAuthState();

    const handleStorage = () => {
      syncAuthState();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    {
      path: "/",
      label: "Home",
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 ${active ? "text-secondary" : "text-gray-600"}`}
          fill={active ? "#C9952A" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h3m10-11l2 3m-2-3v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      path: "/courses",
      label: "Courses",
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 ${active ? "text-secondary" : "text-gray-600"}`}
          fill={active ? "#C9952A" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },
    {
      path: "/testimonials",
      label: "Reviews",
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 ${active ? "text-secondary" : "text-gray-600"}`}
          fill={active ? "#C9952A" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      ),
    },
    {
      path: "/about",
      label: "About",
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 ${active ? "text-secondary" : "text-gray-600"}`}
          fill={active ? "#C9952A" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      path: "/dashboard",
      label: token ? "Profile" : "Sign In",
      icon: (active: boolean) => {
        if (user?.profileImage && !userImageFailed) {
          return (
            <img
              src={user.profileImage}
              alt="Profile"
              onError={() => setUserImageFailed(true)}
              className={`w-6 h-6 rounded-full ${active ? "ring-2 ring-secondary" : ""}`}
            />
          );
        }

        return (
          <svg
            className={`w-6 h-6 ${active ? "text-secondary" : "text-gray-600"}`}
            fill={active ? "#C9952A" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        );
      },
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                active
                  ? "bg-accent-warm dark:bg-gray-700 text-secondary"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {item.icon(active)}
              <span
                className={`text-xs mt-1 text-center ${active ? "text-secondary font-semibold" : "text-gray-600 dark:text-gray-400"}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
