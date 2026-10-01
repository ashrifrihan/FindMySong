"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Result } from "./types";
import { extractPaletteFromImage, getPaletteForTrack, type AmbientPalette } from "./ambient";

export interface PlayerContextType {
  track: Result | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  rate: number;
  isLooping: boolean;
  isExpanded: boolean;
  palette: AmbientPalette | null;
  playTrack: (item: Result) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setRate: (r: number) => void;
  toggleLoop: () => void;
  setIsExpanded: (expanded: boolean) => void;
  toggleExpand: () => void;
  closePlayer: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [track, setTrack] = useState<Result | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [rate, setRateState] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [palette, setPalette] = useState<AmbientPalette | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevVolume = useRef(0.85);

  // Initialize audio element once in browser
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      if (audio.loop) return;
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // Update ambient background colors on CSS root variables
  useEffect(() => {
    if (!palette) {
      document.documentElement.style.removeProperty("--ambient-primary");
      document.documentElement.style.removeProperty("--ambient-secondary");
      document.documentElement.style.removeProperty("--ambient-glow");
      document.documentElement.setAttribute("data-ambient-active", "false");
      return;
    }

    document.documentElement.style.setProperty("--ambient-primary", palette.primary);
    document.documentElement.style.setProperty("--ambient-secondary", palette.secondary);
    document.documentElement.style.setProperty("--ambient-glow", palette.glow);
    document.documentElement.setAttribute("data-ambient-active", "true");
  }, [palette]);

  // Synchronize loop state with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  // Synchronize playbackRate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [rate]);

  // Synchronize volume & mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const playTrack = async (item: Result) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    // If same track is already playing, toggle pause
    if (track?.key === item.key) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(() => {});
      }
      return;
    }

    // New track selected
    setTrack(item);
    setCurrentTime(0);

    // Dynamic ambient color extraction (like YouTube Music & Apple Music)
    if (item.cover) {
      extractPaletteFromImage(item.cover, `${item.title}:${item.artist}`).then((pal) => {
        setPalette(pal);
      });
    } else {
      setPalette(getPaletteForTrack(item.title, item.artist));
    }

    if (item.preview) {
      audio.src = item.preview;
      audio.currentTime = 0;
      audio.playbackRate = rate;
      audio.loop = isLooping;
      audio.volume = isMuted ? 0 : volume;
      try {
        await audio.play();
      } catch (err) {
        console.warn("Audio autoplay blocked or failed:", err);
      }
    } else {
      audio.pause();
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !track) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const seek = (seconds: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, duration || 30));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const setVolume = (v: number) => {
    const val = Math.max(0, Math.min(1, v));
    setVolumeState(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolumeState(prevVolume.current > 0 ? prevVolume.current : 0.8);
    } else {
      prevVolume.current = volume;
      setIsMuted(true);
    }
  };

  const setRate = (r: number) => {
    setRateState(r);
  };

  const toggleLoop = () => {
    setIsLooping((prev) => !prev);
  };

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setPalette(null);
    setIsExpanded(false);
  };

  return (
    <PlayerContext.Provider
      value={{
        track,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        rate,
        isLooping,
        isExpanded,
        palette,
        playTrack,
        togglePlay,
        seek,
        setVolume,
        toggleMute,
        setRate,
        toggleLoop,
        setIsExpanded,
        toggleExpand,
        closePlayer,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
