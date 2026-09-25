import type { AppContext } from "../context.js";
import type { MailMessage } from "./mailer.js";

/**
 * Sends a notification after the data is already committed. A mail outage must not turn a completed
 * action into an error (callers would retry and duplicate it), so failures are logged instead.
 */
export async function sendAfterCommit(ctx: AppContext, message: MailMessage): Promise<boolean> {
  try {
    await ctx.mailer.send(message);
    return true;
  } catch (error) {
    ctx.log.error({ err: error, to: message.to, subject: message.subject }, "Email delivery failed");
    return false;
  }
}
