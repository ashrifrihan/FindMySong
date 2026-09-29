import SearchForm from "@/components/SearchForm";
import Emoji from "@/components/Emoji";

export default function Home() {
  return (
    <div className="landing-wrap">
      {/* Background glow specific to home page */}
      <div className="landing-glow" aria-hidden />

      <main className="landing-hero">
        <div className="landing-eyebrow">
          <Emoji char="🎵" size={24} className="landing-emoji" />
          <span className="landing-pill-text">FindMySong</span>
        </div>
        
        <h1 className="landing-title">
          The code behind<br/>
          <span className="text-gradient">every track.</span>
        </h1>
        
        <p className="landing-sub">
          Find any song or album, copy its ISRC or UPC code, and paste it directly into Instagram Music search.
        </p>

        <div className="landing-search-container">
          <SearchForm variant="hero" />
        </div>

        <div className="landing-features" aria-label="How it works">
          <div className="feature-chip">
            <div className="f-num">1</div>
            <span>Search track</span>
          </div>
          <div className="feature-chip">
            <div className="f-num">2</div>
            <span>Copy ISRC</span>
          </div>
          <div className="feature-chip">
            <div className="f-num">3</div>
            <span>Paste in IG</span>
          </div>
        </div>
      </main>
    </div>
  );
}
