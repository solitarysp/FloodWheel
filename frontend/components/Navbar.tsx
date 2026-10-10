import React from "react";
import Link from "next/link";
import { Droplets, Activity, Layers, UploadCloud, Radio, Camera } from "lucide-react";

export const Navbar: React.FC = () => {
  return (
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

        <nav className="flex items-center space-x-6 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-blue-600 transition flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            <span>Overview</span>
          </Link>
          <Link href="/cameras" className="hover:text-blue-600 transition flex items-center gap-1.5 text-blue-600 font-semibold">
            <Camera className="w-4 h-4 text-blue-600" />
            <span>Live Cameras</span>
          </Link>
          <Link href="/demo" className="hover:text-blue-600 transition flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4" />
            <span>Gemini Demo</span>
          </Link>
          <Link href="/dashboard" className="hover:text-blue-600 transition flex items-center gap-1.5">
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
        </nav>
      </div>
    </header>
  );
};
