import SearchForm from "@/components/SearchForm";
import Emoji from "@/components/Emoji";
import { ArrowRightIcon, BoltIcon, CheckIcon, SparklesIcon } from "@/components/Icons";

export default function Home() {
  return (
    <div className="landing-wrap">
      {/* Background glow specific to home page */}
      <div className="landing-glow" aria-hidden />

      <main className="landing-hero">
        <div className="landing-eyebrow">
          <Emoji char="🇱🇰" size={20} className="landing-emoji" />
          <span className="landing-pill-text">Built for Our Nation · Sri Lanka&apos;s Music Finder</span>
        </div>

        <h1 className="landing-title">
          The code behind<br />
          <span className="text-gradient">every viral track.</span>
        </h1>

        <p className="landing-sub">
          Crafted for Sri Lankan creators, Tamil &amp; island music lovers <Emoji char="🇱🇰" size={16} />. Find any Tamil cinema banger, independent drop, Baila anthem, or trending reel audio. Copy the exact studio ISRC code and paste directly into Instagram Music.
        </p>

        <div className="landing-search-container">
          <SearchForm variant="hero" />
        </div>

        {/* 3 Step Quick Overview */}
        <div className="landing-features" aria-label="How it works">
          <div className="feature-chip">
            <div className="f-num">1</div>
            <span>Search any track or vibe</span>
          </div>
          <div className="feature-chip">
            <div className="f-num">2</div>
            <span>Copy official ISRC</span>
          </div>
          <div className="feature-chip">
            <div className="f-num">3</div>
            <span>Paste in Instagram &amp; flex</span>
          </div>
        </div>
      </main>

      {/* ── Purpose Showcase Section (Ultra-clean Bento Grid) ── */}
      <section className="purpose-section" aria-labelledby="purpose-heading">
        <div className="purpose-header">
          <div className="purpose-badge-wrap">
            <Emoji char="🇱🇰" size={14} className="badge-sparkle" />
            <span className="purpose-badge">Made for Our Nation</span>
          </div>
          <h2 id="purpose-heading" className="purpose-title">
            Built for our nation&apos;s creators &amp; music lovers.
          </h2>
          <p className="purpose-intro">
            Tired of Instagram&apos;s music search gatekeeping your favorite Tamil &amp; island tracks? FindMySong connects our nation&apos;s sounds with official global studio codes so your reels never miss the vibe.
          </p>
        </div>

        <div className="purpose-grid">
          {/* Card 1: The ISRC Secret */}
          <div className="purpose-card bento-hero-card">
            <div className="p-card-top">
              <div className="p-icon-box icon-blue">
                <Emoji char="⚡" size={24} />
              </div>
              <span className="p-tag">Official Code</span>
            </div>
            <h3>The Secret to Unlocking Any IG Track</h3>
            <p>
              Every official studio recording has a unique 12-character <strong>ISRC</strong>. Pasting it into Instagram Stories or Reels bypasses fuzzy search algorithms and loads the 100% genuine master track immediately — no karaoke or fake covers.
            </p>
            <div className="p-demo-pill">
              <span className="p-demo-code">ISRC: LK-A01-24-00192</span>
              <span className="p-demo-badge">
                <CheckIcon size={12} /> Official
              </span>
            </div>
          </div>

          {/* Card 2: Phonetic Engine */}
          <div className="purpose-card">
            <div className="p-card-top">
              <div className="p-icon-box icon-purple">
                <Emoji char="🎯" size={24} />
              </div>
              <span className="p-tag">Singlish &amp; Phonetics</span>
            </div>
            <h3>Sound-Alike Phonetic Engine</h3>
            <p>
              Tamil and regional words written in English have endless spelling variations (e.g. <em>rathima</em> vs <em>radhimaa</em>). Our sound engine matches what you hear, so typos never break your search.
            </p>
            <div className="p-demo-pill">
              <span className="p-demo-text">&ldquo;rathima&rdquo;</span>
              <span className="p-demo-arrow" aria-hidden>
                <ArrowRightIcon size={13} />
              </span>
              <span className="p-demo-highlight">Radhimaa</span>
            </div>
          </div>

          {/* Card 3: Built for Our Island Culture (Dedicated Sri Lankan & Tamil Card) */}
          <div className="purpose-card">
            <div className="p-card-top">
              <div className="p-icon-box icon-green">
                <Emoji char="🇱🇰" size={24} />
              </div>
              <span className="p-tag">Our Island Vibe</span>
            </div>
            <h3>Tamil Bangers, Baila &amp; Island Hits</h3>
            <p>
              From Kollywood cinema anthems and independent Tamil tracks to vintage Baila grooves and late-night aesthetic edits. Everything you need to soundtrack your Jaffna reels, Colombo sunsets, and road trips.
            </p>
            <div className="p-demo-tags">
              <span className="p-demo-chip">Tamil Bangers</span>
              <span className="p-demo-chip">Kollywood Drops</span>
              <span className="p-demo-chip">Baila Hits</span>
              <span className="p-demo-chip">Slowed + Reverb</span>
            </div>
          </div>

          {/* Card 4: Grouped Versions & BGMs */}
          <div className="purpose-card">
            <div className="p-card-top">
              <div className="p-icon-box icon-pink">
                <Emoji char="🎼" size={24} />
              </div>
              <span className="p-tag">Reel-Ready</span>
            </div>
            <h3>Grouped Reel Audios &amp; BGMs</h3>
            <p>
              Stop scrolling past 30 low-quality karaoke knockoffs. Original studio releases, viral Slowed + Reverb edits, Sped Up versions, and iconic movie BGMs are neatly organized with 1-click copy.
            </p>
            <div className="p-demo-tags">
              <span className="p-demo-chip">Original</span>
              <span className="p-demo-chip">Slowed + Reverb</span>
              <span className="p-demo-chip">Sped Up</span>
              <span className="p-demo-chip">Theme BGM</span>
            </div>
          </div>
        </div>

        {/* ── Daily Limit & Mobile Number Unlimited Banner ── */}
        <div className="quota-widget-card">
          <div className="qw-icon-wrap">
            <Emoji char="📱" size={28} />
          </div>
          <div className="qw-info">
            <div className="qw-badge">
              <BoltIcon size={12} />
              <span>Creator Access</span>
            </div>
            <h3>10 Free Daily Searches · Unlimited for Lankan Creators</h3>
            <p>
              Enjoy 10 free searches daily with no sign-in. Creating daily reels and need unlimited searches? Verify with your mobile number (+94 Sri Lanka &amp; global) to unlock <strong>Unlimited Searches</strong> forever.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer with Developed by Nexzoa ── */}
      <footer className="landing-footer">
        <p className="footer-attribution">
          Developed with <Emoji char="❤️" size={14} style={{ verticalAlign: "middle" }} /> for Sri Lanka by{" "}
          <a
            href="https://nexzoa.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="nexzoa-link"
          >
            Nexzoa
          </a>
        </p>
        <p className="footer-subtext">
          FindMySong is proudly crafted for our nation&apos;s creators. An independent utility to find official studio music codes for Instagram Stories &amp; Reels.
        </p>
      </footer>
    </div>
  );
}
