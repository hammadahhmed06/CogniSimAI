import PageLayout from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { CheckIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const plans = [
    {
        name: 'Free',
        price: '$0',
        period: '/mo',
        description: 'Perfect for trying out CogniSim AI',
        features: [
            '2 AI Agents',
            '1 Project',
            'Basic Support',
            'Community Access',
            'Core Features'
        ],
        cta: 'Get Started',
        ctaLink: '/auth/signup',
        popular: false
    },
    {
        name: 'Professional',
        price: '$29',
        period: '/mo',
        description: 'For serious product owners and teams',
        features: [
            '6 AI Agents',
            'Unlimited Projects',
            'Priority Support',
            'Advanced Analytics',
            'Team Collaboration',
            'Custom Workflows'
        ],
        cta: 'Start Free Trial',
        ctaLink: '/auth/signup',
        popular: true
    },
    {
        name: 'Enterprise',
        price: '$99',
        period: '/mo',
        description: 'For large organizations',
        features: [
            'Unlimited AI Agents',
            'Unlimited Projects',
            '24/7 Dedicated Support',
            'Custom Integrations',
            'Advanced Security',
            'SLA Guarantee',
            'Training & Onboarding'
        ],
        cta: 'Contact Sales',
        ctaLink: '#contact',
        popular: false
    }
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 }
    }
};

export default function Pricing() {
    return (
        <PageLayout>
            <div className="relative w-full bg-black min-h-screen py-24">
                {/* Background Pattern */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-30"
                    aria-hidden
                >
                    <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:50px_50px]" />
                </div>

                <motion.div
                    className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    {/* Header */}
                    <motion.div className="text-center mb-16" variants={itemVariants}>
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                            Simple, Transparent Pricing
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Choose the plan that fits your needs. All plans include a 6-month free trial.
                        </p>
                    </motion.div>

                    {/* Pricing Cards */}
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
                        variants={containerVariants}
                    >
                        {plans.map((plan, index) => (
                            <motion.div
                                key={plan.name}
                                className={`relative rounded-lg border ${plan.popular
                                    ? 'border-white/20 bg-white/5'
                                    : 'border-white/10 bg-white/[0.02]'
                                    } p-8 transition-all duration-300 hover:border-white/30 hover:bg-white/[0.08]`}
                                variants={itemVariants}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-white text-black text-xs font-semibold px-3 py-1 rounded-full">
                                            MOST POPULAR
                                        </span>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-semibold text-white mb-2">
                                        {plan.name}
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                                    <div className="flex items-baseline">
                                        <span className="text-5xl font-bold text-white">{plan.price}</span>
                                        <span className="text-gray-400 ml-2">{plan.period}</span>
                                    </div>
                                </div>

                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3 text-gray-300">
                                            <CheckIcon className="w-5 h-5 text-white flex-shrink-0" />
                                            <span className="text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link to={plan.ctaLink} className="block">
                                    <Button
                                        className={`w-full ${plan.popular
                                            ? 'bg-white text-black hover:bg-gray-200'
                                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                            } transition-colors`}
                                    >
                                        {plan.cta}
                                    </Button>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* FAQ Section */}
                    <motion.div
                        className="mt-24 max-w-3xl mx-auto"
                        variants={itemVariants}
                    >
                        <h2 className="text-3xl font-bold text-white mb-8 text-center">
                            Frequently Asked Questions
                        </h2>
                        <div className="space-y-6">
                            <div className="border-b border-white/10 pb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Can I change my plan later?
                                </h3>
                                <p className="text-gray-400">
                                    Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
                                </p>
                            </div>
                            <div className="border-b border-white/10 pb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    What payment methods do you accept?
                                </h3>
                                <p className="text-gray-400">
                                    We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.
                                </p>
                            </div>
                            <div className="border-b border-white/10 pb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Is there a free trial?
                                </h3>
                                <p className="text-gray-400">
                                    Yes! All plans include a 6-month free trial. No credit card required to start.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* CTA Section */}
                    <motion.div
                        className="mt-24 text-center border border-white/10 rounded-lg p-12 bg-white/[0.02]"
                        variants={itemVariants}
                    >
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Ready to get started?
                        </h2>
                        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                            Join thousands of product owners using CogniSim AI to streamline their workflows.
                        </p>
                        <Link to="/auth/signup">
                            <Button className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-lg">
                                Start Your Free Trial
                            </Button>
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </PageLayout>
    );
}
