import Link from 'next/link'
import { ArrowLeft, Mail, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-2">Copyright / DMCA Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: December 2025</p>

        <div className="space-y-8 text-muted-foreground">
          {/* Important Notice Box */}
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Important Notice</h3>
                <p className="text-sm">
                  Stellix TV does <strong className="text-foreground">NOT</strong> host, upload, or store any video content on its servers. All streams are sourced from publicly available third-party websites and are simply aggregated and indexed by our service. We function similarly to a search engine.
                </p>
              </div>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">Our Commitment</h2>
            <p>
              Stellix TV respects the intellectual property rights of others and expects its users to do the same. We are committed to responding to clear notices of alleged copyright infringement in accordance with the Digital Millennium Copyright Act (DMCA) and other applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">How We Operate</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We do not upload, host, or store any video files on our servers</li>
              <li>We aggregate and index links to streams that are publicly available on the internet</li>
              <li>All content is streamed directly from third-party sources to the user</li>
              <li>We do not have control over the content of third-party streams</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">Filing a DMCA Takedown Notice</h2>
            <p>
              If you are a copyright owner, or authorized to act on behalf of one, and you believe that your copyrighted work has been linked or indexed in a way that constitutes copyright infringement, please submit a DMCA takedown notice to:
            </p>

            <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Mail className="h-4 w-4" />
                <a href="mailto:copyright@stellix.tv" className="text-primary hover:underline">
                  copyright@stellix.tv
                </a>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">Required Information</h2>
            <p>Your DMCA notice must include the following information:</p>
            <ol className="list-decimal pl-6 mt-3 space-y-3">
              <li>
                <strong className="text-foreground">Identification of the copyrighted work</strong>
                <p className="text-sm mt-1">A description of the copyrighted work that you claim has been infringed.</p>
              </li>
              <li>
                <strong className="text-foreground">Location on our service</strong>
                <p className="text-sm mt-1">The specific URL(s) or channel name(s) on Stellix TV where the allegedly infringing content can be found.</p>
              </li>
              <li>
                <strong className="text-foreground">Proof of ownership</strong>
                <p className="text-sm mt-1">Documentation proving that you own the copyright or are authorized to act on behalf of the copyright owner.</p>
              </li>
              <li>
                <strong className="text-foreground">Your contact information</strong>
                <p className="text-sm mt-1">Your full legal name, email address, physical address, and telephone number.</p>
              </li>
              <li>
                <strong className="text-foreground">Good faith statement</strong>
                <p className="text-sm mt-1">A statement that you have a good faith belief that the use of the material is not authorized by the copyright owner, its agent, or the law.</p>
              </li>
              <li>
                <strong className="text-foreground">Accuracy statement</strong>
                <p className="text-sm mt-1">A statement, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner.</p>
              </li>
              <li>
                <strong className="text-foreground">Signature</strong>
                <p className="text-sm mt-1">Your physical or electronic signature.</p>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">Response Time</h2>
            <p>
              Upon receipt of a valid DMCA takedown notice, we will:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Review the notice within 24-48 hours</li>
              <li>Remove or disable access to the allegedly infringing content promptly</li>
              <li>Notify you of the action taken</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">Counter-Notification</h2>
            <p>
              If you believe that content was removed or disabled by mistake or misidentification, you may submit a counter-notification to <a href="mailto:copyright@stellix.tv" className="text-primary hover:underline">copyright@stellix.tv</a> containing:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Identification of the removed material and its former location</li>
              <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake</li>
              <li>Your name, address, and telephone number</li>
              <li>A statement consenting to the jurisdiction of your local federal court</li>
              <li>Your physical or electronic signature</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">Repeat Infringers</h2>
            <p>
              In accordance with the DMCA, we will terminate access to our service for users who are repeat infringers in appropriate circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">Contact Information</h2>
            <p>For copyright-related inquiries:</p>
            <ul className="mt-2 space-y-1">
              <li>Copyright issues: <a href="mailto:copyright@stellix.tv" className="text-primary hover:underline">copyright@stellix.tv</a></li>
              <li>General support: <a href="mailto:support@stellix.tv" className="text-primary hover:underline">support@stellix.tv</a></li>
            </ul>
          </section>

          <div className="pt-8 border-t border-border">
            <p className="text-sm">
              Please note that filing a false DMCA takedown notice may result in legal liability. We recommend consulting with a legal professional before submitting a notice.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
