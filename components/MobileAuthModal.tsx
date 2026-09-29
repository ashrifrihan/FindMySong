"use client";
import { useState } from "react";
import { BoltIcon, CheckIcon } from "./Icons";
import { QUOTA_EVENT } from "./SearchForm";

export default function MobileAuthModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (phone: string) => void;
}) {
  const [countryCode, setCountryCode] = useState("+94");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fullNumber = `${countryCode}${phone.replace(/\D/g, "")}`;
    if (phone.replace(/\D/g, "").length < 8) {
      setError("Please enter a valid phone number (at least 8 digits)");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullNumber }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register mobile number");
      }

      setSuccess(true);
      window.dispatchEvent(new CustomEvent(QUOTA_EVENT, { detail: 999 }));
      onSuccess?.(fullNumber);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
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
            Anonymous guests get 10 free searches per day. Enter your mobile number to unlock{" "}
            <strong>Unlimited Daily Searches</strong> immediately!
          </p>
        </div>

        {success ? (
          <div className="modal-success" role="alert">
            <span className="success-icon">
              <CheckIcon size={22} />
            </span>
            <h3>Unlimited Searches Unlocked!</h3>
            <p>Welcome! Your mobile number is verified.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {error && <div className="modal-error" role="alert">{error}</div>}

            <div className="phone-input-row">
              <select
                className="country-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country Code"
              >
                <option value="+94">🇱🇰 +94 (LK)</option>
                <option value="+91">🇮🇳 +91 (IN)</option>
                <option value="+1">🇺🇸 +1 (US)</option>
                <option value="+44">🇬🇧 +44 (UK)</option>
                <option value="+971">🇦🇪 +971 (UAE)</option>
                <option value="+65">🇸🇬 +65 (SG)</option>
                <option value="+60">🇲🇾 +60 (MY)</option>
                <option value="+61">🇦🇺 +61 (AU)</option>
                <option value="+1">🇨🇦 +1 (CA)</option>
              </select>

              <input
                type="tel"
                className="phone-number-input"
                placeholder={countryCode === "+94" ? "77 123 4567" : "Mobile number"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="modal-submit-btn pressable"
              disabled={loading || phone.trim().length < 8}
            >
              {loading ? "Verifying…" : "Get Unlimited Searches"}
            </button>

            <p className="modal-footer-note">
              No password needed. We only use your number to track your unlimited daily searches.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
