import { motion } from "framer-motion";
import PageLayout from "@/components/PageLayout";

const About = () => {
    const agentColors: Record<string, { border: string; title: string }> = {
        "Epic Architect Agent": { border: "border-sky-500/20", title: "text-sky-400" },
        "Estimator Agent": { border: "border-emerald-500/20", title: "text-emerald-400" },
        "Prioritization Strategist": { border: "border-violet-500/20", title: "text-violet-400" },
        "Sprint Planner Agent": { border: "border-amber-500/20", title: "text-amber-400" },
        "Reporting Agent": { border: "border-rose-500/20", title: "text-rose-400" },
    };

    return (
        <PageLayout>
            <div className="relative min-h-screen bg-black text-white pt-20 pb-16 overflow-hidden">
                {/* Gradient background effects */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <motion.div
                        className="mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-6xl font-bold mb-6">About <span className="text-gradient-hero">CogniSim</span></h1>
                        <p className="text-xl text-sky-300 leading-relaxed">
                            Transform Product Owners from administrative coordinators into strategic product leaders
                        </p>
                    </motion.div>

                    {/* Vision Section */}
                    <motion.section
                        className="mb-16"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <h2 className="text-3xl font-bold mb-6">Our Vision</h2>
                        <p className="text-slate-400 text-lg leading-relaxed mb-4">
                            CogniSim AI represents a paradigm shift in how Product Owners manage Agile workflows by introducing intelligent automation through specialized AI agents. Our system addresses the critical inefficiency where Product Owners spend 60% of their time on administrative tasks rather than strategic product decisions.
                        </p>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            We operate on a multi-agent architecture where each agent specializes in a specific aspect of product ownership, working together under central coordination to deliver unprecedented efficiency and insight.
                        </p>
                    </motion.section>

                    {/* Technology Section */}
                    <motion.section
                        className="mb-16"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <h2 className="text-3xl font-bold mb-6">Technology Stack</h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="p-6 rounded-xl border border-sky-500/20 bg-sky-500/5">
                                <h3 className="text-xl font-semibold mb-3 text-sky-400">Frontend</h3>
                                <ul className="space-y-2 text-slate-400">
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />React 18 with TypeScript</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Vite for blazing-fast builds</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Tailwind CSS for styling</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />shadcn/ui components</li>
                                </ul>
                            </div>
                            <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                <h3 className="text-xl font-semibold mb-3 text-emerald-400">Backend</h3>
                                <ul className="space-y-2 text-slate-400">
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Python 3.13 with FastAPI</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Gemini 2.5 Flash for AI</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Supabase (PostgreSQL)</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Real-time synchronization</li>
                                </ul>
                            </div>
                        </div>
                    </motion.section>

                    {/* Architecture Section */}
                    <motion.section
                        className="mb-16"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
                        <h2 className="text-3xl font-bold mb-6">Multi-Agent Architecture</h2>
                        <p className="text-slate-400 text-lg leading-relaxed mb-6">
                            Our system uses a hub-and-spoke model where the Integration Layer serves as the central hub, connecting to external systems while coordinating between specialized agents:
                        </p>
                        <div className="space-y-4">
                            {[
                                { name: "Epic Architect Agent", desc: "Transforms high-level epics into actionable user stories with acceptance criteria" },
                                { name: "Estimator Agent", desc: "Provides data-driven story point estimates with confidence scoring" },
                                { name: "Prioritization Strategist", desc: "Applies value-effort-risk analysis for optimal backlog prioritization" },
                                { name: "Sprint Planner Agent", desc: "Optimizes sprint composition based on capacity and dependencies" },
                                { name: "Reporting Agent", desc: "Generates automated reports and stakeholder briefings" },
                            ].map((agent) => {
                                const colors = agentColors[agent.name];
                                return (
                                    <div key={agent.name} className={`p-4 border ${colors.border} rounded-xl bg-white/[0.02]`}>
                                        <h4 className={`font-semibold ${colors.title} mb-2`}>{agent.name}</h4>
                                        <p className="text-slate-400">{agent.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.section>

                    {/* Security Section */}
                    <motion.section
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                    >
                        <h2 className="text-3xl font-bold mb-6">Security & Compliance</h2>
                        <p className="text-slate-400 text-lg leading-relaxed mb-4">
                            Security is intrinsic to our design with OAuth 2.0 authentication, AES-256 encryption for credentials, and Role-Based Access Control at the database level.
                        </p>
                        <ul className="space-y-3 text-slate-400">
                            <li className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-emerald-400" />TLS 1.3+ encryption for all data transmission</li>
                            <li className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-emerald-400" />GDPR-ready with comprehensive audit trails</li>
                            <li className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-emerald-400" />Workspace-level data isolation</li>
                            <li className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-emerald-400" />Secure integration with external systems</li>
                        </ul>
                    </motion.section>
                </div>
            </div>
        </PageLayout>
    );
};

export default About;
