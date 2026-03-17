/**
 * Qcuit App Router
 * 
 * Pathname-based routing without react-router-dom dependency.
 * Routes: / (Landing), /simulator (Studio), /hub (Journal), /docs (Documentation)
 */

import React, { useState, useEffect } from 'react';
import App from './App.v5';
import { LandingPage } from './pages/LandingPage';
import { QHub } from './pages/QHubJournal';
import { Exploratorium } from './pages/Exploratorium';
import { Documentation } from './pages/Documentation';

type Route = 'landing' | 'simulator' | 'hub' | 'explore' | 'docs';

function getRouteFromPath(): Route {
  const path = window.location.pathname.toLowerCase();
  
  if (path === '/' || path === '/landing') return 'landing';
  if (path === '/simulator' || path === '/studio' || path === '/app') return 'simulator';
  if (path === '/hub' || path === '/community' || path.startsWith('/hub/')) return 'hub';
  if (path === '/explore' || path === '/exploratorium' || path === '/learn') return 'explore';
  if (path === '/docs' || path === '/documentation') return 'docs';
  return 'landing';
}

export function AppRouter() {
  const [route, setRoute] = useState<Route>(getRouteFromPath);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const handlePopState = () => {
      setFadeIn(false);
      setTimeout(() => {
        setRoute(getRouteFromPath());
        setFadeIn(true);
      }, 150);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const content = (() => {
    switch (route) {
      case 'landing': return <LandingPage />;
      case 'hub': return <QHub />;
      case 'explore': return <Exploratorium />;
      case 'docs': return <Documentation />;
      case 'simulator':
      default: return <App />;
    }
  })();

  return (
    <div
      className={`transition-opacity duration-200 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
      style={{ minHeight: '100vh' }}
    >
      {content}
    </div>
  );
}

export default AppRouter;
