import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Shared Resend instance for this Convex project
export const resend: Resend = new Resend(components.resend, {
  // Set to false to allow sending to arbitrary addresses
  // Ensure RESEND_API_KEY is set in your Convex deployment
  testMode: false,
});

export const sendOtpEmail = internalMutation({
  args: {
    from: v.string(),
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    await resend.sendEmail(ctx, {
      from: args.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
  },
});
