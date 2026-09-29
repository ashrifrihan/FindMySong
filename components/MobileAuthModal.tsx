"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BoltIcon, CheckIcon, SparklesIcon } from "./Icons";
import { QUOTA_EVENT } from "./SearchForm";

export default function MobileAuthModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ isMember: boolean; name: string | null; email: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPhoneBackup, setShowPhoneBackup] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+94");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Lock background scroll on mobile/desktop while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/auth/user")
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.isMember === "boolean") {
          setUser(d);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/user", { method: "DELETE" });
      setUser({ isMember: false, name: null, email: null });
      window.dispatchEvent(new CustomEvent(QUOTA_EVENT, { detail: 10 }));
      onClose();
    } catch {}
    setLoading(false);
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    setLoading(true);

    const cleanDigits = phone.replace(/\D/g, "");
    if (cleanDigits.length < 8) {
      setPhoneError("Please enter a valid mobile number with at least 8 digits");
      setLoading(false);
      return;
    }

    const fullNumber = `${countryCode}${cleanDigits}`;

    try {
      const res = await fetch("/api/auth/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Creator", phone: fullNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      setUser({ isMember: true, name: name.trim() || "Creator", email: null });
      window.dispatchEvent(new CustomEvent(QUOTA_EVENT, { detail: 999 }));
      onSuccess?.();
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setPhoneError(err?.message || "Failed to register. Please try Google sign-in instead.");
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <button
          type="button"
          className="modal-close pressable"
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        <div className="modal-header">
          <div className="modal-icon-wrap">
            <BoltIcon size={24} />
          </div>
          <h2 id="modal-title" className="modal-title">
            Unlock Unlimited Searches
          </h2>
          <p className="modal-sub">
            Guests get 10 free searches daily. Verify with Google to unlock{" "}
            <strong>Unlimited Searches forever</strong> — 100% free!
          </p>
        </div>

        {user?.isMember ? (
          <div className="modal-success" role="alert">
            <span className="success-icon">
              <CheckIcon size={24} />
            </span>
            <h3>Unlimited Searches Active</h3>
            <p>
              Signed in as <strong>{user.name || "Creator"}</strong>
              {user.email ? ` (${user.email})` : ""}.
            </p>
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                className="modal-signout-btn pressable"
                onClick={handleSignOut}
                disabled={loading}
              >
                {loading ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-form">
            {/* Google OAuth 1-Click Button */}
            <a
              href="/api/auth/google"
              className="google-auth-btn pressable"
              id="google-signin-btn"
            >
              <svg className="google-icon-svg" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </a>

            <div className="modal-divider">
              <span>or mobile number</span>
            </div>

            {!showPhoneBackup ? (
              <button
                type="button"
                className="modal-signout-btn pressable"
                style={{ width: "100%", padding: "10px 16px", borderRadius: "var(--r-full)" }}
                onClick={() => setShowPhoneBackup(true)}
              >
                Sign in with Mobile Number
              </button>
            ) : (
              <form onSubmit={handlePhoneSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {phoneError && <div className="modal-error" role="alert">{phoneError}</div>}
                <div className="modal-input-group">
                  <label htmlFor="auth-name" className="modal-input-label">Your Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    className="name-input"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-input-group">
                  <label htmlFor="auth-phone" className="modal-input-label">Mobile Number</label>
                  <div className="phone-input-row">
                    <select
                      className="country-select"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                    >
                      <option value="+94">🇱🇰 +94 (LK)</option>
                      <option value="+91">🇮🇳 +91 (IN)</option>
                      <option value="+1">🇺🇸 +1 (US)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+971">🇦🇪 +971 (UAE)</option>
                    </select>
                    <input
                      id="auth-phone"
                      type="tel"
                      className="phone-number-input"
                      placeholder="77 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="modal-submit-btn pressable"
                  disabled={loading || phone.trim().length < 8}
                >
                  {loading ? "Registering…" : "Unlock Unlimited Searches"}
                </button>
              </form>
            )}

            <p className="modal-footer-note">
              No passwords required. Real user verification keeps the service free and fast for all creators.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
