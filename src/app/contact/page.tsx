import Link from 'next/link'
import { ArrowLeft, Mail, Shield, HelpCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-8">
          We&apos;re here to help. Choose the appropriate channel for your inquiry.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* General Support */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">General Support</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              For general questions, technical issues, or feedback about our service.
            </p>
            <a
              href="mailto:support@stellix.tv"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              support@stellix.tv
            </a>
          </div>

          {/* Copyright Issues */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <Shield className="h-5 w-5 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold">Copyright / DMCA</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              For copyright infringement notices and DMCA takedown requests.
            </p>
            <a
              href="mailto:copyright@stellix.tv"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              copyright@stellix.tv
            </a>
          </div>

          {/* Business Inquiries */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold">General Inquiries</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              For partnerships, business opportunities, or other general inquiries.
            </p>
            <a
              href="mailto:contact@stellix.tv"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              contact@stellix.tv
            </a>
          </div>
        </div>

        <div className="mt-12 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">Response Time</h2>
            <p className="text-muted-foreground">
              We aim to respond to all inquiries within 24-48 hours. For urgent copyright matters, we prioritize responses and typically respond within 24 hours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Before You Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              Please make sure to check our help resources:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>
                {' '}- Our terms and conditions
              </li>
              <li>
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                {' '}- How we handle your data
              </li>
              <li>
                <Link href="/dmca" className="text-primary hover:underline">
                  DMCA Policy
                </Link>
                {' '}- Copyright and takedown information
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Common Issues</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground">Stream not working?</h3>
                <p className="text-sm mt-1">
                  Streams are sourced from third-party providers. If a stream is down, it&apos;s usually a temporary issue with the source. Try again later or switch to a different channel.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Video quality issues?</h3>
                <p className="text-sm mt-1">
                  Video quality depends on the source stream and your internet connection. Try refreshing the page or checking your connection speed.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Can&apos;t find a specific channel?</h3>
                <p className="text-sm mt-1">
                  We aggregate publicly available streams. Not all channels may be available. You can contact us with suggestions for channels you&apos;d like to see.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
