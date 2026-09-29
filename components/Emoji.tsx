"use client";
import { useState } from "react";

// Microsoft Fluent 3D emoji (MIT licence) — same glossy 3D look on every device.
// If an image can't load, the normal emoji character is shown instead.
const CDN = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@latest/assets";

export const EMOJI_FILES: Record<string, string> = {
  "🐶": "Dog face/3D/dog_face_3d.png",
  "🦊": "Fox/3D/fox_3d.png",
  "🦉": "Owl/3D/owl_3d.png",
  "🐷": "Pig face/3D/pig_face_3d.png",
  "🎧": "Headphone/3D/headphone_3d.png",
  "🎸": "Guitar/3D/guitar_3d.png",
  "🎵": "Musical note/3D/musical_note_3d.png",
  "💿": "Optical disk/3D/optical_disk_3d.png",
  "🔍": "Magnifying glass tilted left/3D/magnifying_glass_tilted_left_3d.png",
};

export default function Emoji({ char, size, className = "" }: { char: string; size: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const file = EMOJI_FILES[char];

  if (!file || failed) {
    return <span className={`emoji-char ${className}`} style={{ fontSize: size * 0.9 }} aria-hidden>{char}</span>;
  }
  return (
    <img
      className={className}
      src={`${CDN}/${encodeURI(file)}`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
