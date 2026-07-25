import { siteConfig, hasRegulatorDetails } from "@/lib/site";

/**
 * Single source of truth for how the business describes its regulatory
 * standing.
 *
 * If (and only if) a real authorisation reference is configured we state it.
 * Otherwise we describe the licensed-partner model — which is what is actually
 * true before an authorisation exists. Claiming an authorisation you do not
 * hold is a regulatory offence in every market this site targets, so the copy
 * is derived, never hand-written per page.
 */
export function regulatoryDisclosure(): string {
  const { legalName, name, regulator } = siteConfig;

  if (hasRegulatorDetails()) {
    return (
      `${legalName} is authorised and regulated by the ${regulator.authority} ` +
      `(reference ${regulator.reference}) for the issuance of electronic money and the ` +
      `provision of payment services. Customer funds are safeguarded in segregated accounts ` +
      `in accordance with applicable safeguarding requirements.`
    );
  }

  return (
    `${legalName} is not a bank. Accounts, IBANs, payments and currency exchange are provided ` +
    `by licensed partner institutions, and customer funds are held in safeguarded accounts at ` +
    `those partners, kept separate from ${name}'s own funds. ${name} provides the platform, ` +
    `onboarding and support layer on top of that regulated infrastructure.`
  );
}

/** Short one-line version for compact placements (badges, trust bands). */
export function regulatorySummary(): string {
  return hasRegulatorDetails()
    ? `Regulated by the ${siteConfig.regulator.authority} · ${siteConfig.regulator.reference}`
    : "Funds safeguarded at licensed partner institutions";
}
