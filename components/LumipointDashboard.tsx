"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Select,
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function msToLabel(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs ? `${m}m ${rs}s` : `${m}m`;
}

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
  const [pollMs, setPollMs] = useState(2000);

  // Local UI state
  const [isNight, setIsNight] = useState(false);
  const [brightness, setBrightness] = useState(120);
  const [offTimerMs, setOffTimerMs] = useState(5000);

  const debouncedPayload = useDebounced({ isNightLightMode: isNight, brightness, offTimerMs }, 500);
  const lastSavedRef = useRef<string>("");

  // Fetch device state
  useEffect(() => {
    let cancelled = false;
    let timer: any;

    async function fetchState() {
      if (!apiBase) return;
      try {
        const res = await fetch(`${apiBase}/state`, { cache: "no-store" });
        if (!res.ok) throw new Error(`GET /state ${res.status}`);
        const data: DeviceState = await res.json();
        if (cancelled) return;
        setDevice(data);
        setIsNight(Boolean(data.isNightLightMode));
        setBrightness(Number(data.brightness ?? 120));
        setOffTimerMs(Number(data.offTimerMs ?? 5000));
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Failed to fetch state");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchState();
    timer = setInterval(fetchState, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [apiBase, pollMs]);

  // Save debounced control changes
  useEffect(() => {
    async function save() {
      if (!device || !apiBase) return;
      const payload = debouncedPayload;
      const snapshot = JSON.stringify(payload);
      if (snapshot === lastSavedRef.current) return;
      try {
        lastSavedRef.current = snapshot;
        const res = await fetch(`${apiBase}/state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`PATCH /state ${res.status}`);
        setError(null);
      } catch (err: any) {
        setError(err?.message || "Failed to save settings");
      }
    }
    save();
  }, [debouncedPayload, apiBase, device]);

  const connectionBadge = useMemo(() => {
    if (loading)
      return (
        <Badge variant="light" color="gray" leftSection={<Loader2 size={14} className="animate-spin" />}>
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

  async function sendCommand(action: "LED_ON" | "LED_OFF" | "REBOOT") {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`POST /command ${res.status}`);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Command failed");
    }
  }

  const timerOptions = [2000, 5000, 10000, 30000, 60000, 120000, 300000, 600000];

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
            {/* {connectionBadge}
            <TextInput
              placeholder="API Base URL (override)"
              value={apiBase}
              onChange={(e) => setApiBase(e.currentTarget.value)}
              w={{ base: "100%", sm: 320 }}
            /> */}
          </Group>
        </Group>

        <Tabs defaultValue="controls" mt="lg">
          <Tabs.List grow>
            <Tabs.Tab value="controls">Controls</Tabs.Tab>
            <Tabs.Tab value="telemetry">Telemetry</Tabs.Tab>
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
          </Tabs.List>

          {/* Controls */}
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
                      onChange={(e) => setIsNight(e.currentTarget.checked)}
                      onLabel="On"
                      offLabel="Off"
                      size="md"
                    />
                  </Group>

                  <Text c="dimmed" size="sm">
                    When on, LED stays at a steady brightness regardless of motion.
                  </Text>

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
                  <Slider value={brightness} min={0} max={255} step={1} onChange={setBrightness} />

                  <Divider />

                  <Group gap={8}>
                    <Timer size={16} />
                    <Text fw={600}>Auto-off timer</Text>
                  </Group>
                  <Select
                    data={timerOptions.map((ms) => ({ value: String(ms), label: msToLabel(ms) }))}
                    value={String(offTimerMs)}
                    onChange={(v) => v && setOffTimerMs(Number(v))}
                    allowDeselect={false}
                  />
                </Stack>
              </Card>

              {/* Quick actions */}
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
                    <Button
                      variant="default"
                      onClick={() => setPollMs((m) => Math.max(1000, m - 500))}
                    >
                      Faster refresh
                    </Button>
                  </SimpleGrid>
                  <Text size="xs" c="dimmed">
                    Actions send immediate commands without changing saved settings.
                  </Text>
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
                      {device?.updatedAt ? new Date(device.updatedAt).toLocaleTimeString() : "—"}
                    </Text>
                  </SimpleGrid>
                </Stack>
              </Card>
            </SimpleGrid>
          </Tabs.Panel>

          {/* Telemetry */}
          <Tabs.Panel value="telemetry" pt="lg">
            <Card withBorder padding="lg" shadow="sm">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600}>Live telemetry</Text>
                  <Group gap="sm">
                    <Text c="dimmed" size="sm">
                      Refresh
                    </Text>
                    <Select
                      w={120}
                      data={[1000, 2000, 5000, 10000].map((ms) => ({
                        value: String(ms),
                        label: msToLabel(ms),
                      }))}
                      value={String(pollMs)}
                      onChange={(v) => v && setPollMs(Number(v))}
                      allowDeselect={false}
                    />
                  </Group>
                </Group>

                <Divider />

                <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
                  <Metric label="Lux" value={device?.lux != null ? `${device.lux.toFixed(2)} lx` : "—"} />
                  <Metric label="ADC" value={device?.adc != null ? String(device.adc) : "—"} />
                  <Metric label="Motion" value={device?.motion ? "Yes" : "No"} />
                  <Metric label="LED" value={device?.ledOn ? "On" : "Off"} />
                </SimpleGrid>
              </Stack>
            </Card>
          </Tabs.Panel>

          {/* Settings */}
          <Tabs.Panel value="settings" pt="lg">
            <Card withBorder padding="lg" shadow="sm">
              <Stack gap="lg">
                <Stack gap={6}>
                  <Text fw={600}>Endpoint</Text>
                  <Text c="dimmed" size="sm">
                    Override the API base URL if you are testing locally or switching devices.
                  </Text>
                  <Group gap="sm" wrap="wrap">
                    <TextInput
                      value={apiBase}
                      onChange={(e) => setApiBase(e.currentTarget.value)}
                      placeholder="http://localhost:3001"
                      w={{ base: "100%", sm: 360 }}
                    />
                    <Button variant="outline" onClick={() => setApiBase("")}>
                      Clear
                    </Button>
                  </Group>
                </Stack>

                <Divider />

                <Stack gap={6}>
                  <Text fw={600}>Danger zone</Text>
                  <Text c="dimmed" size="sm">
                    Use with care — these affect the device immediately.
                  </Text>
                  <Group gap="sm" wrap="wrap">
                    <Button color="red" onClick={() => sendCommand("REBOOT")}>
                      Reboot Device
                    </Button>
                    <Button variant="outline" onClick={() => sendCommand("LED_OFF")}>
                      Force LED Off
                    </Button>
                    <Button variant="light" onClick={() => sendCommand("LED_ON")}>
                      Force LED On
                    </Button>
                  </Group>
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
