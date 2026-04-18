import type { Portfolio } from '@/types/portfolio';
import { Github, Linkedin, Globe, Mail } from 'lucide-react';

export default function Contact({ data }: { data: Portfolio }) {
  const items: { icon: React.ElementType; href: string; label: string }[] = [];
  if (data.email) items.push({ icon: Mail, href: `mailto:${data.email}`, label: data.email });
  if (data.links.github) items.push({ icon: Github, href: data.links.github, label: 'GitHub' });
  if (data.links.linkedin) items.push({ icon: Linkedin, href: data.links.linkedin, label: 'LinkedIn' });
  if (data.links.website) items.push({ icon: Globe, href: data.links.website, label: 'Website' });

  return (
    <section id="contact" className="relative py-24 border-t border-white/5">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-sm uppercase tracking-[0.2em] text-brand-400">Contact</h2>
        <h3 className="mt-2 text-3xl sm:text-5xl font-semibold text-white">Let&apos;s build something.</h3>
        <p className="mt-4 text-gray-300 max-w-xl mx-auto">
          Open to senior engineering roles, collaborations, and interesting problems. The fastest way to reach me:
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {items.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-gray-100 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
