import type { Metadata } from "next";
import { LegalDoc } from "@/components/sections/LegalDoc";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Cookie Policy",
  description:
    "What cookies Marsa uses, why we use them, and how you can control your cookie preferences.",
  path: "/legal/cookies",
});

export default function CookiesPage() {
  return (
    <LegalDoc
      crumb="Cookie Policy"
      title="Cookie Policy"
      updated="July 2026"
      intro="This Cookie Policy explains what cookies are, which cookies Marsa uses, and how you can manage your preferences. It should be read together with our Privacy Policy."
      sections={[
        {
          heading: "What are cookies?",
          paragraphs: [
            "Cookies are small text files placed on your device when you visit a website. They help the site function, remember your choices, and understand how it is used. Similar technologies such as local storage and pixels work in comparable ways.",
          ],
        },
        {
          heading: "Categories of cookies we use",
          bullets: [
            "Strictly necessary — required for the site to work, including security and remembering your cookie choices. These cannot be switched off.",
            "Preferences — remember settings such as your selected currency or language.",
            "Analytics — help us understand aggregate usage so we can improve the site. Set only with your consent.",
            "Marketing — measure the effectiveness of campaigns. Set only with your consent.",
          ],
        },
        {
          heading: "Managing your preferences",
          paragraphs: [
            "When you first visit, our cookie banner lets you accept or reject non-essential cookies. You can change your choice at any time using the “Cookie settings” link in the footer, or by clearing cookies and reloading the site. You can also control cookies through your browser settings.",
          ],
        },
        {
          heading: "Consent",
          paragraphs: [
            "We only set non-essential cookies after you have given consent. Withdrawing consent will not affect the lawfulness of processing carried out before withdrawal.",
          ],
        },
      ]}
    />
  );
}
