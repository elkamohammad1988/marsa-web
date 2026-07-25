import { handleFormPost } from "@/lib/api-forms";
import { validateContact } from "@/lib/validation";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleFormPost(request, {
    kind: "contact",
    scope: "contact",
    limit: 5,
    validate: validateContact,
  });
}
