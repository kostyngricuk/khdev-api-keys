import nodemailer from "nodemailer";
import type { Config } from "../config.js";

export type MailAttachment = {
  filename: string;
  path: string;
  contentType?: string;
};

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: MailAttachment[];
};

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export function createSmtpMailer(config: Config): Mailer {
  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return {
    async send(message) {
      await transport.sendMail({ from: config.mailFrom, ...message });
    },
  };
}

export type MemoryMailer = Mailer & { sent: MailMessage[]; clear(): void };

/** Keeps messages in memory; used by tests. */
export function createMemoryMailer(): MemoryMailer {
  const sent: MailMessage[] = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
    },
    clear() {
      sent.length = 0;
    },
  };
}
