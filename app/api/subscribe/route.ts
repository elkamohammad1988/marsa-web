import { handleFormPost } from "@/lib/api-forms";
import { validateSubscribe } from "@/lib/validation";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handleFormPost(request, {
    kind: "subscribe",
    scope: "subscribe",
    limit: 5,
    validate: validateSubscribe,
  });
}
