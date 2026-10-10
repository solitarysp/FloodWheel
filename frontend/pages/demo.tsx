import React, { useState } from "react";
import Head from "next/head";
import { Navbar } from "@/components/Navbar";
import { DemoUpload } from "@/components/DemoUpload";
import { ResultCard, AnalysisResponseData } from "@/components/ResultCard";
import { Sparkles, Activity, ShieldCheck, Zap } from "lucide-react";

export default function DemoPage() {
  const [results, setResults] = useState<AnalysisResponseData[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAnalyzeComplete = (
    data: AnalysisResponseData[],
    images: string[],
    names: string[]
  ) => {
    setResults(data);
    setPreviews(images);
    setFileNames(names);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Head>
        <title>Demo — FloodWheel AI Vision Analysis</title>
      </Head>

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Hero Header */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>3-Minute Live Hackathon Demo</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Gemini Vision AI Depth Estimator Playground
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Zero expensive submerged sewer sensors required. Gemini uses everyday physical landmarks
              (motorcycle wheels ~50cm, exhaust pipes ~35cm, sidewalk curbs ~15cm) to calculate real-time flood depth.
            </p>

            <div className="flex flex-wrap gap-4 pt-2 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-400" /> Sub-second latency (&lt; 1s)
              </span>
              <span className="flex items-center gap-1">
                <Activity className="w-4 h-4 text-blue-400" /> Standard JSON FloodReading
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Zero submerged hardware
              </span>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <section>
          <DemoUpload
            onAnalyzeComplete={handleAnalyzeComplete}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </section>

        {/* Results Section */}
        {results.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">AI Computer Vision Analysis Results</h2>
                <p className="text-xs text-slate-500">
                  Analyzed {results.length} camera frames using VLRDR methodology
                </p>
              </div>
              <button
                onClick={() => {
                  setResults([]);
                  setPreviews([]);
                  setFileNames([]);
                }}
                className="text-xs text-slate-500 hover:text-rose-600 transition"
              >
                Clear results
              </button>
            </div>

            <div className="space-y-4">
              {results.map((res, index) => (
                <ResultCard
                  key={index}
                  data={res}
                  imagePreview={previews[index]}
                  fileName={fileNames[index]}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        FloodWheel — AI-Driven Urban Flood Depth Mapping • Powered by Google Gemini Vision & FastAPI
      </footer>
    </div>
  );
}
