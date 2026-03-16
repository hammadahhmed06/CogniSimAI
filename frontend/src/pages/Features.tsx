import { motion } from "framer-motion";
import { Brain, Zap, Target, LineChart, FileText, Sparkles } from "lucide-react";
import PageLayout from "@/components/PageLayout";

const Features = () => {
    const features = [
        {
            icon: Brain,
            title: "Epic Architect Agent",
            description: "Automatically breaks down high-level epics into granular user stories with proper acceptance criteria, reducing story creation time by 70%.",
            color: "sky"
        },
        {
            icon: Zap,
            title: "AI-Powered Story Estimation",
            description: "Provides consistent story point estimates based on historical data and complexity analysis, improving estimation accuracy to ±15%.",
            color: "amber"
        },
        {
            icon: Target,
            title: "Dynamic Backlog Prioritization",
            description: "Ranks backlog items using value-effort-risk scoring with transparent explanations, ensuring optimal value delivery.",
            color: "emerald"
        },
        {
            icon: LineChart,
            title: "Automated Sprint Planning",
            description: "Suggests optimal sprint compositions based on team capacity and story dependencies, improving sprint success rates by 15%.",
            color: "violet"
        },
        {
            icon: FileText,
            title: "Intelligent Reporting",
            description: "Generates automated progress reports and stakeholder briefings, reducing reporting time by 75%.",
            color: "rose"
        },
        {
            icon: Sparkles,
            title: "Conversational AI Interface",
            description: "Natural language interaction for queries and commands, enabling hands-free productivity with voice command support.",
            color: "indigo"
        }
    ];

    const colorMap: Record<string, { icon: string; border: string; bg: string }> = {
        sky: { icon: "text-sky-400", border: "border-sky-500/20 hover:border-sky-500/40", bg: "bg-sky-500/10" },
        amber: { icon: "text-amber-400", border: "border-amber-500/20 hover:border-amber-500/40", bg: "bg-amber-500/10" },
        emerald: { icon: "text-emerald-400", border: "border-emerald-500/20 hover:border-emerald-500/40", bg: "bg-emerald-500/10" },
        violet: { icon: "text-violet-400", border: "border-violet-500/20 hover:border-violet-500/40", bg: "bg-violet-500/10" },
        rose: { icon: "text-rose-400", border: "border-rose-500/20 hover:border-rose-500/40", bg: "bg-rose-500/10" },
        indigo: { icon: "text-indigo-400", border: "border-indigo-500/20 hover:border-indigo-500/40", bg: "bg-indigo-500/10" },
    };

    return (
        <PageLayout>
            <div className="relative min-h-screen bg-black text-white pt-20 pb-16 overflow-hidden">
                {/* Gradient background effects */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-6xl font-bold mb-6">
                            AI-Powered <span className="text-gradient-hero">Features</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                            Transform your product ownership with specialized AI agents that automate routine tasks and provide intelligent decision support
                        </p>
                    </motion.div>

                    {/* Feature Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => {
                            const colors = colorMap[feature.color];
                            return (
                                <motion.div
                                    key={index}
                                    className={`p-6 border ${colors.border} rounded-xl bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.04]`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                >
                                    <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}>
                                        <feature.icon className={`w-6 h-6 ${colors.icon}`} />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Key Benefits Section */}
                    <motion.div
                        className="mt-20 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                    >
                        <h2 className="text-3xl md:text-4xl font-bold mb-12">Key Benefits</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="p-6 rounded-xl border border-sky-500/20 bg-sky-500/5">
                                <div className="text-5xl font-bold text-sky-400 mb-2">40%</div>
                                <p className="text-slate-400">Reduction in administrative tasks</p>
                            </div>
                            <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                <div className="text-5xl font-bold text-emerald-400 mb-2">15%</div>
                                <p className="text-slate-400">Improvement in sprint success rates</p>
                            </div>
                            <div className="p-6 rounded-xl border border-violet-500/20 bg-violet-500/5">
                                <div className="text-5xl font-bold text-violet-400 mb-2">75%</div>
                                <p className="text-slate-400">Reduction in reporting time</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </PageLayout>
    );
};

export default Features;
