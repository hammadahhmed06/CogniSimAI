import React from 'react'
import { motion } from 'framer-motion'
import { 
  Command, 
  Sparkles, 
  Calendar, 
  Clock,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandHeaderProps {
  userName: string
  greeting?: string
  currentTime?: Date
}

export function CommandHeader({ userName, greeting, currentTime = new Date() }: CommandHeaderProps) {
  const hour = currentTime.getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const displayGreeting = greeting || timeGreeting

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-6 sm:p-8 shadow-xl"
    >
      {/* Animated background patterns */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left side - Greeting */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg"
            >
              <Command className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-blue-100 text-sm font-medium"
              >
                {displayGreeting}
              </motion.p>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
              >
                {userName}
              </motion.h1>
            </div>
          </div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-blue-100/80 text-sm max-w-md"
          >
            Welcome to your AI-powered command center. Track projects, manage tasks, and leverage intelligent agents.
          </motion.p>
        </div>

        {/* Right side - Status cards */}
        <div className="flex flex-wrap gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-2.5 border border-white/10"
          >
            <Calendar className="h-4 w-4 text-blue-200" />
            <span className="text-white text-sm font-medium">{formattedDate}</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-2.5 border border-white/10"
          >
            <Clock className="h-4 w-4 text-blue-200" />
            <span className="text-white text-sm font-medium">{formattedTime}</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-2 rounded-xl bg-emerald-500/20 backdrop-blur-sm px-4 py-2.5 border border-emerald-400/30"
          >
            <div className="relative">
              <Zap className="h-4 w-4 text-emerald-300" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <span className="text-emerald-100 text-sm font-medium">AI Active</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
