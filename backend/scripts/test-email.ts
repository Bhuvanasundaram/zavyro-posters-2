import nodemailer from "nodemailer";

const required = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
  "EMAIL_ADMIN_RECIPIENTS",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key} in backend/.env`);
  }
}

const recipients = process.env.EMAIL_ADMIN_RECIPIENTS!
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function main() {
  await transporter.verify();
  console.log("Gmail SMTP connection successful.");

  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: recipients,
    subject: "Zavyro Posters 2.0 — Email Test",
    text: [
      "This is a test email from your Zavyro Posters 2.0 backend.",
      "",
      "Purpose: verify Gmail SMTP configuration.",
      "This test does not create an order or process a payment.",
    ].join("\n"),
  });

  console.log("Test email submitted successfully.");
  console.log("Message ID:", result.messageId);
}

main().catch((error: unknown) => {
  console.error("Email test failed:", error);
  process.exitCode = 1;
});