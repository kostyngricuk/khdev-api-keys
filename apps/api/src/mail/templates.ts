import type { Platform } from "@khdev/contracts";
import type { MailAttachment, MailMessage } from "./mailer.js";

export const PLATFORM_LABELS: Record<Platform, string> = {
  bitrix: "1С-Битрикс",
  wordpress: "WordPress",
  opencart: "OpenCart",
  shopify: "Shopify",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#1c2024">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:32px">
<tr><td><h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>${body}
<p style="color:#80838d;font-size:12px;margin-top:32px">KHDev Keys</p></td></tr></table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#3e63dd;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">${escapeHtml(label)}</a></p>`;

export function loginCodeEmail(to: string, code: string): MailMessage {
  return {
    to,
    subject: `${code} is your KHDev Keys sign-in code`,
    text: `Your sign-in code is ${code}. It expires in 10 minutes. If you did not try to sign in, ignore this email.`,
    html: layout(
      "Your sign-in code",
      `<p>Enter this code to sign in. It expires in 10 minutes.</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:bold">${code}</p>
<p style="color:#60646c">If you did not try to sign in, ignore this email.</p>`,
    ),
  };
}

type InviteLinks = { loginUrl: string; docsUrl: string; videoUrl: string };

export function inviteEmail(to: string, platforms: Platform[], links: InviteLinks): MailMessage {
  const list = platforms.map((p) => PLATFORM_LABELS[p]).join(", ");
  return {
    to,
    subject: "Your KHDev plugin license is ready",
    text: [
      `Thank you for your purchase (${list}).`,
      "",
      "How to get your license key:",
      `1. Open ${links.loginUrl}`,
      "2. Enter this email address and the 6-digit code we send you.",
      "3. Open API Keys, copy the key and paste it into the plugin settings.",
      "",
      `Documentation: ${links.docsUrl}`,
      `Welcome video: ${links.videoUrl}`,
    ].join("\n"),
    html: layout(
      "Your KHDev plugin license is ready",
      `<p>Thank you for your purchase (${escapeHtml(list)}).</p>
<ol><li>Open the KHDev Keys dashboard.</li><li>Enter this email address and the 6-digit code we send you.</li>
<li>Open <b>API Keys</b>, copy the key and paste it into the plugin settings.</li></ol>
${button(links.loginUrl, "Open KHDev Keys")}
<p>Documentation: <a href="${escapeHtml(links.docsUrl)}">${escapeHtml(links.docsUrl)}</a><br>
Welcome video: <a href="${escapeHtml(links.videoUrl)}">${escapeHtml(links.videoUrl)}</a></p>`,
    ),
  };
}

export function newKeysEmail(to: string, platforms: Platform[], links: InviteLinks): MailMessage {
  const list = platforms.map((p) => PLATFORM_LABELS[p]).join(", ");
  return {
    to,
    subject: "New KHDev license keys were added to your account",
    text: `New license keys (${list}) were added to your account. Sign in at ${links.loginUrl} to copy them.\n\nDocumentation: ${links.docsUrl}`,
    html: layout(
      "New license keys",
      `<p>New license keys (${escapeHtml(list)}) were added to your account.</p>${button(links.loginUrl, "Open API Keys")}
<p>Documentation: <a href="${escapeHtml(links.docsUrl)}">${escapeHtml(links.docsUrl)}</a></p>`,
    ),
  };
}

export function supportTicketEmail(input: {
  to: string;
  from: string;
  ticketId: string;
  topic: string;
  description: string;
  attachments: MailAttachment[];
}): MailMessage {
  return {
    to: input.to,
    replyTo: input.from,
    subject: `[Support] ${input.topic} — ${input.from}`,
    text: `Ticket ${input.ticketId}\nFrom: ${input.from}\nTopic: ${input.topic}\n\n${input.description}`,
    html: layout(
      `Support question: ${input.topic}`,
      `<p><b>From:</b> ${escapeHtml(input.from)}<br><b>Ticket:</b> ${input.ticketId}</p>
<p style="white-space:pre-wrap">${escapeHtml(input.description)}</p>`,
    ),
    attachments: input.attachments,
  };
}
