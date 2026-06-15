/**
 * Qcuit App Router
 * 
 * Pathname-based routing without react-router-dom dependency.
 * Routes: / (Landing), /visualizer (Visualizer), /explore (Learn), /lab (QML Lab), /docs (Documentation)
 */

import React, { useCallback, useEffect, useState } from 'react';
import App from './App.v5';
import { LandingPage } from './pages/LandingPage';
import { LearnPage } from './pages/Exploratorium';
import { Documentation } from './pages/Documentation';
import { Lab } from './pages/Lab';
import { NotebookView } from './pages/NotebookView';
import { setMode } from './hooks/useMode';

type Route = 'landing' | 'visualizer' | 'explore' | 'docs' | 'lab' | 'notebook';

function getRouteFromPath(): Route {
  const path = window.location.pathname.toLowerCase();

  if (path === '/' || path === '/landing') return 'landing';
  if (path === '/visualizer' || path === '/simulator' || path === '/studio' || path === '/app') return 'visualizer';
  if (path === '/explore' || path === '/exploratorium' || path === '/learn') return 'explore';
  if (path === '/lab' || path === '/research') return 'lab';
  if (path === '/docs' || path === '/documentation') return 'docs';
  if (/^\/n\/[0-9a-f]{8,}\/?$/i.test(path)) return 'notebook';
  return 'landing';
}

function syncMode(route: Route) {
  // Keep the persisted platform mode in sync with the active route so the
  // ModeSwitch reflects what the user is actually looking at.
  if (route === 'visualizer') setMode('build');
  else if (route === 'explore') setMode('explore');
  else if (route === 'lab') setMode('lab');
}

export function AppRouter() {
  const [route, setRoute] = useState<Route>(() => {
    const initial = getRouteFromPath();
    syncMode(initial);
    return initial;
  });

  const commitRoute = useCallback(() => {
    const next = getRouteFromPath();
    syncMode(next);
    setRoute(next);
  }, []);

  const navigate = useCallback((href: string) => {
    const nextUrl = new URL(href, window.location.origin);
    const samePath = nextUrl.pathname === window.location.pathname;
    const sameSearch = nextUrl.search === window.location.search;

    if (samePath && sameSearch && nextUrl.hash) {
      window.history.pushState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      document.querySelector(nextUrl.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.history.pushState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    commitRoute();
  }, [commitRoute]);

  useEffect(() => {
    const handlePopState = () => {
      commitRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [commitRoute]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as Element | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;

      const routePath = url.pathname.toLowerCase();
      const knownInternal =
        routePath === '/' ||
        routePath === '/landing' ||
        routePath === '/visualizer' ||
        routePath === '/simulator' ||
        routePath === '/studio' ||
        routePath === '/app' ||
        routePath === '/explore' ||
        routePath === '/exploratorium' ||
        routePath === '/learn' ||
        routePath === '/lab' ||
        routePath === '/research' ||
        routePath === '/docs' ||
        routePath === '/documentation' ||
        /^\/n\/[0-9a-f]{8,}\/?$/i.test(routePath);

      if (!knownInternal) return;
      event.preventDefault();
      navigate(anchor.href);
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [navigate]);

  const content = (() => {
    switch (route) {
      case 'landing': return <LandingPage />;
      case 'explore': return <LearnPage />;
      case 'docs': return <Documentation />;
      case 'lab': return <Lab />;
      case 'notebook': return <NotebookView />;
      case 'visualizer':
      default: return <App />;
    }
  })();

  return (
    <div className="min-h-screen bg-deep-jungle text-isabelline">
      <div
        key={route}
        className="qcuit-route-shell min-h-screen bg-deep-jungle"
      >
        {content}
      </div>
    </div>
  );
}

export default AppRouter;
