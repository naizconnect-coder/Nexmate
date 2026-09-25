"use client"

import * as React from "react"
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react"
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
import { RoleFormDialog } from "@/components/settings/role-form-dialog"
import type { PermissionOption } from "@/components/settings/permissions-picker"
import type { PaginatedResult } from "@/lib/api/pagination"
import type { RoleRecord } from "@/lib/db/settings/types"

interface RolesSettingsPanelProps {
  canManageRoles?: boolean
}

export function RolesSettingsPanel({
  canManageRoles = false,
}: RolesSettingsPanelProps) {
  const [data, setData] = React.useState<PaginatedResult<RoleRecord> | null>(
    null
  )
  const [permissions, setPermissions] = React.useState<PermissionOption[]>([])
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [searchInput, setSearchInput] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create")
  const [editingRole, setEditingRole] = React.useState<RoleRecord | null>(null)

  const pageSize = 10

  const loadRoles = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (search) params.set("search", search)

      const res = await fetch(`/api/settings/roles?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? "Failed to load roles")
      }
      const json = (await res.json()) as PaginatedResult<RoleRecord>
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  const loadMeta = React.useCallback(async () => {
    if (!canManageRoles) return
    const res = await fetch("/api/settings/permissions", { cache: "no-store" })
    if (!res.ok) return
    const json = (await res.json()) as { permissions: PermissionOption[] }
    setPermissions(json.permissions)
  }, [canManageRoles])

  React.useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  React.useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function openCreate() {
    setDialogMode("create")
    setEditingRole(null)
    setDialogOpen(true)
  }

  function openEdit(role: RoleRecord) {
    setDialogMode("edit")
    setEditingRole(role)
    setDialogOpen(true)
  }

  async function handleDelete(role: RoleRecord) {
    if (role.isSystem) {
      window.alert("System roles cannot be deleted.")
      return
    }
    if (!window.confirm(`Delete role "${role.name}"?`)) return

    const res = await fetch(`/api/settings/roles/${role.id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const body = (await res.json()) as { error?: string }
      window.alert(body.error ?? "Failed to delete role")
      return
    }
    void loadRoles()
  }

  return (
    <>
      <Card className="w-full min-w-0 rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Roles</CardTitle>
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
                  placeholder="Search roles…"
                  className="pl-8"
                  aria-label="Search roles"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
            {canManageRoles ? (
              <Button type="button" onClick={openCreate} className="rounded-full">
                <Plus aria-hidden="true" />
                Create role
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading roles…</p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !error && data?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles found.</p>
          ) : null}
          {data && data.items.length > 0 ? (
            <>
              <div className="w-full overflow-x-auto">
              <Table className="min-w-[40rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Users</TableHead>
                    {canManageRoles ? (
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {role.name}
                          {role.isSystem ? (
                            <Badge variant="outline">System</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {role.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.permissionIds.length}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.userCount}
                      </TableCell>
                      {canManageRoles ? (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${role.name}`}
                              >
                                <MoreHorizontal
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(role)}>
                                <Pencil aria-hidden="true" />
                                Edit permissions
                              </DropdownMenuItem>
                              {!role.isSystem ? (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => void handleDelete(role)}
                                >
                                  <Trash2 aria-hidden="true" />
                                  Delete
                                </DropdownMenuItem>
                              ) : null}
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

      {canManageRoles ? (
        <RoleFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          role={editingRole}
          permissions={permissions}
          onSaved={() => void loadRoles()}
        />
      ) : null}
    </>
  )
}
