
import { MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const FloatingContactButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show the button after scrolling down a bit
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    const contactSection = document.getElementById('contact-info');
    if (contactSection) {
      contactSection.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToContact}
      className="fixed bottom-6 right-6 z-50 rounded-full bg-white/90 p-3 text-slate-900 shadow-lg backdrop-blur hover:bg-white hover:shadow-xl transition-all"
      size="icon"
      aria-label="Contact Us"
    >
      <MessageSquare className="h-6 w-6 text-sky-500" />
    </Button>
  );
};

export default FloatingContactButton;
