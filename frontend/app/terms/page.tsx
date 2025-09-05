import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
            <CardDescription>
              Last updated: September 5, 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <h2>Acceptance of Terms</h2>
            <p>
              By accessing and using VeriAI, you accept and agree to be bound by the terms and 
              provision of this agreement.
            </p>

            <h2>Service Description</h2>
            <p>
              VeriAI is a platform that provides AI content verification services using blockchain 
              technology. Our services include:
            </p>
            <ul>
              <li>AI content generation and verification</li>
              <li>Cryptographic content hashing</li>
              <li>Blockchain-based authentication</li>
              <li>Verification history tracking</li>
            </ul>

            <h2>User Responsibilities</h2>
            <p>As a user, you agree to:</p>
            <ul>
              <li>Provide accurate information</li>
              <li>Use the service for lawful purposes only</li>
              <li>Respect intellectual property rights</li>
              <li>Not submit harmful or malicious content</li>
              <li>Maintain the security of your wallet and credentials</li>
            </ul>

            <h2>Prohibited Uses</h2>
            <p>You may not use VeriAI to:</p>
            <ul>
              <li>Verify content that violates any laws or regulations</li>
              <li>Submit content that infringes on others' rights</li>
              <li>Attempt to reverse-engineer or compromise the platform</li>
              <li>Use the service for spam or fraudulent activities</li>
            </ul>

            <h2>Intellectual Property</h2>
            <p>
              The VeriAI platform and its original content are and remain the intellectual property 
              of VeriAI. Your use of the service does not grant you ownership rights to the platform.
            </p>

            <h2>Disclaimers</h2>
            <p>
              VeriAI provides verification services "as is" without warranties of any kind. We do not 
              guarantee the accuracy of AI-generated content or verification results.
            </p>

            <h2>Limitation of Liability</h2>
            <p>
              VeriAI shall not be liable for any indirect, incidental, special, consequential, or 
              punitive damages resulting from your use of the service.
            </p>

            <h2>Blockchain and Crypto Risks</h2>
            <p>
              Using blockchain services involves risks including but not limited to:
            </p>
            <ul>
              <li>Wallet security vulnerabilities</li>
              <li>Transaction fees and network congestion</li>
              <li>Smart contract risks</li>
              <li>Regulatory changes</li>
            </ul>

            <h2>Modifications to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective 
              immediately upon posting.
            </p>

            <h2>Termination</h2>
            <p>
              We may terminate or suspend your access to the service at any time, without prior 
              notice, for conduct that we believe violates these terms.
            </p>

            <h2>Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with applicable laws.
            </p>

            <h2>Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us through our support channels.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
