import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "ایمیل را وارد کنید")
  .email("ایمیل معتبر نیست");

export const passwordSchema = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ نویسه باشد");
