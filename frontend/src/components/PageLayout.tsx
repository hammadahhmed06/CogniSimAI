
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ContactInfo from '@/components/ContactInfo';
import FloatingContactButton from '@/components/FloatingContactButton';
import SkipLink from '@/components/SkipLink';
import { useBodyTheme } from '@/hooks/useBodyTheme';

type PageLayoutProps = {
  children: React.ReactNode;
  showContact?: boolean;
};

const PageLayout = ({ children, showContact = true }: PageLayoutProps) => {
  const location = useLocation();

  // Effect to scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  useBodyTheme('landing');

  return (
    <div className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden text-foreground bg-black bg-grid-pattern bg-noise">
      <div className="relative z-10 flex min-h-screen flex-col">
        <SkipLink />
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex-1">
          {children}
        </main>
        {showContact && <ContactInfo />}
        <Footer />
        {showContact && <FloatingContactButton />}
      </div>
    </div>
  );
};

export default PageLayout;
