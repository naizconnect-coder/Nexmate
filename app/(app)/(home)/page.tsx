import { PageHeader } from "@/components/layout/page-header"

export default function DashboardPage() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">
      <PageHeader title="Dashboard" description="Welcome to Nexmate." />
    </div>
  )
}
