import Link from 'next/link'
import { ArrowLeft, FileText, Shield, Mail, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Link href="/watch">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Watch
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-2">Legal Information</h1>
        <p className="text-muted-foreground mb-8">
          Important information about our service, your rights, and our policies.
        </p>

        {/* Important Notice */}
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 mb-8">
          <h2 className="font-semibold mb-2">Important Notice</h2>
          <p className="text-sm text-muted-foreground">
            Stellix TV is a free streaming platform that aggregates publicly available live TV streams from across the internet. We do <strong className="text-foreground">NOT</strong> host, store, upload, or distribute any video content on our own servers. All content is streamed directly from third-party sources.
          </p>
        </div>

        {/* Legal Documents Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/terms" className="group">
            <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Scale className="h-5 w-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  Terms of Service
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Read our terms and conditions for using Stellix TV, including service description, user responsibilities, and limitations.
              </p>
            </div>
          </Link>

          <Link href="/privacy" className="group">
            <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <FileText className="h-5 w-5 text-green-500" />
                </div>
                <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  Privacy Policy
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Learn how we collect, use, and protect your personal information when you use our service.
              </p>
            </div>
          </Link>

          <Link href="/dmca" className="group">
            <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <Shield className="h-5 w-5 text-red-500" />
                </div>
                <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  Copyright / DMCA
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Information for copyright holders about submitting takedown requests and our DMCA compliance process.
              </p>
            </div>
          </Link>

          <Link href="/contact" className="group">
            <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Mail className="h-5 w-5 text-purple-500" />
                </div>
                <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  Contact Us
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Get in touch with us for support, copyright inquiries, or general questions about our service.
              </p>
            </div>
          </Link>
        </div>

        {/* Quick Summary */}
        <div className="mt-12 space-y-6">
          <h2 className="text-xl font-semibold">Quick Summary</h2>

          <div className="space-y-4 text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground">We Don&apos;t Host Content</h3>
              <p className="text-sm mt-1">
                Stellix TV operates as a player that connects to publicly available streams. We do not upload, store, or distribute video content on our servers.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-foreground">User Responsibility</h3>
              <p className="text-sm mt-1">
                By using Stellix TV, you agree that you are responsible for complying with the laws of your country regarding streaming content.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-foreground">Copyright Concerns</h3>
              <p className="text-sm mt-1">
                If you are a copyright holder and believe your content is being linked improperly, please visit our <Link href="/dmca" className="text-primary hover:underline">DMCA page</Link> or contact us at <a href="mailto:copyright@stellix.tv" className="text-primary hover:underline">copyright@stellix.tv</a>. We respond within 24-48 hours.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Last updated: December 2025
          </p>
        </div>
      </div>
    </div>
  )
}
