import type { Portfolio } from '@/types/portfolio';

export default function Skills({ data }: { data: Portfolio }) {
  const groups = Object.entries(data.skills);
  return (
    <section id="skills" className="relative py-20 sm:py-28 border-t border-white/5">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-sm uppercase tracking-[0.2em] text-brand-400">Skills</h2>
        <h3 className="mt-2 text-3xl sm:text-4xl font-semibold text-white">My toolbox</h3>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {groups.map(([group, items]) => (
            <div key={group} className="glass rounded-2xl p-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">{group}</h4>
              <div className="flex flex-wrap gap-2">
                {items.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
