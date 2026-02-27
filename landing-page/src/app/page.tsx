"use client";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import CodeDemo from "./components/CodeDemo";
import Pricing from "./components/Pricing";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <section id="features">
          <Features />
        </section>
        <CodeDemo />
        <section id="pricing">
          <Pricing />
        </section>
      </main>
      <Footer />
    </>
  );
}
