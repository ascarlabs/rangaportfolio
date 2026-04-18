import portfolio from '@/data/portfolio.json';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Experience from '@/components/Experience';
import Skills from '@/components/Skills';
import Projects from '@/components/Projects';
import Contact from '@/components/Contact';
import Nav from '@/components/Nav';

export default function HomePage() {
  return (
    <main className="relative">
      <Nav name={portfolio.name} />
      <Hero data={portfolio} />
      <About data={portfolio} />
      <Experience data={portfolio} />
      <Skills data={portfolio} />
      <Projects data={portfolio} />
      <Contact data={portfolio} />
      <footer className="py-10 text-center text-xs text-gray-500">
        Built with Next.js · AI-generated portfolio · © {new Date().getFullYear()} {portfolio.name}
      </footer>
    </main>
  );
}
