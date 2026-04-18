'use client';

export default function Nav({ name }: { name: string }) {
  const items = [
    { href: '#about', label: 'About' },
    { href: '#experience', label: 'Experience' },
    { href: '#skills', label: 'Skills' },
    { href: '#projects', label: 'Projects' },
    { href: '#contact', label: 'Contact' },
  ];
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass rounded-full px-4 py-2 text-sm">
      <div className="flex items-center gap-5">
        <span className="font-semibold tracking-tight text-white">{name}</span>
        <span className="h-4 w-px bg-white/10" />
        <ul className="hidden sm:flex items-center gap-4 text-gray-300">
          {items.map((i) => (
            <li key={i.href}>
              <a href={i.href} className="hover:text-white transition-colors">
                {i.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
