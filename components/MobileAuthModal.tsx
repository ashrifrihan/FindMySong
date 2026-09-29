"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+94");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Please enter your name (at least 2 characters)");
      setLoading(false);
      return;
    }

    const cleanDigits = phone.replace(/\D/g, "");
    if (countryCode === "+94") {
      const normalizedDigits = cleanDigits.startsWith("0") ? cleanDigits.slice(1) : cleanDigits;
      // Valid Sri Lankan mobile prefixes: 70, 71, 72, 74, 75, 76, 77, 78 + 7 digits = 9 digits
      if (!/^(7[01245678]\d{7})$/.test(normalizedDigits)) {
        setError("Please enter a valid Sri Lankan mobile number (e.g. 77 123 4567)");
        setLoading(false);
        return;
      }
      if (/^(\d)\1{8}$/.test(normalizedDigits) || normalizedDigits === "123456789") {
        setError("Please enter an active mobile number");
        setLoading(false);
        return;
      }
    } else {
      if (cleanDigits.length < 8 || cleanDigits.length > 15) {
        setError("Please enter a valid mobile number with at least 8 digits");
        setLoading(false);
        return;
      }
    }

    const formattedDigits = cleanDigits.startsWith("0") && countryCode === "+94" ? cleanDigits.slice(1) : cleanDigits;
    const fullNumber = `${countryCode}${formattedDigits}`;

    try {
      const res = await fetch("/api/auth/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, phone: fullNumber }),
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

  return createPortal(
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
            Guests get 10 free searches per day. Enter your name and mobile number to unlock{" "}
            <strong>Unlimited Daily Searches</strong> immediately!
          </p>
        </div>

        {success ? (
          <div className="modal-success" role="alert">
            <span className="success-icon">
              <CheckIcon size={22} />
            </span>
            <h3>Unlimited Searches Unlocked!</h3>
            <p>Welcome, {name}! Your mobile number is registered.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {error && <div className="modal-error" role="alert">{error}</div>}

            <div className="modal-input-group">
              <label htmlFor="auth-name" className="modal-input-label">
                Your Name
              </label>
              <input
                id="auth-name"
                type="text"
                className="name-input"
                placeholder="Enter your name (e.g. Rihan)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                autoFocus
              />
            </div>

            <div className="modal-input-group">
              <label htmlFor="auth-phone" className="modal-input-label">
                Mobile Number
              </label>
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
                  id="auth-phone"
                  type="tel"
                  className="phone-number-input"
                  placeholder={countryCode === "+94" ? "77 123 4567" : "Mobile number"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="modal-submit-btn pressable"
              disabled={loading || phone.trim().length < 8 || name.trim().length < 2}
            >
              {loading ? "Verifying…" : "Get Unlimited Searches"}
            </button>

            <p className="modal-footer-note">
              No password needed. We only use your number to track your unlimited daily searches.
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
