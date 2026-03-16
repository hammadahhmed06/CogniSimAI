import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditCardIcon, CheckIcon, XIcon } from 'lucide-react'

export default function Subscription() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
              <CreditCardIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Subscription</h1>
              <p className="text-blue-700">Manage your CogniSim AI subscription and billing</p>
            </div>
          </div>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>You are currently on the Professional plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Professional Plan</h3>
                <p className="text-blue-700">Full access to all AI agents and features</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-800">$29/mo</div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Active
                </Badge>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span>6 AI Agents</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span>Unlimited Projects</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span>Priority Support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span>Advanced Analytics</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>Choose the plan that best fits your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free Plan */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">Free</h3>
                <div className="text-3xl font-bold mb-4">$0<span className="text-sm text-slate-500">/mo</span></div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm">2 AI Agents</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm">1 Project</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <XIcon className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Basic Support</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full">Current Plan</Button>
              </div>

              {/* Professional Plan */}
              <div className="border-2 border-blue-600 rounded-lg p-6 relative">
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-600">
                  Current
                </Badge>
                <h3 className="text-lg font-bold mb-2">Professional</h3>
                <div className="text-3xl font-bold mb-4">$29<span className="text-sm text-slate-500">/mo</span></div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm">6 AI Agents</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Unlimited Projects</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Priority Support</span>
                  </li>
                </ul>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Active Plan</Button>
              </div>

              {/* Enterprise Plan */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">Enterprise</h3>
                <div className="text-3xl font-bold mb-4">$99<span className="text-sm text-slate-500">/mo</span></div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Unlimited AI Agents</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Team Collaboration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm">24/7 Support</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full">Upgrade</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>Your next payment and billing details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Next billing date:</span>
                <span className="font-medium">March 15, 2025</span>
              </div>
              <div className="flex justify-between">
                <span>Payment method:</span>
                <span className="font-medium">•••• •••• •••• 1234</span>
              </div>
              <div className="flex justify-between">
                <span>Billing address:</span>
                <span className="font-medium">Update required</span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline">Update Payment Method</Button>
              <Button variant="outline">Download Invoice</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
