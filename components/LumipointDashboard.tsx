"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
  Paper,
  rem,
} from "@mantine/core";
import { AlertCircle, CheckCircle2, Loader2, Moon, Power, Sun, Timer, Zap } from "lucide-react";

type DeviceState = {
  isNightLightMode: boolean;
  brightness: number; // 0–255
  offTimerMs: number; // milliseconds
  ledOn: boolean;
  lux: number; // estimated ambient lux
  adc: number; // raw ADC from LDR
  motion: boolean; // PIR state
  updatedAt?: string; // ISO timestamp
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://lumipoint-production.up.railway.app";
const DEVICE_URL = process.env.NEXT_PUBLIC_DEVICE_URL || ""; // ESP32 endpoint

function useDebounced<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function LumipointDashboard() {
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiBase, setApiBase] = useState(API_BASE_URL);

  // Local UI state
  const [isNight, setIsNight] = useState(false);
  const [brightness, setBrightness] = useState(120);
  const [offTimerMs, setOffTimerMs] = useState(5000);

  const debouncedPayload = useDebounced(
    { isNightLightMode: isNight, brightness, offTimerMs },
    500
  );
  const lastSavedRef = useRef<string>("");

  // --- Listen to SSE stream ---
  useEffect(() => {
    if (!apiBase) return;
    const url = `${apiBase}/events`;
    console.log("[SSE] Connecting to:", url);

    const evtSource = new EventSource(url);

    evtSource.onmessage = (event) => {
      try {
        const data: DeviceState = JSON.parse(event.data);
        console.log("[SSE] Received update:", data);
        setDevice(data);
        setIsNight(Boolean(data.isNightLightMode));
        setBrightness(Number(data.brightness ?? 120));
        setOffTimerMs(Number(data.offTimerMs ?? 5000));
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error("[SSE] Failed to parse event:", err, event.data);
      }
    };

    evtSource.onerror = (err) => {
      console.error("[SSE] Connection error:", err);
      setError("SSE connection lost");
      setLoading(false);
    };

    return () => {
      console.log("[SSE] Closing connection");
      evtSource.close();
    };
  }, [apiBase]);

  // --- Save debounced control changes ---
  useEffect(() => {
    async function save() {
      if (!device || !apiBase) return;
      const payload = debouncedPayload;
      const snapshot = JSON.stringify(payload);
      if (snapshot === lastSavedRef.current) return;
      try {
        lastSavedRef.current = snapshot;

        console.log("[SAVE] Sending PATCH to backend:", payload);
        const res = await fetch(`${apiBase}/state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: snapshot,
        });
        if (!res.ok) throw new Error(`PATCH /state ${res.status}`);
        const updated = await res.json();
        console.log("[SAVE] Backend confirmed update:", updated);
        setDevice(updated);
        setError(null);

        if (DEVICE_URL) {
          console.log("[SAVE] Forwarding update to ESP32:", DEVICE_URL);
          await fetch(`${DEVICE_URL}/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          }).catch(() => {
            console.warn("[SAVE] ESP32 not reachable");
          });
        }
      } catch (err: any) {
        console.error("[SAVE] Failed:", err);
        setError(err?.message || "Failed to save settings");
      }
    }
    save();
  }, [debouncedPayload, apiBase, device]);

  const connectionBadge = useMemo(() => {
    if (loading)
      return (
        <Badge
          variant="light"
          color="gray"
          leftSection={<Loader2 size={14} className="animate-spin" />}
        >
          Connecting…
        </Badge>
      );
    if (error)
      return (
        <Badge variant="light" color="red" leftSection={<AlertCircle size={14} />}>
          {error}
        </Badge>
      );
    return (
      <Badge variant="light" color="green" leftSection={<CheckCircle2 size={14} />}>
        Online
      </Badge>
    );
  }, [loading, error]);

  // --- Send command (backend + ESP32) ---
  async function sendCommand(action: "LED_ON" | "LED_OFF" | "REBOOT") {
    if (!apiBase) return;
    console.log("[COMMAND] Sending:", action);
    try {
      const res = await fetch(`${apiBase}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`POST /command ${res.status}`);
      const updated = await res.json();
      console.log("[COMMAND] Backend responded:", updated);
      setDevice(updated.state);
      setError(null);

      if (DEVICE_URL) {
        console.log("[COMMAND] Forwarding to ESP32:", action);
        await fetch(`${DEVICE_URL}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }).catch(() => {
          console.warn("[COMMAND] ESP32 not reachable");
        });
      }
    } catch (err: any) {
      console.error("[COMMAND] Failed:", err);
      setError(err?.message || "Command failed");
    }
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 60%, rgba(237,242,247,1) 100%)",
        minHeight: "100vh",
      }}
    >
      <Container size="lg" py="xl">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Stack gap={4}>
            <Title order={2}>Lumipoint Dashboard</Title>
            <Text c="dimmed" size="sm">
              Control & telemetry for your nightlight outlet.
            </Text>
          </Stack>
          <Group wrap="wrap" gap="sm" align="center">
            {connectionBadge}
          </Group>
        </Group>

        {/* Tabs */}
        <Tabs defaultValue="controls" mt="lg">
          <Tabs.List grow>
            <Tabs.Tab value="controls">Controls</Tabs.Tab>
            <Tabs.Tab value="telemetry">Telemetry</Tabs.Tab>
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
          </Tabs.List>

          {/* Controls Tab */}
          <Tabs.Panel value="controls" pt="lg">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {/* Mode / Brightness / Timer */}
              <Card withBorder padding="lg" shadow="sm">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group gap={8}>
                      <Moon size={16} />
                      <Text fw={600}>Night-light mode</Text>
                    </Group>
                    <Switch
                      checked={isNight}
                      onChange={(e) => {
                        console.log("[UI] Night-light toggled:", e.currentTarget.checked);
                        setIsNight(e.currentTarget.checked);
                      }}
                      onLabel="On"
                      offLabel="Off"
                      size="md"
                    />
                  </Group>

                  <Divider />

                  <Group justify="space-between">
                    <Group gap={8}>
                      <Zap size={16} />
                      <Text fw={600}>Brightness</Text>
                    </Group>
                    <Badge variant="light" color="gray">
                      {brightness}
                    </Badge>
                  </Group>
                  <Slider
                    value={brightness}
                    min={0}
                    max={255}
                    step={1}
                    onChange={(val) => {
                      console.log("[UI] Brightness slider:", val);
                      setBrightness(val);
                    }}
                  />

                  <Divider />

                  <Group gap={8}>
                    <Timer size={16} />
                    <Text fw={600}>Auto-off timer</Text>
                  </Group>
                  <Text>{offTimerMs} ms</Text>
                </Stack>
              </Card>

              {/* Quick Actions */}
              <Card withBorder padding="lg" shadow="sm">
                <Stack gap="md">
                  <Group gap={8}>
                    <Power size={16} />
                    <Text fw={600}>Quick actions</Text>
                  </Group>
                  <SimpleGrid cols={{ base: 2, sm: 2 }} spacing="sm">
                    <Button variant="light" onClick={() => sendCommand("LED_ON")}>
                      LED On
                    </Button>
                    <Button variant="outline" onClick={() => sendCommand("LED_OFF")}>
                      LED Off
                    </Button>
                    <Button color="red" onClick={() => sendCommand("REBOOT")}>
                      Reboot Device
                    </Button>
                  </SimpleGrid>
                </Stack>
              </Card>

              {/* Status */}
              <Card withBorder padding="lg" shadow="sm">
                <Stack gap="md">
                  <Group gap={8}>
                    <Sun size={16} />
                    <Text fw={600}>Current status</Text>
                  </Group>
                  <SimpleGrid cols={2} spacing="xs">
                    <Text c="dimmed" size="sm">
                      Lux
                    </Text>
                    <Text ta="right" size="sm">
                      {device?.lux?.toFixed?.(2) ?? "—"} lx
                    </Text>
                    <Text c="dimmed" size="sm">
                      ADC
                    </Text>
                    <Text ta="right" size="sm">
                      {device?.adc ?? "—"}
                    </Text>
                    <Text c="dimmed" size="sm">
                      Motion
                    </Text>
                    <Text ta="right" size="sm">
                      {device?.motion ? "Detected" : "None"}
                    </Text>
                    <Text c="dimmed" size="sm">
                      LED
                    </Text>
                    <Text ta="right" size="sm">
                      {device?.ledOn ? "On" : "Off"}
                    </Text>
                    <Text c="dimmed" size="sm">
                      Updated
                    </Text>
                    <Text ta="right" size="sm">
                      {device?.updatedAt
                        ? new Date(device.updatedAt).toLocaleTimeString()
                        : "—"}
                    </Text>
                  </SimpleGrid>
                </Stack>
              </Card>
            </SimpleGrid>
          </Tabs.Panel>

          {/* Telemetry Tab */}
          <Tabs.Panel value="telemetry" pt="lg">
            <Card withBorder padding="lg" shadow="sm">
              <Stack gap="md">
                <Text fw={600}>Live telemetry (via SSE)</Text>
                <Divider />
                <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                  <Metric
                    label="Lux"
                    value={device?.lux != null ? `${device.lux.toFixed(2)} lx` : "—"}
                  />
                  <Metric
                    label="ADC"
                    value={device?.adc != null ? String(device.adc) : "—"}
                  />
                  <Metric label="Motion" value={device?.motion ? "Yes" : "No"} />
                  <Metric label="LED" value={device?.ledOn ? "On" : "Off"} />
                </SimpleGrid>
              </Stack>
            </Card>
          </Tabs.Panel>

          {/* Settings Tab */}
          <Tabs.Panel value="settings" pt="lg">
            <Card withBorder padding="lg" shadow="sm">
              <Stack gap="lg">
                <Stack gap={6}>
                  <Text fw={600}>Endpoint</Text>
                  <TextInput
                    value={apiBase}
                    onChange={(e) => {
                      console.log("[UI] API base changed:", e.currentTarget.value);
                      setApiBase(e.currentTarget.value);
                    }}
                    placeholder="http://localhost:3001"
                  />
                </Stack>
              </Stack>
            </Card>
          </Tabs.Panel>
        </Tabs>

        <Text ta="center" size="xs" c="dimmed" mt="md">
          Built for ECTE250 — Lumipoint
        </Text>
      </Container>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" radius="lg" shadow="xs">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} fz={rem(18)}>
        {value}
      </Text>
    </Paper>
  );
}
