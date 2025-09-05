import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            <CardDescription>
              Last updated: September 5, 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <h2>Overview</h2>
            <p>
              VeriAI is committed to protecting your privacy. This Privacy Policy explains how we collect, 
              use, and safeguard your information when you use our AI content verification platform.
            </p>

            <h2>Information We Collect</h2>
            <h3>Wallet Information</h3>
            <p>
              We collect your Ethereum wallet address when you connect your wallet to use our services. 
              This information is necessary for:
            </p>
            <ul>
              <li>Authenticating your identity</li>
              <li>Tracking your verification history</li>
              <li>Processing transactions and signatures</li>
            </ul>

            <h3>Content Data</h3>
            <p>
              We process the content you submit for verification, including:
            </p>
            <ul>
              <li>AI-generated text content</li>
              <li>Verification prompts</li>
              <li>Content hashes for verification</li>
            </ul>

            <h2>How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide AI content verification services</li>
              <li>Maintain your verification history</li>
              <li>Improve our platform and services</li>
              <li>Ensure platform security and prevent fraud</li>
            </ul>

            <h2>Data Storage and Security</h2>
            <p>
              We implement industry-standard security measures to protect your data. Your wallet 
              signatures are used for authentication but we do not store your private keys.
            </p>

            <h2>Third-Party Services</h2>
            <p>
              We use third-party services including AI providers and blockchain networks. These 
              services have their own privacy policies that govern their use of your data.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your verification history</li>
              <li>Request deletion of your data</li>
              <li>Disconnect your wallet at any time</li>
            </ul>

            <h2>Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through our 
              support channels.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
