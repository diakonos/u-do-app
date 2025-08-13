import { convexAdapter } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { emailOTP } from "better-auth/plugins";
import { betterAuthComponent } from "../convex/auth";
import { type ActionCtx } from "../convex/_generated/server";
import { internal } from "../convex/_generated/api";

// You'll want to replace this with an environment variable
const siteUrl = process.env.BETTER_AUTH_URL!;

export const createAuth = (ctx: ActionCtx) =>
  // Configure your Better Auth instance here
  betterAuth({
    trustedOrigins: [siteUrl, "udo://"],
    database: convexAdapter(ctx, betterAuthComponent),

    // Simple non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      // The Convex plugin is required
      convex(),
      // The cross domain plugin is required for client side frameworks
      crossDomain({
        siteUrl,
      }),
      // Email OTP plugin using Resend to deliver OTPs
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          console.log(`Send OTP ${otp} to ${email}`);
          const from = process.env.RESEND_FROM || "U-Do <delivered@resend.dev>";
          const subject =
            type === "sign-in"
              ? "Your U-Do sign-in code"
              : type === "email-verification"
                ? "Verify your U-Do email"
                : "Reset your U-Do password";
          const html = `
            <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
              <h2 style="margin:0 0 12px;">${subject}</h2>
              <p style="margin:0 0 8px;">Use this one-time code:</p>
              <p style="font-size:24px;font-weight:700;letter-spacing:4px;margin:8px 0;">${otp}</p>
              <p style="color:#666;margin:8px 0;">This code expires soon. If you didn't request it, you can ignore this email.</p>
            </div>
          `;
          await ctx.runMutation(internal.sendEmails.sendOtpEmail, {
            from,
            to: email,
            subject,
            html,
          });
        },
      }),
      expo(),
    ],
  });
