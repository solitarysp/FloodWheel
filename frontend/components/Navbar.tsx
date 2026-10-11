import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Droplets,
  Activity,
  Layers,
  UploadCloud,
  Radio,
  Camera,
  ShieldCheck,
  Shield,
  LogOut,
  Sliders,
} from "lucide-react";
import { AdminLoginModal } from "./AdminLoginModal";
import { clearAdminAuth, getAdminUser, isAdminAuthenticated } from "../lib/auth";

export const Navbar: React.FC = () => {
  const router = useRouter();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  const checkAuth = () => {
    const authed = isAdminAuthenticated();
    setIsAdmin(authed);
    setAdminUser(getAdminUser());
  };

  useEffect(() => {
    checkAuth();

    // Listen to custom auth events and storage changes
    window.addEventListener("floodwheel_auth_change", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("floodwheel_auth_change", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  const handleLogout = () => {
    clearAdminAuth();
    if (router.pathname.startsWith("/admin")) {
      router.push("/");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-blue-600 font-bold text-xl">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Droplets className="w-5 h-5" />
            </div>
            <span className="tracking-tight text-slate-900">
              Flood<span className="text-blue-600">Wheel</span>
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium ml-1">
              Gemini Vision
            </span>
          </Link>

          <nav className="flex items-center space-x-5 text-sm font-medium text-slate-600">
            <Link
              href="/"
              className={`hover:text-blue-600 transition flex items-center gap-1.5 ${
                router.pathname === "/" ? "text-blue-600 font-semibold" : ""
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Overview</span>
            </Link>

            <Link
              href="/cameras"
              className={`hover:text-blue-600 transition flex items-center gap-1.5 ${
                router.pathname === "/cameras" ? "text-blue-600 font-semibold" : ""
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Live Cameras</span>
            </Link>

            <Link
              href="/demo"
              className={`hover:text-blue-600 transition flex items-center gap-1.5 ${
                router.pathname === "/demo" ? "text-blue-600 font-semibold" : ""
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Gemini Demo</span>
            </Link>

            <Link
              href="/dashboard"
              className={`hover:text-blue-600 transition flex items-center gap-1.5 ${
                router.pathname === "/dashboard" ? "text-emerald-600 font-semibold" : ""
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-500" />
              <span>Dashboard</span>
            </Link>

            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition flex items-center gap-1.5"
            >
              <Activity className="w-4 h-4" />
              <span>API Docs</span>
            </a>

            {/* Admin Controls */}
            <div className="pl-2 border-l border-slate-200 flex items-center gap-2">
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/admin"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                      router.pathname.startsWith("/admin")
                        ? "bg-indigo-600 text-white shadow-indigo-500/20"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Admin Panel</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    title="Đăng xuất quản trị"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <span>Admin</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          checkAuth();
          router.push("/admin");
        }}
      />
    </>
  );
};
