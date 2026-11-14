// === Main Layout ===
// App layout with navigation sidebar and header

import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import './Layout.css';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();

  // Don't show layout on auth pages
  const authPaths = ['/login', '/register', '/splash', '/unauthorized'];
  const hideLayout = authPaths.some(path => location.pathname.includes(path));

  if (hideLayout) {
    return <>{children}</>;
  }

  return (
    <div className="main-layout">
      <aside className="sidebar">
        <Navigation />
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
