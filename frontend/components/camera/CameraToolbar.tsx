import React from "react";
import { Search, Filter, Radio, RefreshCw, PlusCircle, MapPin, Layers, Zap } from "lucide-react";

interface CameraToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: "map" | "grid";
  setViewMode: (mode: "map" | "grid") => void;
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
  availableDistricts: string[];
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  isRefreshingAll: boolean;
  onRefreshAll: () => void;
  onOpenAddModal: () => void;
  onFakeRandomFlood?: () => void;
  isFakingFlood?: boolean;
}

export const CameraToolbar: React.FC<CameraToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  selectedDistrict,
  setSelectedDistrict,
  availableDistricts,
  refreshInterval,
  setRefreshInterval,
  isRefreshingAll,
  onRefreshAll,
  onOpenAddModal,
  onFakeRandomFlood,
  isFakingFlood = false,
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cameras by name, corridor, ID..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
        />
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* View Mode Toggle: Map View vs Grid View */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              viewMode === "map"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              viewMode === "grid"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Grid View</span>
          </button>
        </div>

        {/* District Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-transparent font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
          >
            <option value="all">All Districts</option>
            {availableDistricts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>

        {/* Auto Refresh Interval */}
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
          <Radio className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-transparent font-medium focus:outline-none cursor-pointer"
          >
            <option value={0}>Auto-Refresh: Off</option>
            <option value={10}>Refresh: 10s</option>
            <option value={30}>Refresh: 30s</option>
            <option value={60}>Refresh: 60s</option>
          </select>
        </div>

        {/* Refresh All Button */}
        <button
          onClick={onRefreshAll}
          disabled={isRefreshingAll}
          className="p-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 transition"
          title="Refresh all camera frames"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshingAll ? "animate-spin text-blue-600" : ""}`} />
        </button>

        {/* Add Camera CTA */}
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition active:scale-[0.98]"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Add Camera</span>
        </button>

        {/* Temporary Test Fake Flood Button */}
        {onFakeRandomFlood && (
          <button
            onClick={onFakeRandomFlood}
            disabled={isFakingFlood}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-500/20 transition active:scale-[0.98]"
            title="[TEST] Generate random flood and dry alerts on cameras"
          >
            <Zap className={`w-3.5 h-3.5 ${isFakingFlood ? "animate-bounce" : ""}`} />
            <span>{isFakingFlood ? "Generating..." : "⚡ Test Fake Flood"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
