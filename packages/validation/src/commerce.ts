import { z } from "zod";
import { emailSchema } from "./auth";

export const cartQuantitySchema = z.coerce
  .number()
  .int("تعداد باید عدد درست باشد")
  .min(1, "حداقل تعداد ۱ است")
  .max(99, "حداکثر تعداد ۹۹ است");

export const addToCartSchema = z
  .object({
    variantId: z.string().uuid("شناسه گونه معتبر نیست"),
    quantity: cartQuantitySchema,
  })
  .strict();

export const addressSchema = z
  .object({
    label: z.string().trim().max(40, "برچسب نباید بیشتر از ۴۰ نویسه باشد").optional().default(""),
    recipientName: z.string().trim().min(2, "نام گیرنده را وارد کنید").max(80),
    phone: z
      .string()
      .trim()
      .min(8, "تلفن را وارد کنید")
      .max(20)
      .regex(/^[0-9+\-\s]*$/u, "شماره تلفن فقط رقم، فاصله، + و خط تیره می‌پذیرد"),
    province: z.string().trim().min(2, "استان را وارد کنید").max(40),
    city: z.string().trim().min(2, "شهر را وارد کنید").max(40),
    line1: z.string().trim().min(3, "نشانی را وارد کنید").max(200),
    postalCode: z.string().trim().regex(/^\d{10}$/u, "کد پستی باید ۱۰ رقم باشد"),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();

export const guestAddressSchema = addressSchema;

export const trackOrderSchema = z
  .object({
    number: z.string().trim().min(1, "شماره سفارش را وارد کنید").max(40),
    email: emailSchema,
  })
  .strict();

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type GuestAddressInput = z.infer<typeof guestAddressSchema>;
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
