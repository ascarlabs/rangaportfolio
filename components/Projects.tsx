import type { Portfolio } from '@/types/portfolio';
import { ExternalLink } from 'lucide-react';

export default function Projects({ data }: { data: Portfolio }) {
  return (
    <section id="projects" className="relative py-20 sm:py-28 border-t border-white/5">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-sm uppercase tracking-[0.2em] text-brand-400">Projects</h2>
        <h3 className="mt-2 text-3xl sm:text-4xl font-semibold text-white">Selected work</h3>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.projects.map((p, i) => (
            <article
              key={i}
              className="group glass rounded-2xl p-6 flex flex-col hover:border-brand-500/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-semibold text-white">{p.name}</h4>
                {p.link && (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-400 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-300 flex-1">{p.summary}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.stack.map((s) => (
                  <span key={s} className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] text-gray-300">
                    {s}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
