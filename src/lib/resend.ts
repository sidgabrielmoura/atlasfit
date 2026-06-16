import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn("WARNING: RESEND_API_KEY is not set in environment variables. Email sending will fail.");
}

export const resend = new Resend(apiKey || "dummy_key");
