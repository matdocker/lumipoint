"use client";
import dynamic from "next/dynamic";
const LumipointDashboard = dynamic(() => import("@/components/LumipointDashboard"), { ssr: false });

export default function Page() {
  return <LumipointDashboard />;
}
