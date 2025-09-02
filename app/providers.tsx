"use client";

import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        defaultRadius: "lg",
        primaryColor: "dark",
        fontFamily:
          "Inter, system-ui, Avenir, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        components: {
          Button: { defaultProps: { size: "sm" } },
          Select: { defaultProps: { size: "sm" } },
          TextInput: { defaultProps: { size: "sm" } },
          Tabs: { defaultProps: { variant: "pills" } },
        },
      }}
    >
      {children}
    </MantineProvider>
  );
}
