import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import PageLayout from '@/components/PageLayout';

const PrivacyPolicy = () => {
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
              
              <h1 className="text-4xl md:text-5xl font-bold mb-8 text-white">Privacy Policy</h1>
            </motion.div>
            
            <motion.div 
              className="prose prose-lg max-w-none prose-invert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="text-slate-400 mb-6">Last updated: April 11, 2025</p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">1. Introduction</h2>
              <p className="text-slate-400 mb-4">
                At CogniSim AI ("we," "our," or "us"), we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">2. Information We Collect</h2>
              <p className="text-slate-400 mb-4">
                We may collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-none pl-0 mb-4 text-slate-400 space-y-2">
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Contact us through our website</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Subscribe to our newsletter</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Register for our services</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />Participate in our surveys or promotions</li>
              </ul>
              <p className="text-slate-400 mb-4">
                This information may include your name, email address, company name, phone number, and any other information you choose to provide.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">3. How We Use Your Information</h2>
              <p className="text-slate-400 mb-4">
                We may use the information we collect for various purposes, including to:
              </p>
              <ul className="list-none pl-0 mb-4 text-slate-400 space-y-2">
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Provide, operate, and maintain our services</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Improve, personalize, and expand our services</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Understand and analyze how you use our services</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Develop new products, services, features, and functionality</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Communicate with you about our services, updates, and other information</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Process transactions and send related information</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Find and prevent fraud</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">4. Cookies and Tracking Technologies</h2>
              <p className="text-slate-400 mb-4">
                We may use cookies and similar tracking technologies to track activity on our website and store certain information. Cookies are files with a small amount of data that may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">5. Third-Party Services</h2>
              <p className="text-slate-400 mb-4">
                We may use third-party services that collect, monitor, and analyze data to improve our services. These third parties have their own privacy policies addressing how they use such information.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">6. Data Retention</h2>
              <p className="text-slate-400 mb-4">
                We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">7. Security</h2>
              <p className="text-slate-400 mb-4">
                The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">8. Your Rights</h2>
              <p className="text-slate-400 mb-4">
                Depending on your location, you may have certain rights regarding your personal information, such as the right to access, correct, or delete your personal information.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">9. Changes to This Privacy Policy</h2>
              <p className="text-slate-400 mb-4">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. We will let you know via email and/or a prominent notice on our website prior to the change becoming effective.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-white">10. Contact Us</h2>
              <p className="text-slate-400 mb-4">If you have any questions about this Privacy Policy, please contact us at <a href="mailto:hammadahhmed06@gmail.com" className="text-sky-400 hover:text-sky-300 transition-colors">hammadahhmed06@gmail.com</a></p>
              
            </motion.div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default PrivacyPolicy;