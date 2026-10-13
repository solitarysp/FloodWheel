export interface AddCameraPreset {
  id: string;
  name: string;
  location: string;
  latitude: string;
  longitude: string;
  cameraAngle: string;
  streamUrl: string;
  zoneId: string;
}

export type DistrictPresetKey = "d1" | "binhthanh" | "thuduc";

export const CAMERA_PRESETS: Record<DistrictPresetKey, (randId: number) => AddCameraPreset> = {
  d1: (randId) => ({
    id: `cam-custom-${randId}`,
    name: "TTH 398: Le Loi - Phan Boi Chau (Ben Thanh)",
    location: "Le Loi & Phan Boi Chau, Ben Thanh, District 1",
    latitude: "10.7723",
    longitude: "106.6989",
    cameraAngle: "overhead",
    streamUrl: "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=662b85031afb9c00172dd0dc&bg=black&w=640&h=360",
    zoneId: "zone-le-loi",
  }),
  binhthanh: (randId) => ({
    id: `cam-custom-${randId}`,
    name: "TTH 233.1: Nguyen Huu Canh - Ngo Tat To",
    location: "Nguyen Huu Canh, Ward 22, Binh Thanh",
    latitude: "10.7891",
    longitude: "106.7164",
    cameraAngle: "elevated",
    streamUrl: "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=63b65ebebfd3d90017eaa3ae&bg=black&w=640&h=360",
    zoneId: "zone-nguyen-huu-canh",
  }),
  thuduc: (randId) => ({
    id: `cam-custom-${randId}`,
    name: "TTH 146: Vo Van Ngan - Dang Van Bi Junction",
    location: "Vo Van Ngan, Truong Tho, Thu Duc City",
    latitude: "10.8511",
    longitude: "106.7580",
    cameraAngle: "street_level",
    streamUrl: "https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=5d8cd542766c880017188948&bg=black&w=640&h=360",
    zoneId: "zone-vo-van-ngan",
  }),
};

export const FLOOD_ZONES_OPTIONS = [
  { value: "", label: "Unassigned (No Zone)" },
  { value: "zone-nguyen-huu-canh", label: "Nguyen Huu Canh Corridor (Binh Thanh)" },
  { value: "zone-vo-van-ngan", label: "Vo Van Ngan Incline (Thu Duc City)" },
  { value: "zone-quoc-huong", label: "Quoc Huong Street (Thu Duc City)" },
  { value: "zone-le-loi", label: "Le Loi Boulevard (District 1)" },
];
