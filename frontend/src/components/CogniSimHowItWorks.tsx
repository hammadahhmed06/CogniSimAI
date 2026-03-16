import { motion } from "framer-motion";
import { ArrowRight, Plug, Brain, Target, TrendingUp, Workflow } from "lucide-react";

const CogniSimHowItWorks = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
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

  const steps = [
    {
      icon: Plug,
      title: "Connect Your Tools",
      description: "Simple one-click integration with your existing project management and communication tools.",
      details: ["Jira, Azure DevOps, Trello", "Slack, Microsoft Teams", "Confluence, Notion"],
      color: "sky"
    },
    {
      icon: Brain,
      title: "AI Agents Activate",
      description: "Five specialized agents immediately begin analyzing your workflows and historical data.",
      details: ["Pattern recognition", "Historical analysis", "Team behavior learning"],
      color: "violet"
    },
    {
      icon: Target,
      title: "Intelligent Automation",
      description: "Agents start automating tasks while providing strategic insights and recommendations.",
      details: ["Automated story creation", "Smart prioritization", "Accurate estimation"],
      color: "emerald"
    },
    {
      icon: TrendingUp,
      title: "Continuous Improvement",
      description: "System learns from your decisions and outcomes, becoming more effective over time.",
      details: ["Performance optimization", "Feedback incorporation", "Adaptive algorithms"],
      color: "amber"
    }
  ];

  const getStepColors = (color: string) => {
    const colorMap = {
      sky: {
        bg: "bg-sky-500/10",
        border: "border-sky-500/20 group-hover:border-sky-400/40",
        icon: "text-sky-400",
        number: "text-sky-400/60",
        dot: "bg-sky-400"
      },
      violet: {
        bg: "bg-violet-500/10",
        border: "border-violet-500/20 group-hover:border-violet-400/40",
        icon: "text-violet-400",
        number: "text-violet-400/60",
        dot: "bg-violet-400"
      },
      emerald: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20 group-hover:border-emerald-400/40",
        icon: "text-emerald-400",
        number: "text-emerald-400/60",
        dot: "bg-emerald-400"
      },
      amber: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/20 group-hover:border-amber-400/40",
        icon: "text-amber-400",
        number: "text-amber-400/60",
        dot: "bg-amber-400"
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.sky;
  };

  return (
    <section className="relative py-28">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 section-divider" />
      
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.08),transparent_55%)]"
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="mb-16 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <motion.div 
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl icon-container"
              whileHover={{ scale: 1.05 }}
            >
              <Workflow className="h-8 w-8 text-indigo-400" />
            </motion.div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              How <span className="text-gradient-primary">CogniSim AI</span> Works
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-400 leading-relaxed">
              Our hub-and-spoke model seamlessly integrates with your existing workflow, 
              providing immediate value without disrupting your team's processes.
            </p>
          </motion.div>
        </motion.div>

        <motion.div 
          className="relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {/* Desktop Flow */}
          <div className="hidden lg:block">
            <div className="relative grid grid-cols-4 gap-5 items-stretch">
              {/* Connection Lines */}
              <div className="absolute left-[12.5%] right-[12.5%] top-[72px] z-0 h-px">
                <div className="h-full w-full bg-gradient-to-r from-sky-500/0 via-sky-400/30 to-sky-500/0" />
                {/* Animated dot traveling along the line */}
                <motion.div 
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                  animate={{ left: ["0%", "100%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              </div>
              
              {steps.map((step, index) => {
                const colors = getStepColors(step.color);
                return (
                  <motion.div
                    key={index}
                    className="group relative z-10 flex h-full min-h-[400px] w-full flex-col glass-card glass-card-hover rounded-2xl p-6"
                    variants={itemVariants}
                    whileHover={{ y: -8 }}
                  >
                    {/* Step number badge */}
                    <div className={`absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full ${colors.bg} border ${colors.border} text-sm font-bold ${colors.number}`}>
                      {index + 1}
                    </div>
                    
                    <motion.div 
                      className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl ${colors.bg} border ${colors.border} transition-all duration-300`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    >
                      <step.icon className={`h-7 w-7 ${colors.icon}`} />
                    </motion.div>
                    
                    <div className={`mb-3 text-xs font-semibold uppercase tracking-wider ${colors.icon}`}>
                      Step {index + 1}
                    </div>
                    
                    <h3 className="mb-3 text-lg font-bold text-white">
                      {step.title}
                    </h3>
                    
                    <p className="mb-5 text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
                      {step.description}
                    </p>
                    
                    <div className="space-y-2 mt-auto">
                      {step.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-center text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                          <div className={`mr-2 h-1 w-1 rounded-full ${colors.dot}`}></div>
                          {detail}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Mobile Flow */}
          <div className="space-y-6 lg:hidden">
            {steps.map((step, index) => {
              const colors = getStepColors(step.color);
              return (
                <motion.div
                  key={index}
                  className="relative"
                  variants={itemVariants}
                >
                  <div className="glass-card glass-card-hover rounded-2xl p-6">
                    <div className="flex items-start space-x-4">
                      <motion.div 
                        className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${colors.bg} border ${colors.border}`}
                        whileHover={{ scale: 1.1 }}
                      >
                        <step.icon className={`h-7 w-7 ${colors.icon}`} />
                      </motion.div>
                      
                      <div className="flex-1">
                        <div className={`mb-1 text-xs font-semibold uppercase tracking-wider ${colors.icon}`}>
                          Step {index + 1}
                        </div>
                        
                        <h3 className="mb-2 text-lg font-bold text-white">
                          {step.title}
                        </h3>
                        
                        <p className="mb-4 text-sm leading-relaxed text-slate-400">
                          {step.description}
                        </p>
                        
                        <div className="space-y-1.5">
                          {step.details.map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex items-center text-xs text-slate-400">
                              <div className={`mr-2 h-1 w-1 rounded-full ${colors.dot}`}></div>
                              {detail}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-4">
                      <motion.div
                        animate={{ y: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <ArrowRight className="h-5 w-5 text-sky-400/50 rotate-90" />
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div 
          className="mt-16 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={itemVariants}
        >
          <div className="relative rounded-3xl glass-card p-8 md:p-10 overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-sky-500/5 to-transparent pointer-events-none" />
            
            <div className="relative">
              <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                From Setup to Success in <span className="text-emerald-400">Minutes</span>
              </h3>
              <p className="mx-auto max-w-2xl text-lg text-slate-400 leading-relaxed">
                Unlike traditional tools that require weeks of configuration, CogniSim AI delivers 
                immediate value. Start seeing results within your first sprint.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CogniSimHowItWorks;