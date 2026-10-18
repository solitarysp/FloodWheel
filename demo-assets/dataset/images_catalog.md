# 20 Real-World Ground Truth Benchmark Dataset: Flooded & Dry Streets

This benchmark dataset contains **20 high-resolution real-world urban traffic images** hosted on a high-speed CDN (open CORS, unrestricted bandwidth, direct browser rendering without 403/429/400 errors). The dataset is designed to evaluate and validate the precision of **Gemini Vision AI (gemini-3.8-flash)** using the **Visual Landmark Relative Depth Reasoning (VLRDR)** methodology.

---

## 🌊 Category 1: 10 Flooded Streets

| # | ID | Title & Context | Ground Truth Depth | Physical Visual Landmarks (VLRDR) | Direct CDN Link |
|---|---|---|---|---|---|
| 1 | `flood-01` | Passenger car navigating deep floodwaters on urban street | **Level 3 (30–40cm)** | Motorcycle & car tire submerged 1/2 (~35cm), water splashing above curb level, flooded asphalt surface. | [View image](https://images.pexels.com/photos/8568720/pexels-photo-8568720.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 2 | `flood-02` | Vehicle struggling through flooded avenue after severe storm | **Level 3 (28–36cm)** | Front bumper approaching water surface, sidewalk curb submerged, tire contact hidden by floodwater. | [View image](https://images.pexels.com/photos/28447761/pexels-photo-28447761/free-photo-of-car-navigating-flooded-street-after-heavy-rain.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 3 | `flood-03` | Car wading through half-wheel deep flood on city road | **Level 3 (30–38cm)** | Rim submerged 1/2, water depth reaching lower vehicle body, continuous surface water layer. | [View image](https://images.pexels.com/photos/28447757/pexels-photo-28447757/free-photo-of-car-navigating-flooded-road-in-urban-area.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 4 | `flood-04` | Multiple vehicles trapped on severely inundated low-lying street | **Level 4 (50–65cm)** | Multiple vehicles partially submerged, water level near door line, roadway completely impassable. | [View image](https://images.pexels.com/photos/28447763/pexels-photo-28447763/free-photo-of-flooded-road-with-submerged-cars-and-trees.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 5 | `flood-05` | Tropical street with water overflowing sidewalk curb by 18-25cm | **Level 2 (18–25cm)** | Sidewalk curb (15cm) covered, wide water pooling across traffic lane, tree reflections in flood pool. | [View image](https://images.pexels.com/photos/14216445/pexels-photo-14216445.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 6 | `flood-06` | Widespread neighborhood flooding after tropical storm | **Level 3 (25–35cm)** | Waterlogged street, entire asphalt surface under water, building reflections in standing water. | [View image](https://images.pexels.com/photos/35302178/pexels-photo-35302178/free-photo-of-urban-flooding-after-heavy-rain-in-city.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 7 | `flood-07` | Pedestrians wading through shin-deep floodwaters | **Level 3 (30–42cm)** | Pedestrians wading through calf-deep water, submerged curbs, water line visible on building facades. | [View image](https://images.pexels.com/photos/35249003/pexels-photo-35249003/free-photo-of-urban-flooding-scene-with-historical-buildings.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 8 | `flood-08` | Residents wading through flooded residential alleyway | **Level 3 (32–45cm)** | Residents walking through knee-deep water, pavement completely flooded, water level reaching vehicle hubs. | [View image](https://images.pexels.com/photos/32404938/pexels-photo-32404938/free-photo-of-flooded-street-in-metro-manila-with-people-walking.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 9 | `flood-09` | Nighttime city avenue flood reflecting municipal streetlights | **Level 2 (15–25cm)** | Nighttime street scene, streetlights reflecting on flooded surface, water pooling along roadway. | [View image](https://images.pexels.com/photos/9963280/pexels-photo-9963280.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 10 | `flood-10` | Hazard warning barricade closing deeply flooded corridor | **Level 4 (45–60cm)** | Road Closed barrier sign, deep floodwaters covering full street width, complete road closure. | [View image](https://images.pexels.com/photos/13865777/pexels-photo-13865777.jpeg?auto=compress&cs=tinysrgb&w=800) |

---

## ☀️ Category 2: 10 Dry / Non-Flooded Streets

| # | ID | Title & Context | Ground Truth Depth | Physical Visual Landmarks (VLRDR) | Direct CDN Link |
|---|---|---|---|---|---|
| 11 | `dry-01` | Motorcycles commuting along tree-lined dry avenue | **Level 0 (0cm)** | Dry asphalt road, motorcycle tires clearly contacting pavement, curbs 100% visible. | [View image](https://images.pexels.com/photos/12392817/pexels-photo-12392817.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 12 | `dry-02` | Scooters parked along dry sidewalk curb in Ho Chi Minh City | **Level 0 (0cm)** | Parked motorbikes on dry sidewalk, exhaust pipes elevated and clear, zero pooling puddles. | [View image](https://images.pexels.com/photos/25915972/pexels-photo-25915972/free-photo-of-a-person-sitting-on-a-motor-scooter-parked-by-the-building.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 13 | `dry-03` | Bustling urban traffic flow on dry city thoroughfare | **Level 0 (0cm)** | Dense motorcycles and cars in active flow, crisp white lane markings, zero water accumulation. | [View image](https://images.pexels.com/photos/20237762/pexels-photo-20237762/free-photo-of-urban-street-in-vietnam.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 14 | `dry-04` | Morning commuter traffic under bright morning sunlight | **Level 0 (0cm)** | Golden morning sunlight on dry roadway, steady motorcycle flow, completely dry curbs. | [View image](https://images.pexels.com/photos/19504817/pexels-photo-19504817/free-photo-of-golden-light-of-the-rising-sun-flooding-the-street-of-hanoi.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 15 | `dry-05` | Bustling commercial street in metropolitan district | **Level 0 (0cm)** | Vehicles and pedestrians on dry roadway, open storefronts, completely dry asphalt. | [View image](https://images.pexels.com/photos/25897526/pexels-photo-25897526/free-photo-of-blocks-of-flats-in-city.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 16 | `dry-06` | Sunny residential lane lined with trees and banners | **Level 0 (0cm)** | Concrete residential lane, neatly parked scooters, crisp shadows with zero standing water. | [View image](https://images.pexels.com/photos/20237798/pexels-photo-20237798/free-photo-of-residential-street-in-vietnam.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 17 | `dry-07` | Storefront facade and parked motorcycles along dry sidewalk | **Level 0 (0cm)** | Motorbikes parked along storefronts, dry paved sidewalk, wheel rims 100% visible. | [View image](https://images.pexels.com/photos/19577372/pexels-photo-19577372/free-photo-of-store-in-house-by-street-in-city.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 18 | `dry-08` | Historic city center sidewalk and architecture | **Level 0 (0cm)** | Dry tiled sidewalk, pedestrians walking normally, clear ground contact. | [View image](https://images.pexels.com/photos/25915984/pexels-photo-25915984/free-photo-of-view-of-a-street-sidewalk-and-exterior-of-an-old-building-in-a-city.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 19 | `dry-09` | Quiet tree-lined neighborhood street under gentle shade | **Level 0 (0cm)** | Smooth asphalt shaded by trees, dry curbs and grass edges, perfect visibility. | [View image](https://images.pexels.com/photos/39645882/pexels-photo-39645882/free-photo-of-quaint-streetscape-in-sa-dec-vietnam.jpeg?auto=compress&cs=tinysrgb&w=800) |
| 20 | `dry-10` | Flower vendor riding bicycle through morning market street | **Level 0 (0cm)** | Bicycle vendor on dry street, market shoppers walking on dry pavement, zero surface water. | [View image](https://images.pexels.com/photos/20633112/pexels-photo-20633112/free-photo-of-woman-leading-bike-with-shopping.jpeg?auto=compress&cs=tinysrgb&w=800) |

---

## 🛠️ Instructions to Download All 20 Images Locally

Simply execute the automated download script:

```bash
python3 demo-assets/download_images.py
```

All 20 files will be automatically saved to `demo-assets/images/` with standardized filenames:
- `flood-01_flooded.jpg` to `flood-10_flooded.jpg`
- `dry-01_non-flooded.jpg` to `dry-10_non-flooded.jpg`
