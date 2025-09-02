import type { Metadata } from "next";
import { ColorSchemeScript } from "@mantine/core";
import Providers from "./providers"; // <-- the file above

export const metadata: Metadata = {
  title: "Lumipoint Dashboard",
  description: "Control & telemetry for your nightlight outlet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        {/* MantineProvider is applied here for the entire app */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
