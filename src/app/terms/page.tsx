import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: December 2025</p>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <p>
              Welcome to Stellix TV. By accessing or using our service, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">1. Service Description</h2>
            <p>
              Stellix TV is a free streaming platform that aggregates publicly available live TV streams from across the internet. We function as an index and aggregator of third-party streams.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Important:</strong> We do NOT host, store, upload, or distribute any video content on our own servers. All content is streamed directly from third-party sources.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">2. Content Disclaimer</h2>
            <p>
              All video streams accessible through Stellix TV are sourced from publicly available third-party sources on the internet. All trademarks, service marks, trade names, logos, and content belong to their respective owners.
            </p>
            <p className="mt-3">
              Stellix TV does not claim any ownership rights over the content displayed. We merely provide links to content that is already freely available on the internet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">3. User Responsibility</h2>
            <p>
              By using Stellix TV, you acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>You are solely responsible for ensuring that your use of our service complies with all applicable laws and regulations in your jurisdiction.</li>
              <li>You understand that the legality of streaming content varies by country and region.</li>
              <li>You will not use the service for any illegal or unauthorized purpose.</li>
              <li>You are at least 13 years of age.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">4. No Warranty</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Warranties of merchantability or fitness for a particular purpose</li>
              <li>Availability, accuracy, or reliability of streams</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Quality or resolution of any content</li>
            </ul>
            <p className="mt-3">
              We do not guarantee that any channel or stream will be available at any given time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">5. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, STELLIX TV AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Your use or inability to use the service</li>
              <li>Any content obtained from the service</li>
              <li>Unauthorized access to your data</li>
              <li>Any third-party conduct on the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">6. Intellectual Property</h2>
            <p>
              The Stellix TV name, logo, and website design are our property. All other trademarks, logos, and content belong to their respective owners. We respect intellectual property rights and expect our users to do the same.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">7. Termination</h2>
            <p>
              We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">8. Changes to Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
            </p>
            <p className="mt-3">
              Your continued use of the service after any changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">9. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable international laws, without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">10. Contact</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="mt-2">
              <a href="mailto:support@stellix.tv" className="text-primary hover:underline">support@stellix.tv</a>
            </p>
          </section>

          <div className="pt-8 border-t border-border">
            <p className="text-sm">
              By using Stellix TV, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
