import { motion } from "framer-motion";
import { AlertTriangle, Clock, FileText, Users, TrendingDown } from "lucide-react";

const CogniSimProblem = () => {
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

  const problems = [
    {
      icon: Clock,
      title: "60% Administrative Burden",
      description: "Product Owners spend most of their time on manual tasks instead of strategic thinking.",
      stat: "60%",
      color: "sky"
    },
    {
      icon: FileText,
      title: "Inconsistent Documentation",
      description: "Story writing and backlog management varies widely across teams and sprints.",
      stat: "3x",
      color: "violet"
    },
    {
      icon: TrendingDown,
      title: "Poor Estimation Accuracy",
      description: "Story point estimates are often off by 30-50%, leading to failed sprints.",
      stat: "45%",
      color: "rose"
    },
    {
      icon: Users,
      title: "Communication Overhead",
      description: "Constant status updates and reporting consume valuable strategic time.",
      stat: "25%",
      color: "emerald"
    }
  ];

  const getProblemColors = (color: string) => {
    const colorMap = {
      sky: {
        icon: "text-sky-400 group-hover:text-sky-300",
        stat: "text-sky-400/80",
        glow: "from-sky-500/0 to-sky-500/0 group-hover:from-sky-500/10 group-hover:to-transparent"
      },
      violet: {
        icon: "text-violet-400 group-hover:text-violet-300",
        stat: "text-violet-400/80",
        glow: "from-violet-500/0 to-violet-500/0 group-hover:from-violet-500/10 group-hover:to-transparent"
      },
      rose: {
        icon: "text-rose-400 group-hover:text-rose-300",
        stat: "text-rose-400/80",
        glow: "from-rose-500/0 to-rose-500/0 group-hover:from-rose-500/10 group-hover:to-transparent"
      },
      emerald: {
        icon: "text-emerald-400 group-hover:text-emerald-300",
        stat: "text-emerald-400/80",
        glow: "from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/10 group-hover:to-transparent"
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.rose;
  };

  return (
    <section className="relative py-28">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 section-divider" />
      
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_55%)]"
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
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </motion.div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Product Owners Are <span className="text-gradient-primary">Drowning</span> in Administrative Tasks
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-400 leading-relaxed">
              "I became a Product Owner to shape product strategy, but I spend most of my time 
              writing user stories and chasing status updates instead of focusing on what really matters."
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-600" />
              <span className="text-sm text-slate-500 font-medium">Sarah, Senior Product Owner at TechCorp</span>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-600" />
            </div>
          </motion.div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {problems.map((problem, index) => (
            (() => {
              const colors = getProblemColors(problem.color);
              return (
            <motion.div
              key={index}
              className="group relative glass-card glass-card-hover rounded-2xl p-6"
              variants={itemVariants}
              whileHover={{ y: -6 }}
            >
              {/* Subtle glow on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors.glow} transition-all duration-500 pointer-events-none`} />
              
              <div className="relative">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl icon-container">
                    <problem.icon className={`h-6 w-6 transition-colors ${colors.icon}`} />
                  </div>
                  <motion.div 
                    className={`text-3xl font-bold tabular-nums ${colors.stat}`}
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    {problem.stat}
                  </motion.div>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white group-hover:text-white transition-colors">
                  {problem.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
                  {problem.description}
                </p>
              </div>
            </motion.div>
              );
            })()
          ))}
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
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-sky-500/5 pointer-events-none" />
            
            <div className="relative">
              <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                The Result: Strategic Thinking Takes a Backseat
              </h3>
              <p className="mx-auto max-w-2xl text-lg text-slate-400 leading-relaxed">
                When Product Owners are consumed by administrative tasks, products lose their strategic direction, 
                teams lose momentum, and organizations miss market opportunities.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CogniSimProblem;