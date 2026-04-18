import type { Portfolio } from '@/types/portfolio';

export default function About({ data }: { data: Portfolio }) {
  return (
    <section id="about" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-sm uppercase tracking-[0.2em] text-brand-400">About</h2>
        <p className="mt-3 text-2xl sm:text-3xl font-semibold text-white leading-snug">
          {data.summary}
        </p>
      </div>
    </section>
  );
}
