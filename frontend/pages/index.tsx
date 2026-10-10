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
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Head>
        <title>FloodWheel — Bản đồ đo độ sâu ngập lụt đô thị thời gian thực</title>
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
            Đo độ sâu ngập lụt đô thị{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              theo thời gian thực
            </span>{" "}
            từ Camera giao thông
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Đột phá công nghệ <strong>Visual Landmark Relative Depth Reasoning (VLRDR)</strong>.
            Không cần lắp đặt cảm biến ngập đắt tiền — AI dùng chính bánh xe máy và mốc vật thể đường phố làm thước đo độ sâu ngập.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition hover:scale-[1.02]"
            >
              <span>Xem Live Demo (3 Phút)</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-base transition"
            >
              <span>Tài liệu API Swagger</span>
            </a>
          </div>
        </section>

        {/* Core Innovation: VLRDR Landmark Scale */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Nguyên lý hoạt động
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Thước đo thị giác thông minh (VLRDR)
              </h2>
              <p className="text-slate-600 text-sm">
                Tại các đô thị Đông Nam Á như Hà Nội, TP.HCM, xe máy phổ thông (Honda Wave, Vision) có kích thước chuẩn xác được AI dùng làm mốc so sánh:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-lime-200 bg-lime-50/40 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-lime-100 text-lime-800">
                    Mức 1–2 (15–20cm)
                  </span>
                  <Activity className="w-5 h-5 text-lime-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Ngập 1/3 bánh xe máy</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nước chạm 1/3 đường kính lốp xe (~50cm). Bờ vỉa hè bắt đầu chìm. Xe 2 bánh đi chậm, tuyến đường an toàn có cảnh báo nhẹ.
                </p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
                    Mức 3 (30–35cm)
                  </span>
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Chìm miệng ống xả</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nước ngập nửa bánh xe, tràn qua lỗ thoát pô xe Wave. Động cơ xe máy nguy cơ chết máy cao. Cảnh báo đổi lộ trình cho Grab/tài xế!
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
                    Mức 4–5 (&gt;50–70cm)
                  </span>
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Ngập lút yên xe máy</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nắp capo ô tô con và yên xe ngập sâu. Tuyến đường tê liệt hoàn toàn. Kích hoạt báo động đỏ và gửi cảnh báo khẩn cấp tới cơ quan chức năng.
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
              <p className="text-xs text-slate-600">Tận dụng mạng lưới 100+ camera giao thông công cộng có sẵn của thành phố.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              <h4 className="font-bold text-slate-900">Sub-second Speed</h4>
              <p className="text-xs text-slate-600">Gemini 2.0 Flash xử lý ảnh và trả về JSON độ sâu chỉ trong 300–600ms.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
              <MapPin className="w-6 h-6 text-emerald-600" />
              <h4 className="font-bold text-slate-900">Bản đồ nhiệt Real-time</h4>
              <p className="text-xs text-slate-600">Tổng hợp dữ liệu theo đoạn đường 200m hiển thị trực quan trên Mapbox.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
              <Layers className="w-6 h-6 text-purple-600" />
              <h4 className="font-bold text-slate-900">Bảo vệ quyền riêng tư</h4>
              <p className="text-xs text-slate-600">Bộ lọc Privacy Filter tự động làm mờ biển số xe máy và khuôn mặt người đi đường.</p>
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
