import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import Preview from "./components/landing/Preview";
import FeatureGrid from "./components/landing/FeatureGrid";
import Footer from "./components/landing/Footer";

export default function LandingPage() {
  return (
    <main>
        <Navbar />
        <Hero />
        <FeatureGrid />
        <Preview />
        <Footer />
    </main>
  );
}