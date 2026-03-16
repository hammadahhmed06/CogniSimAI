import { motion } from "framer-motion";
import { Building2, Calculator, Target, Calendar, BarChart3, FileText, Zap, Sparkles } from "lucide-react";

const CogniSimFeatures = () => {
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

  const agents = [
    {
      icon: FileText,
      name: "PRD Agent",
      description: "Turns raw ideas into a stakeholder-ready PRD with clear scope, requirements, risks, and success metrics.",
      benefits: ["Structured PRD sections", "Consistent formatting", "Faster approvals"],
      color: "indigo",
      gradient: "from-indigo-500/20 to-sky-500/10"
    },
    {
      icon: Building2,
      name: "Epic Architect Agent",
      description: "Automatically generates detailed user stories and acceptance criteria from high-level requirements.",
      benefits: ["Consistent story quality", "Faster backlog creation", "Better requirement clarity"],
      color: "sky",
      gradient: "from-sky-500/20 to-blue-500/10"
    },
    {
      icon: Calculator,
      name: "Estimator Agent",
      description: "Provides accurate story point estimates based on historical data and complexity analysis.",
      benefits: ["±15% variance accuracy", "Consistent sizing", "Velocity prediction"],
      color: "emerald",
      gradient: "from-emerald-500/20 to-teal-500/10"
    },
    {
      icon: Target,
      name: "Prioritization Strategist Agent",
      description: "Intelligently ranks backlog items based on business value, dependencies, and strategic goals.",
      benefits: ["Data-driven decisions", "Strategic alignment", "Risk mitigation"],
      color: "violet",
      gradient: "from-violet-500/20 to-purple-500/10"
    },
    {
      icon: Calendar,
      name: "Sprint Planner Agent",
      description: "Optimizes sprint composition considering team capacity, dependencies, and priorities.",
      benefits: ["15% better goal achievement", "Balanced workloads", "Dependency resolution"],
      color: "amber",
      gradient: "from-amber-500/20 to-orange-500/10"
    },
    {
      icon: BarChart3,
      name: "Reporting Agent",
      description: "Generates comprehensive reports and dashboards with minimal manual input required.",
      benefits: ["75% time reduction", "Real-time insights", "Stakeholder clarity"],
      color: "rose",
      gradient: "from-rose-500/20 to-pink-500/10"
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      sky: {
        container: "bg-sky-500/10 border-sky-500/20 group-hover:bg-sky-500/15 group-hover:border-sky-400/30",
        icon: "text-sky-400 group-hover:text-sky-300",
        dot: "bg-sky-400"
      },
      emerald: {
        container: "bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/15 group-hover:border-emerald-400/30",
        icon: "text-emerald-400 group-hover:text-emerald-300",
        dot: "bg-emerald-400"
      },
      violet: {
        container: "bg-violet-500/10 border-violet-500/20 group-hover:bg-violet-500/15 group-hover:border-violet-400/30",
        icon: "text-violet-400 group-hover:text-violet-300",
        dot: "bg-violet-400"
      },
      amber: {
        container: "bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/15 group-hover:border-amber-400/30",
        icon: "text-amber-400 group-hover:text-amber-300",
        dot: "bg-amber-400"
      },
      rose: {
        container: "bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500/15 group-hover:border-rose-400/30",
        icon: "text-rose-400 group-hover:text-rose-300",
        dot: "bg-rose-400"
      },
      indigo: {
        container: "bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/15 group-hover:border-indigo-400/30",
        icon: "text-indigo-400 group-hover:text-indigo-300",
        dot: "bg-indigo-400"
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.sky;
  };

  return (
    <section id="features" className="relative scroll-mt-24 py-28">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 section-divider" />
      
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.08),transparent_55%)]"
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
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300, damping: 10 }}
            >
              <Zap className="h-8 w-8 text-sky-400" />
            </motion.div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Meet Your <span className="text-gradient-primary">AI Agent Team</span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-400 leading-relaxed">
              Six specialized AI agents working together to transform your product management workflow,
              each designed to excel at specific aspects of product ownership.
            </p>
          </motion.div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {agents.map((agent, index) => {
            const colors = getColorClasses(agent.color);
            return (
              <motion.div
                key={index}
                className="group relative glass-card glass-card-hover rounded-2xl p-6"
                variants={itemVariants}
                whileHover={{ y: -6 }}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${agent.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                
                <div className="relative">
                  <motion.div 
                    className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl border transition-all duration-300 ${colors.container}`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    <agent.icon className={`h-7 w-7 transition-colors ${colors.icon}`} />
                  </motion.div>
                  
                  <h3 className="mb-3 text-xl font-bold text-white group-hover:text-white transition-colors">
                    {agent.name}
                  </h3>
                  
                  <p className="mb-5 leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
                    {agent.description}
                  </p>
                  
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Key Benefits</h4>
                    {agent.benefits.map((benefit, benefitIndex) => (
                      <motion.div 
                        key={benefitIndex} 
                        className="flex items-center text-sm text-slate-400 group-hover:text-slate-300 transition-colors"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: benefitIndex * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <div className={`mr-2.5 h-1.5 w-1.5 rounded-full ${colors.dot}`}></div>
                        {benefit}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div 
          className="mt-16 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={itemVariants}
        >
          <div className="relative rounded-3xl glass-card p-8 md:p-10 overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-indigo-500/5 to-violet-500/5 pointer-events-none" />
            
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-sky-400" />
                <span className="text-sm font-medium text-sky-400 uppercase tracking-wider">Seamless Integration</span>
              </div>
              <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                Immediate Impact, Zero Disruption
              </h3>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-400 leading-relaxed">
                CogniSim AI agents integrate with your existing tools and workflows. 
                No disruption, no learning curve—just instant productivity gains.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {["Jira", "Azure DevOps", "Confluence", "Slack", "Microsoft Teams"].map((tool, index) => (
                  <motion.span 
                    key={index}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
                    whileHover={{ scale: 1.05 }}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    viewport={{ once: true }}
                  >
                    {tool}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CogniSimFeatures;