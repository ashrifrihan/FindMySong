import SearchForm from "@/components/SearchForm";
import Emoji from "@/components/Emoji";

export default function Home() {
  return (
    <div>
      {/* ── Sky gradient hero card (Nuvio AI / Drake music card style) ── */}
      <div className="hero-card">
        <div className="hero-eyebrow">
          <Emoji char="🎵" size={20} />
          FindMySong
        </div>
        <h1>The code behind every track.</h1>
        <p className="hero-sub">
          Find any song or album, copy its ISRC or UPC code, and paste it into Instagram Music search.
        </p>
        <SearchForm variant="hero" />

        {/* How it works chips */}
        <div className="how-chips" aria-label="How it works">
          <span className="how-chip">
            <span className="how-chip-num">1</span>
            Search
          </span>
          <span className="how-chip">
            <span className="how-chip-num">2</span>
            Copy the code
          </span>
          <span className="how-chip">
            <span className="how-chip-num">3</span>
            Paste in Instagram
          </span>
        </div>
      </div>
    </div>
  );
}
