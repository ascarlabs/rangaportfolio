import type { Portfolio } from '@/types/portfolio';
import { Briefcase } from 'lucide-react';

export default function Experience({ data }: { data: Portfolio }) {
  return (
    <section id="experience" className="relative py-20 sm:py-28 border-t border-white/5">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-sm uppercase tracking-[0.2em] text-brand-400">Experience</h2>
        <h3 className="mt-2 text-3xl sm:text-4xl font-semibold text-white">Where I&apos;ve built things</h3>

        <div className="mt-10 relative">
          <div className="absolute left-3 sm:left-4 top-1 bottom-1 w-px bg-gradient-to-b from-brand-500/60 via-white/10 to-accent-500/40" />
          <ul className="space-y-10">
            {data.experience.map((job, idx) => (
              <li key={idx} className="relative pl-10 sm:pl-14">
                <span className="absolute left-0 sm:left-1 top-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-ink-800 border border-white/10 shadow-lg">
                  <Briefcase className="h-3.5 w-3.5 text-brand-400" />
                </span>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h4 className="text-lg font-semibold text-white">{job.role}</h4>
                  <span className="text-gray-400">·</span>
                  <span className="text-brand-400">{job.company}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {job.start} – {job.end}
                  {job.location ? ` · ${job.location}` : ''}
                </p>
                <ul className="mt-4 space-y-2 text-gray-300 list-disc list-outside pl-5">
                  {job.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
