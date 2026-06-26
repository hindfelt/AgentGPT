import type { NextApiRequest, NextApiResponse } from "next";
import {
  fetchUnreadEmails,
  summarizeEmails,
  sendSummaryEmail,
} from "../../../services/email-summary-service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Vercel Cron sends the secret as a Bearer token in the Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = process.env.SUMMARY_EMAIL_ADDRESS;
  if (!userEmail) {
    return res.status(500).json({ error: "SUMMARY_EMAIL_ADDRESS not configured" });
  }

  try {
    const emails = await fetchUnreadEmails(userEmail);
    const summary = await summarizeEmails(emails);
    await sendSummaryEmail(userEmail, summary, emails.length);

    return res.status(200).json({
      success: true,
      emailsProcessed: emails.length,
    });
  } catch (error) {
    console.error("[email-summary cron]", error);
    return res.status(500).json({ error: "Failed to generate email summary" });
  }
}
