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
          heading: "Cookies this site sets",
          paragraphs: [
            "Two, both strictly necessary, and neither is set for an ordinary visit. One holds an administrator's session after signing in to the admin area; the other holds a customer's session after signing in to an account. Both are HttpOnly, so no script can read them, restricted to this site with SameSite=Lax, and sent only over HTTPS. Signing out removes them, and they expire on their own.",
            "There are no preference, analytics or marketing cookies, and no third party sets a cookie through this site.",
          ],
        },
        {
          heading: "The demonstration walkthrough",
          paragraphs: [
            "The interactive demo records which steps are reached, so the flow can be improved. It does so without a cookie and without local storage: the identifier it sends is random, created fresh each time the page loads, and gone when the tab closes. It cannot be linked to you, to a previous visit, or to anything else you do here. The demo also honours the browser's Do Not Track setting and sends nothing when it is on.",
          ],
        },
        {
          heading: "Managing cookies",
          paragraphs: [
            "There is no cookie banner on this site, because there is nothing non-essential to consent to. The two cookies above are what makes signing in work, and a site cannot function without them once you have signed in. If you would rather not have them, signing out removes them, and every browser also lets you block or delete cookies for a site from its own settings.",
          ],
        },
      ]}
    />
  );
}
