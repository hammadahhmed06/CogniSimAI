import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { ArrowRight } from "lucide-react";

const Integrations = () => {
  const integrations = [
    {
      name: "Jira",
      description: "Enterprise-grade bi-directional integration with 65+ features",
      features: [
        "OAuth 2.0 secure connection",
        "Real-time synchronization (<30 seconds)",
        "Full CRUD operations on issues, projects, boards",
        "AI-powered epic decomposition",
        "Advanced JQL search capabilities"
      ],
      color: "sky"
    },
    {
      name: "Slack",
      description: "Seamless team collaboration and notifications",
      features: [
        "Workspace integration via OAuth",
        "Granular notification configuration",
        "Channel mapping for projects",
        "Bot interactions",
        "Real-time project updates"
      ],
      color: "violet"
    },
    {
      name: "GitHub",
      description: "Link code commits to user stories",
      features: [
        "OAuth integration",
        "Commit-to-story traceability",
        "Pull request linking",
        "Automated workflow triggers",
        "Deployment tracking"
      ],
      color: "slate"
    }
  ];

  const colorMap: Record<string, { text: string; border: string; bg: string; bullet: string }> = {
    sky: { text: "text-sky-400", border: "border-sky-500/20 hover:border-sky-500/40", bg: "bg-sky-500/10", bullet: "bg-sky-400" },
    violet: { text: "text-violet-400", border: "border-violet-500/20 hover:border-violet-500/40", bg: "bg-violet-500/10", bullet: "bg-violet-400" },
    slate: { text: "text-slate-300", border: "border-slate-500/20 hover:border-slate-500/40", bg: "bg-slate-500/10", bullet: "bg-slate-400" },
  };

  return (
    <PageLayout>
      <div className="relative min-h-screen bg-black text-white pt-20 pb-16 overflow-hidden">
        {/* Gradient background effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-slate-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="text-gradient-hero">Integrations</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Connect with your existing tools for seamless workflow integration
            </p>
          </motion.div>

          {/* Integration Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {integrations.map((integration, index) => {
              const colors = colorMap[integration.color];
              return (
                <motion.div
                  key={index}
                  className={`p-8 border ${colors.border} rounded-xl bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.04]`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <h2 className={`text-3xl font-bold mb-3 ${colors.text}`}>
                    {integration.name}
                  </h2>
                  <p className="text-slate-400 mb-6">{integration.description}</p>
                  <ul className="space-y-3">
                    {integration.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-slate-400 flex items-start gap-3">
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.bullet} mt-1.5 shrink-0`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>

          {/* Get Started Section */}
          <motion.div
            className="text-center border-t border-white/10 pt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-6">Ready to Connect?</h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              All integrations use secure OAuth 2.0 authentication with automatic token refresh and encrypted credential storage
            </p>
            <Link
              to="/auth/signup"
              className="group inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl hover:bg-slate-100 transition-all duration-300 font-medium"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Integrations;
