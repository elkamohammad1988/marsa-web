import { handleFormPost } from "@/lib/api-forms";
import { validateLead } from "@/lib/validation";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleFormPost(request, {
    kind: "lead",
    scope: "leads",
    limit: 8,
    validate: validateLead,
  });
}
