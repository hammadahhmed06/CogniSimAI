import { DashboardLayout } from '@/components/DashboardLayout'
import { Book, Search, ChevronRight, FileText, Video, Code, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

export default function Documentation() {
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of CogniSim AI',
      icon: Book,
      color: 'text-blue-600 bg-blue-100',
      articles: [
        { title: 'Quick Start Guide', time: '5 min', type: 'article' },
        { title: 'Creating Your First Workspace', time: '3 min', type: 'article' },
        { title: 'Inviting Team Members', time: '2 min', type: 'article' },
        { title: 'Understanding Teams & Workspaces', time: '8 min', type: 'article' },
      ]
    },
    {
      title: 'Projects & Issues',
      description: 'Manage your projects effectively',
      icon: FileText,
      color: 'text-green-600 bg-green-100',
      articles: [
        { title: 'Creating Projects', time: '4 min', type: 'article' },
        { title: 'Managing Issues & Epics', time: '6 min', type: 'article' },
        { title: 'Sprint Planning Best Practices', time: '10 min', type: 'article' },
        { title: 'Using Kanban Boards', time: '7 min', type: 'article' },
      ]
    },
    {
      title: 'AI Agents',
      description: 'Harness the power of AI automation',
      icon: Code,
      color: 'text-purple-600 bg-purple-100',
      articles: [
        { title: 'Introduction to AI Agents', time: '5 min', type: 'video' },
        { title: 'Epic Decomposer Guide', time: '8 min', type: 'article' },
        { title: 'Agent Configuration', time: '6 min', type: 'article' },
        { title: 'Custom Agent Workflows', time: '12 min', type: 'article' },
      ]
    },
    {
      title: 'Integrations',
      description: 'Connect with your favorite tools',
      icon: Video,
      color: 'text-orange-600 bg-orange-100',
      articles: [
        { title: 'Jira Integration Setup', time: '5 min', type: 'video' },
        { title: 'GitHub Integration', time: '4 min', type: 'article' },
        { title: 'Slack Notifications', time: '3 min', type: 'article' },
        { title: 'API Access & Webhooks', time: '10 min', type: 'article' },
      ]
    },
  ]

  const popularArticles = [
    { title: 'How to use Epic Decomposer', views: '12.5k', icon: Code },
    { title: 'Team collaboration best practices', views: '8.2k', icon: FileText },
    { title: 'Setting up Jira sync', views: '6.8k', icon: Video },
    { title: 'Keyboard shortcuts guide', views: '5.4k', icon: HelpCircle },
  ]

  const filteredCategories = categories.map(cat => ({
    ...cat,
    articles: cat.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.articles.length > 0)

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
            <p className="text-muted-foreground mt-1">
              Everything you need to know about using CogniSim AI
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
        </div>

        {/* Popular Articles */}
        {!searchQuery && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Popular Articles</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {popularArticles.map((article, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <article.icon className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{article.title}</p>
                      <p className="text-xs text-muted-foreground">{article.views} views</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-6">
          {(searchQuery ? filteredCategories : categories).map((category, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <category.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.articles.map((article, articleIdx) => (
                    <div
                      key={articleIdx}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-sm font-medium group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {article.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-xs">{article.time}</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {searchQuery && filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">
              Try searching with different keywords
            </p>
          </div>
        )}

        {/* Help Banner */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Need more help?</h3>
                <p className="text-sm text-muted-foreground">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
              </div>
              <a
                href="/support"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Contact Support
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
