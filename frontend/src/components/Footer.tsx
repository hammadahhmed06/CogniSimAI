import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthService } from "@/lib/supabase/auth";
import { ArrowRight, Send, Sparkles, Mail } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [selectedOption, setSelectedOption] = useState<'magic-link' | 'invite' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email' });
      return;
    }

    if (!selectedOption) {
      setMessage({ type: 'error', text: 'Please select an option' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (selectedOption === 'magic-link') {
        // Magic link for existing users
        const { error } = await AuthService.sendMagicLink(email);
        if (error) {
          // Check if user doesn't exist
          if (error.message?.toLowerCase().includes('user not found') || 
              error.message?.toLowerCase().includes('no user') ||
              error.message?.toLowerCase().includes('invalid')) {
            setMessage({ 
              type: 'info', 
              text: "No account found with this email. Please select 'Invite me to CogniSim' to create a new account." 
            });
          } else {
            setMessage({ type: 'error', text: error.message });
          }
        } else {
          setMessage({
            type: 'success',
            text: 'Magic sign-in link sent! Check your email to sign in.'
          });
          setEmail('');
          setSelectedOption(null);
        }
      } else if (selectedOption === 'invite') {
        // Invite for new users - this will create account invitation
        const { error } = await AuthService.inviteUser(email);
        if (error) {
          // Check if user already exists
          if (error.message?.toLowerCase().includes('already') || 
              error.message?.toLowerCase().includes('exists') ||
              error.message?.toLowerCase().includes('registered')) {
            setMessage({ 
              type: 'info', 
              text: "This email already has an account. Please select 'Send magic sign-in link' instead." 
            });
          } else {
            setMessage({ type: 'error', text: error.message });
          }
        } else {
          setMessage({
            type: 'success',
            text: 'Invitation sent! Check your email to create your account.'
          });
          setEmail('');
          setSelectedOption(null);
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
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

  return (
    <footer
      id="site-footer"
      className="relative w-full bg-black py-16 text-white overflow-hidden"
    >
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 section-divider" />
      
      {/* Subtle gradient */}
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[150px] pointer-events-none" />
      
      <motion.div 
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Logo Column */}
          <motion.div variants={itemVariants}>
            <Link to="/" className="group inline-flex items-center gap-2.5 mb-5">
              <motion.div whileHover={{ scale: 1.05 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                  <path d="M3 3L21 21M3 21L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="group-hover:stroke-sky-400 transition-colors duration-300" />
                </svg>
              </motion.div>
              <span className="text-lg font-semibold text-white tracking-tight">CogniSim</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Transform Product Owners into strategic leaders with AI-powered product management.
            </p>
          </motion.div>

          {/* Product Column */}
          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-semibold text-white mb-5 uppercase tracking-wider">Product</h3>
            <ul className="space-y-3">
              {[
                { to: "/features", label: "Features" },
                { to: "/integrations", label: "Integrations" }
              ].map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 flex items-center gap-1"
                  >
                    {link.label}
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company Column */}
          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-semibold text-white mb-5 uppercase tracking-wider">Company</h3>
            <ul className="space-y-3">
              {[
                { to: "/about", label: "About" },
                { to: "/privacy-policy", label: "Privacy" }
              ].map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 flex items-center gap-1"
                  >
                    {link.label}
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Get in Touch Column */}
          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-semibold text-white mb-5 uppercase tracking-wider">Get in Touch</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-sky-400/30 focus-visible:border-white/20 h-11 pr-10 rounded-xl transition-all"
                />
                <Send className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              <div className="space-y-3">
                {/* Magic Link Option - For existing users */}
                <label 
                  className={`flex items-start space-x-3 cursor-pointer group p-3 rounded-lg border transition-all duration-200 ${
                    selectedOption === 'magic-link' 
                      ? 'border-sky-500/40 bg-sky-500/10' 
                      : 'border-white/5 hover:border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <input
                    type="radio"
                    name="contact-option"
                    checked={selectedOption === 'magic-link'}
                    onChange={() => setSelectedOption('magic-link')}
                    disabled={isLoading}
                    className="w-4 h-4 mt-0.5 rounded-full border-white/20 bg-white/5 text-sky-500 focus:ring-sky-400/30 focus:ring-offset-0 cursor-pointer disabled:opacity-50 transition-colors"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-sky-400" />
                      <span className="text-sm font-medium text-white">Magic sign-in link</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">For existing users - sign in without password</p>
                  </div>
                </label>

                {/* Invite Option - For new users */}
                <label 
                  className={`flex items-start space-x-3 cursor-pointer group p-3 rounded-lg border transition-all duration-200 ${
                    selectedOption === 'invite' 
                      ? 'border-emerald-500/40 bg-emerald-500/10' 
                      : 'border-white/5 hover:border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <input
                    type="radio"
                    name="contact-option"
                    checked={selectedOption === 'invite'}
                    onChange={() => setSelectedOption('invite')}
                    disabled={isLoading}
                    className="w-4 h-4 mt-0.5 rounded-full border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400/30 focus:ring-offset-0 cursor-pointer disabled:opacity-50 transition-colors"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-white">Invite me to CogniSim</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">For new users - create your account</p>
                  </div>
                </label>
              </div>

              {message && (
                <motion.p 
                  className={`text-xs p-2 rounded-lg ${
                    message.type === 'success' 
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                      : message.type === 'info'
                      ? 'text-sky-400 bg-sky-500/10 border border-sky-500/20'
                      : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                  }`}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {message.text}
                </motion.p>
              )}

              <Button
                type="submit"
                disabled={isLoading || !selectedOption}
                className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-2 h-11 rounded-xl font-medium disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : selectedOption === 'magic-link' ? 'Send Magic Link' : selectedOption === 'invite' ? 'Send Invitation' : 'Select an Option'}
                {!isLoading && selectedOption && (
                  <motion.span
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.span>
                )}
              </Button>
            </form>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div 
          className="mt-14 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4"
          variants={itemVariants}
        >
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} CogniSim AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link 
              to="/terms-of-service" 
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors duration-300"
            >
              Terms of Service
            </Link>
            <Link 
              to="/privacy-policy" 
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors duration-300"
            >
              Privacy Policy
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
};

export default Footer;
