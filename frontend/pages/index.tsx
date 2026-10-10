import React from "react";
import Head from "next/head";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  Droplets,
  ArrowRight,
  Shield,
  Eye,
  Activity,
  Layers,
  MapPin,
  TrendingUp,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Head>
        <title>FloodWheel — Real-Time Urban Flood Depth Intelligence</title>
      </Head>

      <Navbar />

      <main className="flex-1 space-y-16 py-12">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
            <Droplets className="w-4 h-4 text-blue-600" />
            <span>Sustainability & Smart Cities • Google Gemini Vision</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Real-Time Urban Flood Depth Intelligence{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              From Traffic Cameras
            </span>{" "}
            (Zero Hardware Sensors)
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Powered by <strong>Visual Landmark Relative Depth Reasoning (VLRDR)</strong>.
            Zero expensive submerged sewer probes needed — Gemini Vision AI uses everyday vehicle dimensions and street landmarks as precision rulers.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition hover:scale-[1.02]"
            >
              <span>Explore Live Demo (3-Minute)</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-base transition"
            >
              <span>API Swagger Docs</span>
            </a>
          </div>
        </section>

        {/* Core Innovation: VLRDR Landmark Scale */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                How It Works
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Intelligent Visual Depth Rulers (VLRDR)
              </h2>
              <p className="text-slate-600 text-sm">
                In Asian metropolitan environments, everyday commuter motorcycles (Honda Wave, Vision, Scooters) possess standardized physical dimensions used by AI as precision reference rulers:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-lime-200 bg-lime-50/40 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-lime-100 text-lime-800">
                    Levels 1–2 (15–20cm)
                  </span>
                  <Activity className="w-5 h-5 text-lime-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">1/3 Wheel Submerged</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Water reaches 1/3 of the ~50cm tire diameter. Sidewalk curbs start disappearing. Two-wheelers proceed with caution; minor road advisory issued.
                </p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
                    Level 3 (30–35cm)
                  </span>
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Exhaust Pipe Submerged</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Water rises past half-wheel and floods motorcycle exhaust tips. High engine stall risk. Automated detour warnings dispatched to couriers & drivers!
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
                    Levels 4–5 (&gt;50–70cm)
                  </span>
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Seat / Hood Submerged</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Passenger car hoods and motorcycle seats submerged. Roadway paralyzed. Triggers emergency red alert broadcasts to civic authorities.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
              <Eye className="w-6 h-6 text-blue-600" />
              <h4 className="font-bold text-slate-900">Zero Sensor Cost</h4>
              <p className="text-xs text-slate-600">Leverages 100+ municipal traffic cameras already installed across the metropolitan network.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              <h4 className="font-bold text-slate-900">Sub-Second Speed</h4>
              <p className="text-xs text-slate-600">Gemini 3.8 Flash processes camera frames and yields validated depth JSON in 300–600ms.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
              <MapPin className="w-6 h-6 text-emerald-600" />
              <h4 className="font-bold text-slate-900">Real-Time Heatmap</h4>
              <p className="text-xs text-slate-600">Aggregates readings into 200m road corridor polygons rendered interactively on vector maps.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
              <Layers className="w-6 h-6 text-purple-600" />
              <h4 className="font-bold text-slate-900">Privacy Preserving</h4>
              <p className="text-xs text-slate-600">Built-in Privacy Filter blurs license plates and pedestrian faces before transmitting frames.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        FloodWheel — AI-Driven Urban Flood Depth Mapping • Powered by Google Gemini Vision & FastAPI
      </footer>
    </div>
  );
}
