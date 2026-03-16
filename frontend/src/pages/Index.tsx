
import PageLayout from '@/components/PageLayout';
import CogniSimHero from '@/components/CogniSimHero';
import SEO from '@/components/SEO';
import { useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Lazy load below-the-fold components for better LCP
const CogniSimFeatures = lazy(() => import('@/components/CogniSimFeatures'));
const CogniSimProblem = lazy(() => import('@/components/CogniSimProblem'));
const CogniSimHowItWorks = lazy(() => import('@/components/CogniSimHowItWorks'));
const CogniSimMetrics = lazy(() => import('@/components/CogniSimMetrics'));

// Loading component for lazy loaded sections
const SectionLoader = () => (
  <div className="flex items-center justify-center py-16">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-sky-400"></div>
  </div>
);

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    console.log('Index page - Auth state:', { user: !!user, loading });
    if (user && !loading) {
      console.log('Redirecting to dashboard...');
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // No DOM id manipulation: ensure unique anchors in components instead

  // Warm up below-the-fold chunks after first paint
  useEffect(() => {
    const idle = (cb: () => void) => {
      const anyWindow = window as unknown as { requestIdleCallback?: (cb: () => void) => void };
      const ric = anyWindow.requestIdleCallback || ((fn: () => void) => setTimeout(fn, 150));
      ric(cb);
    };
    idle(() => {
      import('@/components/CogniSimProblem');
      import('@/components/CogniSimFeatures');
      import('@/components/CogniSimHowItWorks');
      import('@/components/CogniSimMetrics');
    });
  }, []);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sky-400"></div>
      </div>
    );
  }

  // Don't render landing page if user is authenticated (will redirect)
  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <PageLayout>
      <SEO 
        title="CogniSim AI - Transform Product Ownership" 
        description="Revolutionary multi-agent AI system that transforms Product Owners from administrative coordinators into strategic product leaders. Save 40% time on administrative tasks."
        imageUrl="/lovable-uploads/526dc38a-25fa-40d4-b520-425b23ae0464.png"
        keywords={['AI product management', 'product owner AI', 'agile AI assistant', 'product backlog automation', 'sprint planning AI', 'product management tools']}
      />
      <CogniSimHero />
      <Suspense fallback={<SectionLoader />}>
        <CogniSimProblem />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <CogniSimFeatures />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <CogniSimHowItWorks />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <CogniSimMetrics />
      </Suspense>
    </PageLayout>
  );
};

export default Index;
