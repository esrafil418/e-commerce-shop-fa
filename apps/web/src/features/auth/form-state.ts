export type AuthFormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: Partial<Record<string, string>>;
};

export const idleAuthState: AuthFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};
