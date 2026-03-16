
import React from 'react';
import { Mail, Linkedin } from 'lucide-react';

const ContactInfo = () => {
  return (
    <section id="contact-info" className="relative py-16 text-white md:py-20">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 section-divider" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_60%)]"
      />
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center md:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-sky-200">
            Get In Touch
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Contact Us Today
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-300">
            Have questions about our AI-powered product management solutions? Reach out to our team and let's discuss how we can help transform your product ownership experience.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative max-w-md overflow-hidden rounded-3xl glass-card p-6 md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10" />
            <div className="flex flex-col items-center text-center text-slate-200">
              <img 
                src="/lovable-uploads/aa5291bd-2417-4c1e-9a02-0bcc71a92507.png"
                alt="Hammad Ahmed"
                width="128"
                height="128"
                loading="lazy"
                decoding="async"
                className="mb-4 h-32 w-32 rounded-full object-cover"
              />
              <h3 className="text-xl font-bold text-white">Hammad Ahmed</h3>
              <p className="mb-4 text-slate-300">CEO and Founder</p>
              <div className="flex flex-col space-y-3">
                <a href="mailto:hammadahhmed06@gmail.com" className="flex items-center justify-center text-slate-200 transition-colors hover:text-sky-300">
                  <Mail className="mr-2 h-5 w-5" />
                  hammadahhmed06@gmail.com
                </a>
                <a 
                  href="https://www.linkedin.com/in/hammadahmed06" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center text-slate-200 transition-colors hover:text-sky-300"
                >
                  <Linkedin className="mr-2 h-5 w-5" />
                  LinkedIn Profile
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactInfo;
