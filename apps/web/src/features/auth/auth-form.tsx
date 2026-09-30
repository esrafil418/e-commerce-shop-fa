"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  idleAuthState,
  type AuthFormState,
} from "@/features/auth/form-state";
import { authCopy } from "@/features/auth/messages";

type AuthField = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  id?: string;
};

export function AuthForm({
  action,
  submitLabel,
  fields,
  hidden,
  extra,
}: {
  action: (
    state: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
  submitLabel: string;
  fields: AuthField[];
  hidden?: Record<string, string>;
  extra?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, idleAuthState);
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))
        : null}
      {fields.map((field) => {
        const inputId = field.id ?? field.name;
        const errorId = `${inputId}-error`;
        const message = state.fieldErrors[field.name];
        return (
          <div className="flex flex-col gap-2" key={field.name}>
            <Label htmlFor={inputId}>{field.label}</Label>
            <Input
              aria-describedby={message ? errorId : undefined}
              aria-invalid={message ? true : undefined}
              autoComplete={field.autoComplete}
              id={inputId}
              name={field.name}
              onChange={(event) => {
                const nextValue = event.target.value;
                setValues((current) => ({ ...current, [field.name]: nextValue }));
              }}
              type={field.type ?? "text"}
              value={values[field.name] ?? field.defaultValue ?? ""}
            />
            {message ? (
              <p className="text-sm text-destructive" id={errorId}>
                {message}
              </p>
            ) : null}
          </div>
        );
      })}
      {extra}
      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? authCopy.pending : submitLabel}
      </Button>
    </form>
  );
}
