import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: December 2025</p>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">1. Introduction</h2>
            <p>
              Stellix TV (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">2. Information We Collect</h2>

            <h3 className="font-medium text-foreground mt-4 mb-2">Information You Provide</h3>
            <p>
              Our service does NOT require registration to use basic features. If you choose to create an account, we collect:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Email address (for account creation)</li>
              <li>Display name (optional)</li>
              <li>Favorites and preferences you set</li>
            </ul>

            <h3 className="font-medium text-foreground mt-4 mb-2">Automatically Collected Information</h3>
            <p>When you use our service, we may automatically collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>IP address (for technical purposes and security)</li>
              <li>Browser type and version</li>
              <li>Device type (desktop, mobile, tablet)</li>
              <li>Country/region (derived from IP)</li>
              <li>Pages visited and channels viewed</li>
              <li>Date and time of access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">3. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide and maintain our service</li>
              <li>Save your preferences and favorites</li>
              <li>Analyze usage patterns to improve the service</li>
              <li>Ensure security and prevent abuse</li>
              <li>Respond to your inquiries or support requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">4. Cookies and Local Storage</h2>
            <p>We use cookies and local storage to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Remember your preferences (language, volume, etc.)</li>
              <li>Keep you logged in (if you have an account)</li>
              <li>Store your favorite channels locally</li>
            </ul>
            <p className="mt-3">
              You can configure your browser to refuse cookies, but this may limit some functionality of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">5. Third-Party Services</h2>
            <p>
              Video streams are loaded directly from third-party sources. These sources have their own privacy policies over which we have no control. When you watch a stream, your device connects directly to the stream source.
            </p>
            <p className="mt-3">
              We may use third-party analytics services (such as Google Analytics) to understand how users interact with our service. These services may collect information about your use of our website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">6. Data Security</h2>
            <p>
              We implement reasonable security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">7. Data Retention</h2>
            <p>
              We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy. Usage data may be retained for analytics purposes for a reasonable period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">8. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Request data portability</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, please contact us at <a href="mailto:support@stellix.tv" className="text-primary hover:underline">support@stellix.tv</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">9. Children&apos;s Privacy</h2>
            <p>
              Our service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">10. International Users</h2>
            <p>
              Our service is accessible worldwide. By using our service, you consent to the transfer of your information to servers that may be located outside your country of residence.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">12. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <ul className="mt-2 space-y-1">
              <li>Email: <a href="mailto:support@stellix.tv" className="text-primary hover:underline">support@stellix.tv</a></li>
            </ul>
          </section>

          <div className="pt-8 border-t border-border">
            <p className="text-sm">
              By using Stellix TV, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
