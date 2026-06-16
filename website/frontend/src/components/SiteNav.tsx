import React from 'react';
import { IconBrandGithub, IconExternalLink } from '@tabler/icons-react';
import { INSTALL_COMMAND, PROJECT_LINKS } from '../lib/projectLinks';
import { QcuitLogo } from './QcuitLogo';

type SiteNavProps = {
  active?: 'home' | 'docs' | 'learn' | 'visualizer' | 'lab';
};

const NAV_ITEMS = [
  { id: 'home', label: 'Package', href: '/' },
  { id: 'docs', label: 'Docs', href: '/docs' },
  { id: 'learn', label: 'Learn', href: '/explore' },
  { id: 'visualizer', label: 'Visualize', href: '/visualizer' },
  { id: 'lab', label: 'QML Lab', href: '/lab' },
];

export function SiteNav({ active = 'home' }: SiteNavProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-vegas-gold/12 bg-deep-jungle/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <a href="/" className="flex items-center gap-2 text-isabelline hover:text-vegas-gold">
          <QcuitLogo size={32} className="shrink-0" decorative />
          <span className="font-display text-2xl">Qcuit</span>
          <span className="hidden border-l border-vegas-gold/18 pl-3 font-mono text-[10px] uppercase tracking-widest text-isabelline/42 sm:inline">
            HEP/QML research library
          </span>
        </a>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                className={`border px-3 py-1.5 font-body text-sm transition-colors ${
                  isActive
                    ? 'border-vegas-gold/42 bg-vegas-gold/10 text-vegas-gold'
                    : 'border-transparent text-isabelline/62 hover:border-vegas-gold/20 hover:text-vegas-gold'
                }`}
              >
                {item.label}
              </a>
            );
          })}
          <code className="hidden border border-isabelline/10 px-3 py-1.5 font-mono text-xs text-isabelline/45 xl:inline">
            {INSTALL_COMMAND}
          </code>
          <a
            href={PROJECT_LINKS.pypi}
            aria-label="Qcuit PyPI package"
            className="inline-flex items-center gap-1.5 border border-isabelline/10 px-2.5 py-1.5 font-body text-sm text-isabelline/62 hover:border-vegas-gold/30 hover:text-vegas-gold"
          >
            PyPI
            <IconExternalLink size={14} stroke={1.8} />
          </a>
          <a
            href={PROJECT_LINKS.repository}
            aria-label="Qcuit source repository"
            className="inline-flex items-center gap-1.5 border border-vegas-gold/30 px-2.5 py-1.5 font-body text-sm text-vegas-gold hover:bg-vegas-gold hover:text-deep-jungle"
          >
            <IconBrandGithub size={16} stroke={1.8} />
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
