import HabitsProvider from "@/components/HabitsProvider";
import TasksProvider from "@/components/TasksProvider";
import TabBar from "@/components/TabBar";
import RegisterSW from "@/components/RegisterSW";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HabitsProvider>
      <TasksProvider>
        <main className="shell">{children}</main>
        <TabBar />
        <RegisterSW />
      </TasksProvider>
    </HabitsProvider>
  );
}
