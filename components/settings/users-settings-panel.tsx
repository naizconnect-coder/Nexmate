"use client"

import * as React from "react"
import { Mail, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { DataTablePagination } from "@/components/settings/data-table-pagination"
import { UserFormDialog } from "@/components/settings/user-form-dialog"
import type { PaginatedResult } from "@/lib/api/pagination"
import type { UserRecord } from "@/lib/db/settings/types"

interface RoleOption {
  id: number
  name: string
}

interface UsersSettingsPanelProps {
  canManageUsers?: boolean
}

export function UsersSettingsPanel({
  canManageUsers = false,
}: UsersSettingsPanelProps) {
  const [data, setData] = React.useState<PaginatedResult<UserRecord> | null>(
    null
  )
  const [roleOptions, setRoleOptions] = React.useState<RoleOption[]>([])
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [searchInput, setSearchInput] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create")
  const [editingUser, setEditingUser] = React.useState<UserRecord | null>(null)
  const [sendingTestEmailUserId, setSendingTestEmailUserId] = React.useState<
    number | null
  >(null)

  const pageSize = 10

  const loadUsers = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (search) params.set("search", search)

      const res = await fetch(`/api/settings/users?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? "Failed to load users")
      }
      const json = (await res.json()) as PaginatedResult<UserRecord>
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  const loadMeta = React.useCallback(async () => {
    if (!canManageUsers) return
    const res = await fetch("/api/settings/permissions", { cache: "no-store" })
    if (!res.ok) return
    const json = (await res.json()) as { roles: RoleOption[] }
    setRoleOptions(json.roles)
  }, [canManageUsers])

  React.useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  React.useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function openCreate() {
    setDialogMode("create")
    setEditingUser(null)
    setDialogOpen(true)
  }

  function openEdit(user: UserRecord) {
    setDialogMode("edit")
    setEditingUser(user)
    setDialogOpen(true)
  }

  async function handleDelete(user: UserRecord) {
    if (!window.confirm(`Remove ${user.fullName}? This soft-deletes the user.`)) {
      return
    }
    const res = await fetch(`/api/settings/users/${user.id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const body = (await res.json()) as { error?: string }
      window.alert(body.error ?? "Failed to delete user")
      return
    }
    void loadUsers()
  }

  async function handleSendTestEmail(user: UserRecord) {
    if (!user.email?.trim()) {
      window.alert(`${user.fullName} does not have an email address.`)
      return
    }

    setSendingTestEmailUserId(user.id)
    try {
      const res = await fetch(
        `/api/settings/users/${user.id}/send-test-email`,
        { method: "POST" }
      )
      const body = (await res.json()) as { error?: string; email?: string }
      if (!res.ok) {
        window.alert(body.error ?? "Failed to send test email")
        return
      }
      window.alert(`Test email sent to ${body.email ?? user.email}.`)
    } catch {
      window.alert("Failed to send test email")
    } finally {
      setSendingTestEmailUserId(null)
    }
  }

  return (
    <>
      <Card className="w-full min-w-0 rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Users</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-2"
            >
              <div className="relative min-w-0 flex-1 sm:w-56">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search users…"
                  className="pl-8"
                  aria-label="Search users"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
            {canManageUsers ? (
              <Button type="button" onClick={openCreate} className="rounded-full">
                <Plus aria-hidden="true" />
                Add user
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users…</p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !error && data?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users found. Sign in with Microsoft or add a user manually.
            </p>
          ) : null}
          {data && data.items.length > 0 ? (
            <>
              <div className="w-full overflow-x-auto">
              <Table className="min-w-[40rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Roles</TableHead>
                    {canManageUsers ? (
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.fullName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.department ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roleNames.length > 0 ? (
                            user.roleNames.map((name) => (
                              <Badge key={name} variant="secondary">
                                {name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      {canManageUsers ? (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${user.fullName}`}
                              >
                                <MoreHorizontal
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(user)}>
                                <Pencil aria-hidden="true" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={sendingTestEmailUserId === user.id}
                                onClick={() => void handleSendTestEmail(user)}
                              >
                                <Mail aria-hidden="true" />
                                {sendingTestEmailUserId === user.id
                                  ? "Sending test email…"
                                  : "Send test email"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => void handleDelete(user)}
                              >
                                <Trash2 aria-hidden="true" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <DataTablePagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={data.pageSize}
                onPageChange={setPage}
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      {canManageUsers ? (
        <UserFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          user={editingUser}
          roleOptions={roleOptions}
          canAssignRoles={canManageUsers}
          onSaved={() => void loadUsers()}
        />
      ) : null}
    </>
  )
}
