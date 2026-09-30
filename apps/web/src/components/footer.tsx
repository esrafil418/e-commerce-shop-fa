import { siteCopy } from "@/messages/fa";

export function Footer() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{siteCopy.name}</p>
        <p>{siteCopy.footerNote}</p>
      </div>
    </footer>
  );
}
