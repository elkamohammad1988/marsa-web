import type { Metadata } from "next";
import { LegalDoc } from "@/components/sections/LegalDoc";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { regulatoryDisclosure } from "@/lib/legal";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "The terms that govern your use of the Marsa website and services, including eligibility, acceptable use, and liability.",
  path: "/legal/terms",
});

export default function TermsPage() {
  return (
    <LegalDoc
      crumb="Terms of Service"
      title="Terms of Service"
      updated="July 2026"
      intro={`${siteConfig.name} is a concept build, so there is no service to contract with and nothing below is in force. These are the terms a product of this kind would have to publish, written out in full because deciding what they would have to say is part of designing it.`}
      sections={[
        {
          heading: "About us",
          paragraphs: [
            regulatoryDisclosure(),
          ],
        },
        {
          heading: "Eligibility",
          paragraphs: [
            "To open an account you must be at least 18 years old and able to enter into a binding contract. Accounts are subject to successful identity verification and our acceptance policies. We may decline or close accounts where required by law or our risk policies.",
          ],
        },
        {
          heading: "Your account",
          bullets: [
            "You are responsible for keeping your credentials secure and for all activity on your account.",
            "You must provide accurate information and keep it up to date.",
            "You must notify us promptly of any unauthorised access or suspected fraud.",
          ],
        },
        {
          heading: "Acceptable use",
          paragraphs: [
            "You agree not to use our services for any unlawful, fraudulent, or prohibited activity, including money laundering, terrorist financing, or breaching sanctions. We may suspend or terminate access where we reasonably believe these terms have been breached.",
          ],
        },
        {
          heading: "Fees",
          paragraphs: [
            "Fees applicable to your account and transactions are set out on our Pricing page and in your account agreement. We will give you advance notice of any changes as required by law.",
          ],
        },
        {
          heading: "Safeguarding of funds",
          paragraphs: [
            "Customer funds would be safeguarded in segregated accounts at licensed partner institutions, in accordance with applicable safeguarding requirements. Electronic money is not a deposit and is not covered by deposit-guarantee schemes — a distinction any product making this comparison should state rather than imply away.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "We provide our services with reasonable care and skill but do not exclude liability that cannot be excluded by law. To the extent permitted, we are not liable for indirect or consequential losses, or for losses arising from events outside our reasonable control.",
          ],
        },
        {
          heading: "Changes and termination",
          paragraphs: [
            "We may update these terms from time to time and will notify you of material changes. You may close your account at any time, subject to settlement of outstanding obligations.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: [
            siteConfig.email.support
              ? `Questions about these terms can be sent to ${siteConfig.email.support}.`
              : "These terms are an illustration of what a real product would need to publish. There is no service to contract with and no operator to contact.",
          ],
        },
      ]}
    />
  );
}
