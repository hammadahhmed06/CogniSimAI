import { motion } from "framer-motion";
import { TrendingUp, Clock, Target, BarChart3, ArrowRight, CheckCircle, Shield, Zap, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

const CogniSimMetrics = () => {
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

  const metrics = [
    {
      icon: Clock,
      value: "40%",
      label: "Reduction in Administrative Workload",
      description: "Product Owners save 2-3 hours daily on routine tasks",
      color: "sky"
    },
    {
      icon: Target,
      value: "±15%",
      label: "Story Point Estimation Variance",
      description: "Consistently accurate estimates across all teams",
      color: "violet"
    },
    {
      icon: TrendingUp,
      value: "15%",
      label: "Improvement in Sprint Goal Achievement",
      description: "Better planning leads to more successful sprints",
      color: "emerald"
    },
    {
      icon: BarChart3,
      value: "75%",
      label: "Reduction in Reporting Time",
      description: "Automated insights replace manual status updates",
      color: "amber"
    }
  ];

  const trustIndicators = [
    { icon: Shield, text: "Enterprise Security" },
    { icon: CheckCircle, text: "SOC 2 Compliant" },
    { icon: Zap, text: "99.9% Uptime SLA" }
  ];

  const getMetricColors = (color: string) => {
    const colorMap = {
      sky: {
        bg: "bg-sky-500/10",
        border: "border-sky-500/20 group-hover:border-sky-400/40",
        icon: "text-sky-400",
        value: "text-sky-400"
      },
      violet: {
        bg: "bg-violet-500/10",
        border: "border-violet-500/20 group-hover:border-violet-400/40",
        icon: "text-violet-400",
        value: "text-violet-400"
      },
      emerald: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20 group-hover:border-emerald-400/40",
        icon: "text-emerald-400",
        value: "text-emerald-400"
      },
      amber: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/20 group-hover:border-amber-400/40",
        icon: "text-amber-400",
        value: "text-amber-400"
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.sky;
  };

  const scrollToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    const contactSection = document.getElementById('contact-info');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative py-28">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 section-divider" />
      
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_60%)]"
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Metrics Section */}
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
              <TrendingUp className="h-8 w-8 text-sky-400" />
            </motion.div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Measurable Impact from <span className="text-gradient-primary">Day One</span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-400 leading-relaxed">
              CogniSim AI delivers quantifiable improvements that transform how your product teams operate.
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {metrics.map((metric, index) => {
            const colors = getMetricColors(metric.color);
            return (
              <motion.div
                key={index}
                className="group relative glass-card glass-card-hover rounded-2xl p-6 text-center"
                variants={itemVariants}
                whileHover={{ y: -6 }}
              >
                <motion.div 
                  className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl ${colors.bg} border ${colors.border} transition-all duration-300`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                  <metric.icon className={`h-7 w-7 ${colors.icon}`} />
                </motion.div>

                <motion.div 
                  className={`mb-2 text-4xl font-bold ${colors.value} tabular-nums`}
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                  {metric.value}
                </motion.div>

                <h3 className="mb-3 text-base font-semibold text-white">
                  {metric.label}
                </h3>

                <p className="text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
                  {metric.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          className="relative rounded-3xl glass-card p-8 md:p-12 overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={itemVariants}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-indigo-500/5 to-violet-500/5 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative text-center">
            <motion.div 
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Rocket className="h-8 w-8 text-sky-400" />
            </motion.div>
            
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Ready to Transform Your Product Ownership?
            </h2>

            <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-400 leading-relaxed">
              Join hundreds of Product Owners who've already made the switch to strategic leadership.
              Start your free 6-month trial today.
            </p>

            <div className="mb-8">
              <Button
                size="lg"
                className="group relative px-10 py-7 text-base font-semibold bg-white text-black hover:bg-white rounded-xl transition-all duration-300 overflow-hidden btn-glow"
                onClick={scrollToContact}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Trial
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </span>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-6">
              {trustIndicators.map((indicator, index) => (
                <motion.div 
                  key={index} 
                  className="flex items-center gap-2 text-sm text-slate-400"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <indicator.icon className="w-4 h-4 text-slate-500" />
                  <span>{indicator.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Additional Benefits */}
        <motion.div
          className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {[
            { icon: CheckCircle, title: "No Setup Required", description: "Start seeing benefits immediately with our plug-and-play integration.", color: "emerald" },
            { icon: Shield, title: "Enterprise Ready", description: "Bank-level security with enterprise compliance and support.", color: "sky" },
            { icon: Zap, title: "Continuous Learning", description: "AI agents become more effective as they learn your team's patterns.", color: "violet" }
          ].map((benefit, index) => (
            <motion.div
              key={index}
              className="group text-center"
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <motion.div 
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl icon-container"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
              >
                <benefit.icon className={`h-8 w-8 ${benefit.color === 'emerald' ? 'text-emerald-400' : benefit.color === 'sky' ? 'text-sky-400' : 'text-violet-400'}`} />
              </motion.div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {benefit.title}
              </h3>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default CogniSimMetrics;