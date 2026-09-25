"use client"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AppErrorPage({ reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        An unexpected error occurred. Try again, or go back to the home page.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  )
}
