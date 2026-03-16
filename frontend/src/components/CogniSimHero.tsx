import { Brain, Zap, Target, LineChart, GitBranch, Users, Code, Database, Blocks, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const FloatingIcon = ({ icon: Icon, delay, duration, x, y }: { icon: any, delay: number, duration: number, x: string, y: string }) => (
  <motion.div
    className="absolute"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{
      opacity: [0.15, 0.35, 0.15],
      y: [0, -25, 0],
      x: [0, 15, 0],
      rotate: [0, 8, 0],
      scale: [1, 1.1, 1]
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    <div className="relative">
      <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full scale-150" />
      <Icon className="relative w-10 h-10 md:w-14 md:h-14 text-slate-600/40" strokeWidth={1.5} />
    </div>
  </motion.div>
);

const CogniSimHero = () => {
  const isMobile = useIsMobile();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const scrollToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    const contactSection = document.getElementById('contact-info');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const icons = [
    { icon: Brain, x: "8%", y: "18%", delay: 0, duration: 9 },
    { icon: Zap, x: "88%", y: "15%", delay: 0.5, duration: 8 },
    { icon: Target, x: "78%", y: "65%", delay: 1, duration: 10 },
    { icon: LineChart, x: "12%", y: "72%", delay: 1.5, duration: 7 },
    { icon: GitBranch, x: "52%", y: "8%", delay: 2, duration: 9 },
    { icon: Users, x: "25%", y: "35%", delay: 0.8, duration: 8 },
    { icon: Code, x: "68%", y: "38%", delay: 1.2, duration: 10 },
    { icon: Database, x: "92%", y: "48%", delay: 1.8, duration: 7 },
    { icon: Blocks, x: "3%", y: "48%", delay: 2.2, duration: 9 },
  ];

  return (
    <motion.div
      className="relative w-full bg-black overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Enhanced gradient orbs with higher opacity */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
      
      {/* Project Management themed background patterns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Kanban board lanes */}
        <div className="absolute top-[15%] left-[5%] w-24 h-80 border border-white/[0.03] rounded-xl bg-white/[0.01]" />
        <div className="absolute top-[12%] left-[12%] w-24 h-72 border border-white/[0.03] rounded-xl bg-white/[0.01]" />
        <div className="absolute top-[18%] left-[19%] w-24 h-64 border border-white/[0.03] rounded-xl bg-white/[0.01]" />
        
        {/* Task cards in lanes */}
        <div className="absolute top-[20%] left-[7%] w-20 h-8 border border-sky-500/10 rounded-lg bg-sky-500/[0.03]" />
        <div className="absolute top-[28%] left-[7%] w-20 h-6 border border-emerald-500/10 rounded-lg bg-emerald-500/[0.03]" />
        <div className="absolute top-[17%] left-[14%] w-20 h-10 border border-violet-500/10 rounded-lg bg-violet-500/[0.03]" />
        <div className="absolute top-[26%] left-[14%] w-20 h-7 border border-amber-500/10 rounded-lg bg-amber-500/[0.03]" />
        <div className="absolute top-[22%] left-[21%] w-20 h-9 border border-rose-500/10 rounded-lg bg-rose-500/[0.03]" />
        
        {/* Sprint burndown chart lines on right */}
        <svg className="absolute top-[10%] right-[5%] w-48 h-32 opacity-[0.06]" viewBox="0 0 200 100">
          <polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400" points="0,80 40,70 80,50 120,35 160,20 200,5" />
          <polyline fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4,4" className="text-slate-400" points="0,80 200,0" />
        </svg>
        
        {/* Velocity chart bars */}
        <div className="absolute bottom-[15%] right-[8%] flex items-end gap-2 opacity-[0.05]">
          <div className="w-4 h-12 bg-sky-400 rounded-t" />
          <div className="w-4 h-16 bg-sky-400 rounded-t" />
          <div className="w-4 h-10 bg-sky-400 rounded-t" />
          <div className="w-4 h-20 bg-sky-400 rounded-t" />
          <div className="w-4 h-14 bg-sky-400 rounded-t" />
        </div>
        
        {/* Connection lines (dependencies) */}
        <svg className="absolute top-[20%] left-[26%] w-32 h-20 opacity-[0.04]" viewBox="0 0 100 60">
          <path d="M0,30 Q50,0 100,30" fill="none" stroke="currentColor" strokeWidth="2" className="text-white" />
          <circle cx="0" cy="30" r="4" className="fill-sky-400" />
          <circle cx="100" cy="30" r="4" className="fill-emerald-400" />
        </svg>
        
        {/* Story point badges */}
        <div className="absolute top-[35%] right-[15%] w-8 h-8 rounded-full border border-white/[0.06] bg-white/[0.02] flex items-center justify-center text-[10px] text-white/20 font-bold">5</div>
        <div className="absolute top-[45%] right-[20%] w-6 h-6 rounded-full border border-white/[0.05] bg-white/[0.02] flex items-center justify-center text-[8px] text-white/15 font-bold">3</div>
        <div className="absolute bottom-[30%] left-[10%] w-7 h-7 rounded-full border border-white/[0.05] bg-white/[0.02] flex items-center justify-center text-[9px] text-white/15 font-bold">8</div>
      </div>
      
      <div className="relative w-full">
        {/* Animated Floating Icons Background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {!isMobile && icons.map((props, i) => (
            <FloatingIcon key={i} {...props} />
          ))}
        </div>

        <div className="relative z-10 pt-20 sm:pt-24 md:pt-28 pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div className="max-w-5xl mx-auto text-center" variants={itemVariants}>
              {/* Subtle badge */}
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm"
                variants={itemVariants}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-sm text-slate-300 font-medium">Now offering 6 months free trial</span>
              </motion.div>

              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white"
                variants={itemVariants}
              >
                Transform Product Ownership with{" "}
                <span className="relative">
                  <span className="text-gradient-hero">
                    AI Agents
                  </span>
                </span>
              </motion.h1>

              <motion.p
                className="mt-6 max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-slate-400 leading-relaxed"
                variants={itemVariants}
              >
                Revolutionary multi-agent system that saves Product Owners{" "}
                <span className="font-semibold text-sky-300">40% time</span> on administrative tasks,
                transforming them into strategic product leaders.
              </motion.p>

              <motion.div
                className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
                variants={itemVariants}
              >
                <Button
                  size="lg"
                  className="group relative w-full sm:w-auto px-8 py-6 text-base font-semibold bg-white text-black hover:bg-white rounded-xl transition-all duration-300 overflow-hidden btn-glow"
                  onClick={scrollToContact}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Your Transformation
                    <motion.span
                      className="inline-block"
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      →
                    </motion.span>
                  </span>
                </Button>
              </motion.div>

              <motion.div
                className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-400"
                variants={itemVariants}
              >
                {[
                  { color: "bg-emerald-500", text: "6 months free trial" },
                  { color: "bg-sky-500", text: "Integrates with existing tools" },
                  { color: "bg-indigo-500", text: "No setup required" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2 group">
                    <div className={`h-2 w-2 rounded-full ${item.color} shadow-lg`} style={{ boxShadow: `0 0 10px var(--tw-shadow-color)` }}></div>
                    <span className="group-hover:text-slate-300 transition-colors">{item.text}</span>
                  </div>
                ))}
              </motion.div>

              {/* Scroll indicator */}
              <motion.div 
                className="mt-16 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <motion.div
                  className="flex flex-col items-center gap-2 text-slate-500 cursor-pointer hover:text-slate-400 transition-colors"
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CogniSimHero;