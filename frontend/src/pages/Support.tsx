import { DashboardLayout } from '@/components/DashboardLayout'
import { MessageSquare, Mail, Phone, Clock, Send, FileText, HelpCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { notify } from '@/lib/notify'

export default function Support() {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    notify.success('Support ticket submitted successfully! We\'ll get back to you soon.')
    setSubject('')
    setCategory('')
    setMessage('')
    setSubmitting(false)
  }

  const contactMethods = [
    {
      icon: MessageSquare,
      title: 'Live Chat',
      description: 'Chat with our support team',
      availability: 'Available 9 AM - 6 PM EST',
      action: 'Start Chat',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'support@cognisim.ai',
      availability: 'Response within 24 hours',
      action: 'Send Email',
      color: 'text-green-600 bg-green-100',
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: '+1 (555) 123-4567',
      availability: 'Mon-Fri, 9 AM - 6 PM EST',
      action: 'Call Now',
      color: 'text-purple-600 bg-purple-100',
    },
  ]

  const faqs = [
    {
      question: 'How do I reset my password?',
      answer: 'Go to Account Settings > Security and click "Change Password".',
    },
    {
      question: 'How do I add team members to my workspace?',
      answer: 'Navigate to Workspaces > Select workspace > Members tab > Click "Invite Member".',
    },
    {
      question: 'What integrations are supported?',
      answer: 'We support GitHub, Slack, and other integrations. Note: Jira features have been limited to OAuth authentication only.',
    },
    {
      question: 'How does the Epic Decomposer work?',
      answer: 'The Epic Decomposer uses AI to break down large epics into manageable user stories automatically.',
    },
    {
      question: 'What are the pricing plans?',
      answer: 'We offer Free, Pro, and Enterprise plans. Visit the Subscription page to see detailed pricing.',
    },
  ]

  const recentTickets = [
    {
      id: '#SUPP-1234',
      subject: 'Question about integrations',
      status: 'In Progress',
      date: '2 hours ago',
      statusColor: 'text-blue-600 bg-blue-100',
    },
    {
      id: '#SUPP-1233',
      subject: 'Cannot invite team members',
      status: 'Resolved',
      date: '1 day ago',
      statusColor: 'text-green-600 bg-green-100',
    },
  ]

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
          <p className="text-muted-foreground mt-1">
            Get help from our support team or browse our knowledge base
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid gap-4 md:grid-cols-3">
          {contactMethods.map((method, idx) => (
            <Card key={idx} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-lg ${method.color} flex items-center justify-center mb-4`}>
                  <method.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-1">{method.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Clock className="h-3 w-3" />
                  {method.availability}
                </div>
                <Button className="w-full" variant="outline" size="sm">
                  {method.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Submit Ticket Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Submit a Support Ticket</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="billing">Billing & Subscription</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="integration">Integration Help</SelectItem>
                        <SelectItem value="account">Account Management</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Please provide as much detail as possible..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Ticket
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Recent Tickets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Tickets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTickets.length > 0 ? (
                  recentTickets.map((ticket, idx) => (
                    <div key={idx} className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${ticket.statusColor}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">{ticket.date}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent tickets
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a href="/docs" className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-sm cursor-pointer transition-colors">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Documentation
                </a>
                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-sm cursor-pointer transition-colors">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  Community Forum
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-sm cursor-pointer transition-colors">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  System Status
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Quick answers to common questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border-b last:border-0 pb-4 last:pb-0">
                  <h4 className="font-semibold mb-2 flex items-start gap-2">
                    <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    {faq.question}
                  </h4>
                  <p className="text-sm text-muted-foreground pl-7">{faq.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
