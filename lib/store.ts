// lib/store.ts
export type DeviceState = {
  isNightLightMode: boolean; brightness: number; offTimerMs: number;
  ledOn: boolean; lux: number; adc: number; motion: boolean; updatedAt?: string;
};

let state: DeviceState = {
  isNightLightMode: false, brightness: 120, offTimerMs: 5000,
  ledOn: false, lux: 12.3, adc: 87, motion: false, updatedAt: new Date().toISOString()
};

export function getState(): DeviceState { return state; }
export function patchState(p: Partial<DeviceState>): DeviceState {
  state = { ...state, ...p, updatedAt: new Date().toISOString() };
  return state;
}
