'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { publicAsset } from '@/lib/assetPath';

/**
 * Providers:
 *  - "webspeech" — Web Speech API + still photo
 *  - "openai"    — /intro.mp3 over still photo
 *  - "video"     — /intro.mp4 talking-head (autoplay once; click avatar to replay)
 */

type Provider = 'webspeech' | 'openai' | 'video' | 'did';

type Props = {
  photo: string;
  text: string;
  name: string;
  provider?: Provider;
  audioSrc?: string;
  videoSrc?: string;
  /** @deprecated — video mode autoplays once on load; ignored for video */
  autoplay?: boolean;
};

export default function TalkingAvatar({
  photo,
  text,
  name,
  provider = 'webspeech',
  audioSrc = 'intro.mp3',
  videoSrc = 'intro.mp4',
}: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [supported, setSupported] = useState(true);
  const [effectiveProvider, setEffectiveProvider] = useState<Provider>(provider);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoAutoplayTried = useRef(false);
  /** Browser allowed video autoplay only muted — waiting for any user gesture to unmute */
  const [awaitingSoundUnlock, setAwaitingSoundUnlock] = useState(false);
  /** Same click: document unmute runs in capture; skip avatar handler so we don’t restart the clip */
  const unmuteHandledThisGesture = useRef(false);

  const videoUrl = useMemo(() => publicAsset(videoSrc), [videoSrc]);
  const audioUrl = useMemo(() => publicAsset(audioSrc), [audioSrc]);
  const photoUrl = useMemo(() => publicAsset(photo), [photo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === 'undefined') return;
      const check = async (path: string) => {
        try {
          const rel = publicAsset(path);
          const url = rel.startsWith('http') ? rel : new URL(rel, window.location.href).href;
          const r = await fetch(url, { method: 'HEAD' });
          return r.ok;
        } catch {
          return false;
        }
      };
      if (provider === 'video' || provider === 'did') {
        const has = await check(videoUrl);
        if (!has) {
          const hasAudio = await check(audioUrl);
          if (!cancelled) setEffectiveProvider(hasAudio ? 'openai' : 'webspeech');
          return;
        }
      } else if (provider === 'openai') {
        const has = await check(audioUrl);
        if (!has && !cancelled) setEffectiveProvider('webspeech');
        return;
      }
      if (!cancelled) setEffectiveProvider(provider);
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, audioUrl, videoUrl]);

  const chosenVoice = useMemo(
    () =>
      effectiveProvider === 'did' || effectiveProvider === 'video'
        ? 'video'
        : effectiveProvider === 'openai'
          ? 'audio'
          : 'tts',
    [effectiveProvider],
  );

  const isVideoMode = chosenVoice === 'video';

  useEffect(() => {
    if (effectiveProvider === 'webspeech' && typeof window !== 'undefined') {
      setSupported('speechSynthesis' in window);
    }
  }, [effectiveProvider]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.currentTime = 0;
    setSpeaking(false);
  }, []);

  const playNonVideo = useCallback(() => {
    if (speaking) {
      stop();
      return;
    }
    if (chosenVoice === 'audio' && audioRef.current) {
      audioRef.current.muted = muted;
      void audioRef.current.play();
      setSpeaking(true);
      return;
    }
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.volume = muted ? 0 : 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /en-IN|en-GB|en-US/i.test(v.lang) && /male|google|natural/i.test(v.name)) ??
      voices.find((v) => /en/i.test(v.lang)) ??
      voices[0];
    if (preferred) u.voice = preferred;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }, [chosenVoice, muted, speaking, stop, text]);

  const unlockSound = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    unmuteHandledThisGesture.current = true;
    queueMicrotask(() => {
      unmuteHandledThisGesture.current = false;
    });
    v.muted = false;
    void v.play().catch(() => {});
    setAwaitingSoundUnlock(false);
    setSpeaking(true);
  }, []);

  /**
   * Browsers block unmuted autoplay without a user gesture. We try sound first;
   * if that fails, muted autoplay works — then first click/tap anywhere unmutes.
   */
  const tryAutoplayVideoOnce = useCallback(() => {
    const v = videoRef.current;
    if (!v || videoAutoplayTried.current) return;
    videoAutoplayTried.current = true;

    v.muted = false;
    void v
      .play()
      .then(() => {
        setSpeaking(true);
        setAwaitingSoundUnlock(false);
      })
      .catch(() => {
        v.muted = true;
        void v
          .play()
          .then(() => {
            setSpeaking(true);
            setAwaitingSoundUnlock(true);
          })
          .catch(() => {
            videoAutoplayTried.current = false;
          });
      });
  }, []);

  const replayVideo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setAwaitingSoundUnlock(false);
    v.pause();
    v.currentTime = 0;
    v.muted = false;
    void v.play().then(() => setSpeaking(true));
  }, []);

  const handleAvatarPress = useCallback(() => {
    if (unmuteHandledThisGesture.current) return;
    if (awaitingSoundUnlock) {
      unlockSound();
      return;
    }
    replayVideo();
  }, [awaitingSoundUnlock, unlockSound, replayVideo]);

  // First click or tap anywhere on the page unmutes (browser requires a gesture for audio).
  useEffect(() => {
    if (!awaitingSoundUnlock || !isVideoMode) return;
    const unlock = (e: Event) => {
      if (e.type === 'click' && 'button' in e && (e as MouseEvent).button !== 0) return;
      unlockSound();
    };
    document.addEventListener('click', unlock, { capture: true });
    document.addEventListener('touchend', unlock, { capture: true, passive: true });
    return () => {
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('touchend', unlock, true);
    };
  }, [awaitingSoundUnlock, isVideoMode, unlockSound]);

  const onVideoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAvatarPress();
    }
  };

  useEffect(() => () => stop(), [stop]);

  // If <video> is served from cache, onLoadedData may not fire — retry autoplay when ready.
  useEffect(() => {
    if (!isVideoMode) return;
    const id = window.setTimeout(() => {
      const el = videoRef.current;
      if (el && el.readyState >= 2 && !videoAutoplayTried.current) tryAutoplayVideoOnce();
    }, 0);
    return () => window.clearTimeout(id);
  }, [isVideoMode, tryAutoplayVideoOnce]);

  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="relative">
        <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-brand-500/30 via-accent-500/30 to-brand-500/30 blur-2xl animate-pulse-slow" />
        <div
          className={`relative rounded-full p-[3px] bg-gradient-to-tr from-brand-500 via-accent-500 to-brand-400 ${
            speaking ? 'shadow-[0_0_60px_-10px_rgba(168,85,247,0.75)]' : ''
          } ${isVideoMode ? 'cursor-pointer' : ''}`}
          onClick={isVideoMode ? handleAvatarPress : undefined}
          onKeyDown={isVideoMode ? onVideoKeyDown : undefined}
          role={isVideoMode ? 'button' : undefined}
          tabIndex={isVideoMode ? 0 : undefined}
          title={
            isVideoMode
              ? awaitingSoundUnlock
                ? 'Tap for sound'
                : 'Click to replay introduction'
              : undefined
          }
        >
          <div
            className={`relative h-56 w-56 sm:h-64 sm:w-64 overflow-hidden rounded-full bg-ink-800 ${
              speaking && !isVideoMode ? '' : !isVideoMode ? 'avatar-breathe' : ''
            }`}
          >
            {isVideoMode ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  poster={photoUrl}
                  className="h-full w-full object-cover pointer-events-none"
                  playsInline
                  preload="auto"
                  autoPlay
                  onLoadedData={tryAutoplayVideoOnce}
                  onCanPlay={tryAutoplayVideoOnce}
                  onPlay={() => setSpeaking(true)}
                  onPause={() => setSpeaking(false)}
                  onEnded={() => setSpeaking(false)}
                />
                {awaitingSoundUnlock && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-full bg-black/45 px-4 text-center">
                    <Volume2 className="h-10 w-10 text-white drop-shadow-md" aria-hidden />
                    <p className="text-xs font-medium leading-tight text-white drop-shadow">
                      Tap anywhere or here for sound
                    </p>
                  </div>
                )}
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
            )}

            {speaking && !isVideoMode && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <div className="flex items-end gap-1 rounded-full bg-black/60 px-3 py-2 backdrop-blur">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="bar block w-1.5 rounded-full bg-brand-400"
                      style={{ height: `${10 + i * 4}px`, animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {chosenVoice === 'audio' && (
        <audio ref={audioRef} src={audioUrl} onEnded={() => setSpeaking(false)} preload="auto" />
      )}

      {!isVideoMode && (
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={playNonVideo}
            className="group inline-flex items-center gap-2 rounded-full bg-white text-ink-950 px-5 py-2.5 text-sm font-medium shadow-lg shadow-brand-500/20 hover:shadow-accent-500/30 transition-all"
          >
            {speaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {speaking ? 'Stop' : `Hear ${name} introduce himself`}
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="inline-flex items-center gap-2 rounded-full glass px-3 py-2.5 text-sm text-gray-200 hover:text-white transition-colors"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      {!supported && provider === 'webspeech' && (
        <p className="mt-3 text-xs text-amber-400/90">
          Your browser does not support speech synthesis. Try Chrome, Edge, or Safari.
        </p>
      )}
    </div>
  );
}
