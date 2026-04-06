import type { Metadata } from "next";
import AboutCTA from "@/components/about/AboutCTA";
import AboutFounder from "@/components/about/AboutFounder";
import AboutFuture from "@/components/about/AboutFuture";
import AboutHero from "@/components/about/AboutHero";
import AboutMission from "@/components/about/AboutMission";
import AboutOrigin from "@/components/about/AboutOrigin";
import AboutWhatTGEMDoes from "@/components/about/AboutWhatTGEMDoes";

export const metadata: Metadata = {
  title: "About TGEM Sports | U.S. Army Veteran-Owned Sports Analytics Platform",
  description:
    "Learn the story behind TGEM Sports, a U.S. Army veteran-owned platform built to deliver smarter football analysis, matchup reads, and pick'em insights.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <AboutHero />
        <AboutOrigin />
        <AboutFounder />
        <AboutWhatTGEMDoes />
        <AboutMission />
        <AboutFuture />
        <AboutCTA />
      </div>
    </main>
  );
}
