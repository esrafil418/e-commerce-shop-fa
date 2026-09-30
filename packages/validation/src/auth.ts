import { z } from "zod";

export const appRoles = [
  "customer",
  "support",
  "catalog_manager",
  "order_manager",
  "admin",
] as const;

export type AppRole = (typeof appRoles)[number];

export const emailSchema = z
  .string()
  .trim()
  .min(1, "ایمیل را وارد کنید")
  .email("ایمیل معتبر نیست");

export const passwordSchema = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ نویسه باشد");

const fullNameSchema = z
  .string()
  .trim()
  .max(80, "نام نباید بیشتر از ۸۰ نویسه باشد");

const phoneSchema = z
  .string()
  .trim()
  .max(20, "شماره تلفن نباید بیشتر از ۲۰ نویسه باشد")
  .regex(/^[0-9+\-\s]*$/u, "شماره تلفن فقط رقم، فاصله، + و خط تیره می‌پذیرد");

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: fullNameSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "رمز عبور را وارد کنید"),
  })
  .strict();

export const passwordResetRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const passwordUpdateSchema = z
  .object({
    password: passwordSchema,
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    fullName: fullNameSchema,
    phone: phoneSchema,
  })
  .strict();

export const grantRoleSchema = z
  .object({
    userId: z.string().uuid("شناسه کاربر معتبر نیست"),
    role: z.enum(appRoles),
  })
  .strict();

export const revokeRoleSchema = grantRoleSchema;

export const checkoutIntentSchema = z
  .object({
    cartId: z.string().uuid("شناسه سبد معتبر نیست"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type GrantRoleInput = z.infer<typeof grantRoleSchema>;
export type CheckoutIntentInput = z.infer<typeof checkoutIntentSchema>;
