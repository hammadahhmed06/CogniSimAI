import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import PageLayout from '@/components/PageLayout';

const TermsOfService = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <PageLayout>
      <section className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen overflow-hidden">
        {/* Gradient background effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 container mx-auto">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors group">
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Link>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-8 text-white">Terms of Service</h1>
            </motion.div>
            
            <motion.div 
              className="prose prose-lg max-w-none prose-invert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="text-slate-400 mb-6">Last updated: December 3, 2025</p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">1. Acceptance of Terms</h2>
              <p className="text-slate-400 mb-4">
                By accessing or using CogniSim AI ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, you may not access the Service.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">2. Description of Service</h2>
              <p className="text-slate-400 mb-4">
                CogniSim AI provides an AI-powered product management platform that helps Product Owners automate administrative tasks, manage backlogs, and optimize Agile workflows through specialized AI agents.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">3. User Accounts</h2>
              <p className="text-slate-400 mb-4">
                When you create an account with us, you must provide accurate, complete, and current information. You are responsible for:
              </p>
              <ul className="list-none pl-0 mb-4 text-slate-400 space-y-2">
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Maintaining the confidentiality of your account credentials</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />All activities that occur under your account</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Notifying us immediately of any unauthorized use</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">4. Acceptable Use</h2>
              <p className="text-slate-400 mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-none pl-0 mb-4 text-slate-400 space-y-2">
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Violate any applicable laws or regulations</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Infringe upon the rights of others</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Transmit harmful code or malware</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Attempt to gain unauthorized access to our systems</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Interfere with the proper functioning of the Service</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">5. Intellectual Property</h2>
              <p className="text-slate-400 mb-4">
                The Service and its original content, features, and functionality are owned by CogniSim AI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">6. User Content</h2>
              <p className="text-slate-400 mb-4">
                You retain ownership of any content you submit to the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content solely for the purpose of providing the Service.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">7. Third-Party Integrations</h2>
              <p className="text-slate-400 mb-4">
                Our Service integrates with third-party platforms such as Jira, Slack, and GitHub. Your use of these integrations is subject to the terms and privacy policies of those platforms.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">8. Subscription and Payment</h2>
              <p className="text-slate-400 mb-4">
                Some features of the Service require a paid subscription. Payment terms, billing cycles, and refund policies will be clearly communicated at the time of purchase.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">9. Termination</h2>
              <p className="text-slate-400 mb-4">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">10. Limitation of Liability</h2>
              <p className="text-slate-400 mb-4">
                In no event shall CogniSim AI be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangible losses.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">11. Disclaimer</h2>
              <p className="text-slate-400 mb-4">
                The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, expressed or implied, regarding the Service's reliability, availability, or fitness for a particular purpose.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">12. Changes to Terms</h2>
              <p className="text-slate-400 mb-4">
                We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or through the Service. Continued use after changes constitutes acceptance of the new Terms.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">13. Contact Us</h2>
              <p className="text-slate-400 mb-4">
                If you have any questions about these Terms, please contact us at <a href="mailto:hammadahhmed06@gmail.com" className="text-sky-400 hover:text-sky-300 transition-colors">hammadahhmed06@gmail.com</a>
              </p>
              
            </motion.div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default TermsOfService;
