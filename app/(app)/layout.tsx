import HabitsProvider from "@/components/HabitsProvider";
import TabBar from "@/components/TabBar";
import RegisterSW from "@/components/RegisterSW";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HabitsProvider>
      <main className="shell">{children}</main>
      <TabBar />
      <RegisterSW />
    </HabitsProvider>
  );
}
