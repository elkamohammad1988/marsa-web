import { siteConfig, hasRegulatorDetails } from "@/lib/site";

/**
 * Single source of truth for how the site describes its regulatory standing.
 *
 * Two cases, and only one of them is live. If a real authorisation reference
 * is configured we state it. Otherwise we say what is actually true of this
 * build: there is no company, no licence and no partner, and the
 * licensed-partner arrangement is described in the conditional, as the model
 * the depicted product *would* need.
 *
 * The fallback used to be written in the present indicative — "customer funds
 * are held in safeguarded accounts at those partners" — which read as a
 * regulatory disclosure from an operating entity, three lines below a badge
 * saying there is no entity. Claiming an authorisation, a partner or a
 * safeguarding arrangement you do not have is a regulatory matter in every
 * market this site depicts, so the tense here is load-bearing.
 */
export function regulatoryDisclosure(): string {
  const { name, regulator } = siteConfig;

  if (hasRegulatorDetails()) {
    return (
      `${name} is authorised and regulated by the ${regulator.authority} ` +
      `(reference ${regulator.reference}) for the issuance of electronic money and the ` +
      `provision of payment services. Customer funds are safeguarded in segregated accounts ` +
      `in accordance with applicable safeguarding requirements.`
    );
  }

  return (
    `${name} is a concept build, not a financial service. There is no company behind it, ` +
    `no licence, no regulator and no partner institution, and it holds no customer money. ` +
    `The product it depicts would run on the licensed-partner model: accounts, IBANs, ` +
    `payments and currency exchange provided by authorised institutions, with customer ` +
    `balances safeguarded at those partners and kept separate from the operator's own funds.`
  );
}
