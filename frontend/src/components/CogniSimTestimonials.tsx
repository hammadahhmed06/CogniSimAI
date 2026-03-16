import { motion } from "framer-motion";
import { Quote, User, Building, Star, MessageSquareQuote } from "lucide-react";

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

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Senior Product Owner",
    company: "TechCorp",
    avatar: "S",
    quote:
      "CogniSim AI transformed how I work. Instead of spending hours writing user stories, I now focus on strategic product decisions. The AI agents handle the tedious work while I drive product vision.",
    pain: "Administrative Burden",
    solution: "Strategic Focus",
    improvement: "60% time savings"
  },
  {
    name: "Michael Rodriguez",
    role: "Agile Coach",
    company: "InnovateLabs",
    avatar: "M",
    quote:
      "The consistency across our teams improved dramatically. Every Product Owner now has access to the same level of expertise in story writing and estimation. It's like having a senior PM on every team.",
    pain: "Inconsistent Quality",
    solution: "Standardized Excellence",
    improvement: "3x more consistent stories"
  },
  {
    name: "David Thompson",
    role: "VP of Product",
    company: "ScaleUp Inc",
    avatar: "D",
    quote:
      "The reporting capabilities alone save us weeks of work every quarter. Real-time insights into all our products without manually chasing updates from every Product Owner.",
    pain: "Manual Reporting",
    solution: "Automated Insights",
    improvement: "75% faster reporting"
  }
];

const getAvatarColor = (name: string) => {
  const colors = [
    "from-sky-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-purple-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600"
  ];
  return colors[name.length % colors.length];
};

const CogniSimTestimonials = () => {
  return (
    <section className="relative py-28">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 section-divider" />
      
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.08),transparent_60%)]"
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
              <MessageSquareQuote className="h-8 w-8 text-sky-400" />
            </motion.div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Transforming <span className="text-gradient-primary">Product Teams</span> Worldwide
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-400 leading-relaxed">
              See how Product Owners, Agile Coaches, and Product Leaders are using CogniSim AI
              to focus on what matters most: building exceptional products.
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          className="mb-16 grid grid-cols-1 gap-6 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="group relative glass-card glass-card-hover rounded-2xl p-6"
              variants={itemVariants}
              whileHover={{ y: -6 }}
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 h-8 w-8 text-white/5" />
              
              <div className="relative">
                {/* Stars */}
                <div className="mb-5 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
                      viewport={{ once: true }}
                    >
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    </motion.div>
                  ))}
                </div>

                <blockquote className="mb-6 text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors">
                  "{testimonial.quote}"
                </blockquote>

                {/* Before/After */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-rose-500/5 border border-rose-500/10 p-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-rose-400">Before</div>
                    <div className="text-sm text-slate-300">{testimonial.pain}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">After</div>
                    <div className="text-sm text-slate-300">{testimonial.solution}</div>
                  </div>
                </div>

                {/* Improvement badge */}
                <motion.div 
                  className="mb-5 inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1.5"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <span className="text-xs font-semibold text-sky-300">{testimonial.improvement}</span>
                </motion.div>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(testimonial.name)} font-semibold text-white shadow-lg`}
                  >
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{testimonial.name}</div>
                    <div className="text-xs text-slate-400">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="relative rounded-3xl glass-card p-8 md:p-10 overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={itemVariants}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-transparent to-violet-500/5 pointer-events-none" />
          
          <div className="relative text-center">
            <h3 className="mb-8 text-2xl font-bold text-white md:text-3xl">
              Built for Every Product Professional
            </h3>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                { icon: User, title: "Product Owners", description: "Focus on strategy, not administration. Let AI handle the routine tasks.", color: "sky" },
                { icon: Building, title: "Agile Coaches", description: "Ensure consistency across teams with AI-powered best practices.", color: "emerald" },
                { icon: Star, title: "Product Leaders", description: "Get real-time insights across all products without manual overhead.", color: "violet" }
              ].map((role, index) => (
                <motion.div 
                  key={index}
                  className="group text-center"
                  whileHover={{ y: -4 }}
                >
                  <motion.div 
                    className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl icon-container`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    <role.icon className={`h-7 w-7 ${role.color === 'sky' ? 'text-sky-400' : role.color === 'emerald' ? 'text-emerald-400' : 'text-violet-400'}`} />
                  </motion.div>
                  <h4 className="mb-2 font-semibold text-white">{role.title}</h4>
                  <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    {role.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CogniSimTestimonials;