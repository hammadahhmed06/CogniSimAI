import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { Menu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

/* ── Dropdown content for each nav item ── */
type DropdownColumn = { heading: string; items: { label: string; to: string }[] };
type DropdownData = Record<string, DropdownColumn[]>;

const dropdownData: DropdownData = {
  Features: [
    {
      heading: "AI Agents",
      items: [
        { label: "Epic Architect", to: "/features#epic-architect" },
        { label: "Story Estimation", to: "/features#estimation" },
        { label: "Sprint Planning", to: "/features#sprint-planning" },
      ],
    },
    {
      heading: "Capabilities",
      items: [
        { label: "Backlog Prioritization", to: "/features#prioritization" },
        { label: "Intelligent Reporting", to: "/features#reporting" },
        { label: "Conversational AI", to: "/features#conversational" },
      ],
    },
    {
      heading: "Benefits",
      items: [
        { label: "40% Less Admin Work", to: "/features#benefits" },
        { label: "15% Better Sprints", to: "/features#benefits" },
        { label: "75% Faster Reports", to: "/features#benefits" },
      ],
    },
  ],
  Integrations: [
    {
      heading: "Platforms",
      items: [
        { label: "Jira", to: "/integrations#jira" },
        { label: "Slack", to: "/integrations#slack" },
        { label: "GitHub", to: "/integrations#github" },
      ],
    },
    {
      heading: "Highlights",
      items: [
        { label: "Bi-directional Sync", to: "/integrations#jira" },
        { label: "Real-time Updates", to: "/integrations#slack" },
        { label: "OAuth 2.0 Security", to: "/integrations" },
      ],
    },
  ],
  About: [
    {
      heading: "Company",
      items: [
        { label: "Our Vision", to: "/about#vision" },
        { label: "Technology Stack", to: "/about#tech-stack" },
        { label: "Security & Compliance", to: "/about#security" },
      ],
    },
    {
      heading: "Architecture",
      items: [
        { label: "Multi-Agent System", to: "/about#architecture" },
        { label: "Hub & Spoke Model", to: "/about#architecture" },
      ],
    },
    {
      heading: "Resources",
      items: [
        { label: "Privacy Policy", to: "/privacy-policy" },
        { label: "Terms of Service", to: "/terms-of-service" },
      ],
    },
  ],
};

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, loading } = useAuth();
  const location = useLocation();

  /* clear dropdown on route change */
  useEffect(() => { setOpenDropdown(null); }, [location.pathname]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll as EventListener);
  }, []);

  const navLinks = [
    { to: "/", label: "Home", hasChevron: false },
    { to: "/features", label: "Features", hasChevron: true },
    { to: "/pricing", label: "Pricing", hasChevron: false },
    { to: "/integrations", label: "Integrations", hasChevron: true },
    { to: "/about", label: "About", hasChevron: true }
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleMouseEnter = useCallback((label: string) => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpenDropdown(label);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  }, []);

  return (
    <motion.nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-white/[0.03] border-b border-white/[0.08] backdrop-blur-2xl shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
          : "bg-transparent border-b border-transparent"
      )}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[52px] relative">

          {/* ── Logo ── */}
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 mr-6"
            aria-label="Go to home"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white shrink-0">
              <path d="M3 3L21 21M3 21L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="text-[15px] font-semibold text-white tracking-tight whitespace-nowrap">
              CogniSim
            </span>
          </Link>

          {/* ── Center nav links (Desktop) ── */}
          <div className="hidden lg:flex items-center justify-center gap-0.5 flex-1 min-w-0">
            {navLinks.map((link) => {
              const hasDropdown = link.hasChevron && dropdownData[link.label];
              return (
                <div
                  key={link.to}
                  className="relative"
                  onMouseEnter={() => hasDropdown && handleMouseEnter(link.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    to={link.to}
                    className={cn(
                      "relative flex items-center gap-[3px] px-3 py-1.5 text-[14px] rounded-md transition-colors duration-200 whitespace-nowrap group",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                      openDropdown === link.label
                        ? "text-white bg-white/[0.06]"
                        : isActive(link.to)
                          ? "text-white"
                          : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                    )}
                  >
                    {link.label}
                    {link.hasChevron && (
                      <ChevronDown
                        className={cn(
                          "h-[14px] w-[14px] transition-all duration-200 -mr-0.5",
                          openDropdown === link.label
                            ? "opacity-80 rotate-180"
                            : "opacity-50 group-hover:opacity-80 rotate-0"
                        )}
                      />
                    )}
                  </Link>

                  {/* ── Dropdown Panel ── */}
                  <AnimatePresence>
                    {hasDropdown && openDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                        className={cn(
                          "absolute top-full pt-2 z-50",
                          /* Align dropdown based on position: last 2 items anchor right, rest center */
                          navLinks.indexOf(link) >= navLinks.length - 2
                            ? "right-0"
                            : "left-1/2 -translate-x-1/2"
                        )}
                      >
                        <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.06)] border border-white/[0.08] px-7 py-5 w-max max-w-[calc(100vw-2rem)]">
                          <div className="flex gap-10">
                            {dropdownData[link.label]?.map((col) => (
                              <div key={col.heading}>
                                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2.5">
                                  {col.heading}
                                </p>
                                <div className="flex flex-col gap-0.5">
                                  {col.items.map((item) => (
                                    <Link
                                      key={item.label}
                                      to={item.to}
                                      className="text-[13.5px] text-neutral-700 hover:text-black font-medium py-1 rounded transition-colors duration-150 whitespace-nowrap"
                                    >
                                      {item.label}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* ── Right side ── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Desktop auth */}
            <div className="hidden lg:flex items-center gap-2">
              {!loading && (
                user ? (
                  <Link
                    to="/dashboard"
                    className="text-[14px] text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/[0.06]"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/auth/login"
                      className="text-[14px] text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/[0.06]"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/auth/signup"
                      className="text-[14px] font-medium text-white bg-sky-500 hover:bg-sky-400 px-4 py-1.5 rounded-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                      Get CogniSim free
                    </Link>
                  </>
                )
              )}
            </div>

            {/* Mobile */}
            <div className="lg:hidden flex items-center gap-2">
              {!loading && !user && (
                <Link
                  to="/auth/signup"
                  className="text-[13px] font-medium text-white bg-sky-500 hover:bg-sky-400 px-3.5 py-1.5 rounded-md transition-colors"
                >
                  Sign up
                </Link>
              )}
              <Sheet open={mobileOpen} onOpenChange={(open) => { setMobileOpen(open); if (!open) setMobileExpanded(null); }}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/80 hover:text-white hover:bg-white/[0.06] rounded-md h-8 w-8"
                  >
                    <Menu className="h-[18px] w-[18px]" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[min(280px,85vw)] bg-neutral-950/95 border-l border-white/[0.08] text-white sm:w-[340px] backdrop-blur-2xl p-0"
                >
                  <nav className="flex flex-col pt-14 pb-6 overflow-y-auto max-h-[100dvh]">
                    {navLinks.map((link) => {
                      const hasSub = link.hasChevron && dropdownData[link.label];
                      const isExpanded = mobileExpanded === link.label;
                      return (
                        <div key={link.to}>
                          <div className="flex items-center">
                            <Link
                              to={link.to}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "text-[15px] px-6 py-3 transition-colors flex-1",
                                isActive(link.to)
                                  ? "text-white bg-white/[0.06] font-medium"
                                  : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {link.label}
                            </Link>
                            {hasSub && (
                              <button
                                onClick={() => setMobileExpanded(isExpanded ? null : link.label)}
                                className="px-4 py-3 text-white/40 hover:text-white/70 transition-colors"
                                aria-label={`Expand ${link.label}`}
                              >
                                <ChevronDown className={cn(
                                  "h-4 w-4 transition-transform duration-200",
                                  isExpanded && "rotate-180"
                                )} />
                              </button>
                            )}
                          </div>
                          <AnimatePresence>
                            {hasSub && isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="pl-8 pr-6 pb-2 pt-1">
                                  {dropdownData[link.label]?.map((col) => (
                                    <div key={col.heading} className="mb-3">
                                      <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1.5 px-2">
                                        {col.heading}
                                      </p>
                                      {col.items.map((item) => (
                                        <Link
                                          key={item.label}
                                          to={item.to}
                                          onClick={() => setMobileOpen(false)}
                                          className="block text-[13px] text-white/45 hover:text-white py-1.5 px-2 rounded hover:bg-white/[0.04] transition-colors"
                                        >
                                          {item.label}
                                        </Link>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}

                    <div className="h-px bg-white/[0.08] mx-6 my-3" />

                    {!loading && (
                      user ? (
                        <Link
                          to="/dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="text-[15px] font-medium text-white px-6 py-3 hover:bg-white/[0.04] transition-colors"
                        >
                          Dashboard
                        </Link>
                      ) : (
                        <div className="flex flex-col gap-2 px-6 pt-1">
                          <Link
                            to="/auth/login"
                            onClick={() => setMobileOpen(false)}
                            className="text-[15px] text-white/50 hover:text-white transition-colors py-2"
                          >
                            Log in
                          </Link>
                          <Link
                            to="/auth/signup"
                            onClick={() => setMobileOpen(false)}
                            className="text-[15px] font-medium text-white bg-sky-500 hover:bg-sky-400 px-4 py-2.5 rounded-md transition-colors text-center mt-1"
                          >
                            Get CogniSim free
                          </Link>
                        </div>
                      )
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
