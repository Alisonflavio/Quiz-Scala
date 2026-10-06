import AdminBackdrop from "@/components/AdminBackdrop";

export default function DashLayout({ children }: LayoutProps<"/dash">) {
  return (
    <div className="admin-root relative isolate min-h-screen">
      <AdminBackdrop />
      {children}
    </div>
  );
}
