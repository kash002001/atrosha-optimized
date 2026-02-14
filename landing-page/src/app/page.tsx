"use client";

import { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import CodeDemo from "./components/CodeDemo";
import Pricing from "./components/Pricing";
import Footer from "./components/Footer";
import WaitlistModal from "./components/WaitlistModal";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero onCta={() => { }} />
        <section id="features">
          <Features />
        </section>
        <CodeDemo />
        <section id="pricing">
          <Pricing onCta={() => { }} />
        </section>
      </main>
      <Footer />
    </>
  );
}
