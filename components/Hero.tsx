import type { Portfolio } from '@/types/portfolio';
import TalkingAvatar from './TalkingAvatar';
import { MapPin, Mail } from 'lucide-react';

export default function Hero({ data }: { data: Portfolio }) {
  return (
    <section className="relative overflow-hidden grain pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="aurora" />
      <div className="relative mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <p className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-gray-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Available for opportunities
          </p>
          <h1 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
            Hi, I&apos;m{' '}
            <span className="bg-gradient-to-r from-brand-400 via-accent-400 to-brand-500 bg-clip-text text-transparent">
              {data.name}
            </span>
            .
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-gray-300 max-w-xl">{data.tagline}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-gray-200">{data.title}</span>
            </span>
            {data.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {data.location}
              </span>
            )}
            {data.email && (
              <a href={`mailto:${data.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
                <Mail className="h-3.5 w-3.5" />
                {data.email}
              </a>
            )}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#experience"
              className="rounded-full bg-white text-ink-950 px-5 py-2.5 text-sm font-medium hover:opacity-90"
            >
              View experience
            </a>
            <a
              href="#contact"
              className="rounded-full glass px-5 py-2.5 text-sm text-gray-100 hover:text-white"
            >
              Get in touch
            </a>
          </div>
        </div>

        <div className="order-1 md:order-2 relative flex flex-col items-center">
          <div className="relative w-full flex justify-center">
            <TalkingAvatar
              photo={data.photo}
              text={data.spokenIntro}
              name={data.name}
              provider="video"
              audioSrc="intro.mp3"
              videoSrc="intro.mp4"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
