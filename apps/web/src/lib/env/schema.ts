import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || URL.canParse(value),
    "باید یک نشانی مطلق باشد یا خالی بماند",
  );

export const publicEnvSchema = z
  .object({
    NEXT_PUBLIC_SITE_URL: z
      .string()
      .trim()
      .min(1, "NEXT_PUBLIC_SITE_URL is required")
      .refine(
        (value) => URL.canParse(value),
        "NEXT_PUBLIC_SITE_URL must be an absolute URL",
      )
      .refine(
        (value) => !value.endsWith("/"),
        "NEXT_PUBLIC_SITE_URL must not end with a slash",
      ),
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.includes("service_role")) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
        message:
          "This looks like a service-role secret. Put the publishable key in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and the secret in SUPABASE_SECRET_KEY.",
      });
    }
  });

export const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  LOG_LEVEL: z.enum(["info", "warn", "error"]),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function formatEnvError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
}
