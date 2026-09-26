import { ForgeProvider } from "@/lib/store";
import AppShell from "@/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ForgeProvider>
      <AppShell>{children}</AppShell>
    </ForgeProvider>
  );
}
