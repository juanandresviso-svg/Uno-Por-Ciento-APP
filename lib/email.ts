import { Resend } from "resend";

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY");
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Uno por Ciento <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message);
}
