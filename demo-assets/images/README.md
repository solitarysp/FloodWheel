# Sample Flood Images Directory

This directory contains curated traffic camera images for demo testing and AI inference verification:

1. `nguyen_huu_canh_level3.jpg` — Heavy rain flood on Nguyen Huu Canh Street. Motorcycle rear wheels 1/2 submerged (~30–35cm, exhaust pipes under water).
2. `vo_van_ngan_level4.jpg` — Torrential slope flooding on Vo Van Ngan Street, Thu Duc. Water touching motorcycle seats (~50–65cm).
3. `le_loi_level0_dry.jpg` — Dry road condition benchmark on Le Loi Boulevard, District 1. Clear pavement with dry motorcycle tires.

To test the demo, upload any of these images via the Web UI at `/demo` or using `POST /api/v1/analyze`.
The Web UI also includes a 1-click **"Demo Quick Load"** button that automatically generates and feeds a high-contrast camera frame into the pipeline.
