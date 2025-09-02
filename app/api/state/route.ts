// app/api/state/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

// simple in-memory mock for preview; fine for serverless dev
type DeviceState = {
  isNightLightMode: boolean;
  brightness: number;
  offTimerMs: number;
  ledOn: boolean;
  lux: number;
  adc: number;
  motion: boolean;
  updatedAt?: string;
};

let mockState: DeviceState = {
  isNightLightMode: false,
  brightness: 120,
  offTimerMs: 5000,
  ledOn: false,
  lux: 12.3,
  adc: 87,
  motion: false,
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  // Proxy mode
  if (BASE) {
    const r = await fetch(`${BASE}/state`, { cache: "no-store" });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "content-type": "application/json" },
    });
  }
  // Mock mode
  return Response.json(mockState);
}

export async function PATCH(req: Request) {
  // Proxy mode
  if (BASE) {
    const r = await fetch(`${BASE}/state`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: await req.text(),
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "content-type": "application/json" },
    });
  }

  // Mock mode
  const body = await req.json().catch(() => ({}));
  mockState = {
    ...mockState,
    ...body,
    updatedAt: new Date().toISOString(),
  };
  return Response.json(mockState);
}
