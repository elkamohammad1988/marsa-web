import type { Metadata } from "next";
import { LegalDoc } from "@/components/sections/LegalDoc";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How Marsa collects, uses, and protects your personal data, and the rights you have under the GDPR and UK GDPR.",
  path: "/legal/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalDoc
      crumb="Privacy Policy"
      title="Privacy Policy"
      updated="July 2026"
      intro={`This Privacy Policy explains how ${siteConfig.legalName} ("Marsa", "we", "us") collects, uses, shares, and safeguards your personal data when you use our website and services. We act as a data controller under the EU General Data Protection Regulation (GDPR) and the UK GDPR.`}
      sections={[
        {
          heading: "Data we collect",
          paragraphs: ["Depending on how you interact with us, we may collect:"],
          bullets: [
            "Identity and contact data — name, email address, country of residence, and, for businesses, company details you provide when opening an account or contacting us.",
            "Verification data — identity documents and information required to meet our Know-Your-Customer (KYC) and anti-money-laundering (AML) obligations.",
            "Usage and device data — pages viewed, approximate location derived from IP address, browser type, and interactions, collected via cookies and similar technologies.",
            "Communications — the content of messages you send us through forms, email, or support channels.",
          ],
        },
        {
          heading: "How we use your data",
          bullets: [
            "To create and administer your account and provide our services.",
            "To meet legal and regulatory obligations, including identity verification and fraud prevention.",
            "To respond to your enquiries and provide customer support.",
            "To send service updates and, where you have consented, marketing communications you can opt out of at any time.",
            "To improve, secure, and analyse the performance of our website and products.",
          ],
        },
        {
          heading: "Legal bases for processing",
          paragraphs: [
            "We rely on one or more of the following legal bases: performance of a contract with you; compliance with a legal obligation; your consent (for example, for marketing and non-essential cookies); and our legitimate interests in operating and improving a secure service, balanced against your rights.",
          ],
        },
        {
          heading: "Sharing your data",
          paragraphs: [
            "We share personal data only where necessary: with regulated banking and payment partners who safeguard funds and process transactions; with identity-verification, fraud, and analytics providers acting as our processors; and with authorities where required by law. We never sell your personal data.",
          ],
        },
        {
          heading: "International transfers",
          paragraphs: [
            "Where data is transferred outside the EEA or UK, we rely on appropriate safeguards such as adequacy decisions or Standard Contractual Clauses to ensure your data receives an equivalent level of protection.",
          ],
        },
        {
          heading: "Data retention",
          paragraphs: [
            "We keep personal data only as long as necessary for the purposes described above and to meet legal, accounting, or reporting requirements. Records relating to regulated financial activity are typically retained for at least five years after the end of our relationship.",
          ],
        },
        {
          heading: "Your rights",
          paragraphs: [
            "Subject to conditions, you have the right to access, correct, delete, restrict, or object to the processing of your personal data, and the right to data portability. Where processing is based on consent, you can withdraw it at any time. You also have the right to lodge a complaint with your local supervisory authority.",
          ],
        },
        {
          heading: "Contact us",
          paragraphs: [
            siteConfig.email.support
              ? `To exercise your rights or ask about this policy, contact our Data Protection team at ${siteConfig.email.support}.`
              : // Was "This build collects no personal data, so there is
                // nothing to exercise a right against." Registration stores an
                // email address, so there now is — and stating the absent
                // erasure path is the honest half of saying so, because a
                // rights section that lists deletion without one is the same
                // false promise in a longer form.
                "Creating an account on this build stores your email address and, if you give one, your name. The marketing forms validate your input and discard it. There is no Data Protection contact to name and no erasure tooling built, so the only way to remove an account today is to ask the maintainer through GitHub.",
          ],
        },
      ]}
    />
  );
}
