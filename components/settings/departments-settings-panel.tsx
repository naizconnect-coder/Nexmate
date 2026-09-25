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
import { DataTablePagination } from "@/components/settings/data-table-pagination"
import { DepartmentFormDialog } from "@/components/settings/department-form-dialog"
import type { PaginatedResult } from "@/lib/api/pagination"
import type { DepartmentSettingsRecord } from "@/lib/db/settings/types"

interface DepartmentsSettingsPanelProps {
  canManageDepartments?: boolean
}

export function DepartmentsSettingsPanel({
  canManageDepartments = false,
}: DepartmentsSettingsPanelProps) {
  const [data, setData] =
    React.useState<PaginatedResult<DepartmentSettingsRecord> | null>(null)
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [searchInput, setSearchInput] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create")
  const [editingDepartment, setEditingDepartment] =
    React.useState<DepartmentSettingsRecord | null>(null)

  const pageSize = 10

  const loadDepartments = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (search) params.set("search", search)

      const res = await fetch(`/api/settings/departments?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? "Failed to load departments")
      }
      const json = (await res.json()) as PaginatedResult<DepartmentSettingsRecord>
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load departments")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  React.useEffect(() => {
    void loadDepartments()
  }, [loadDepartments])

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function openCreate() {
    setDialogMode("create")
    setEditingDepartment(null)
    setDialogOpen(true)
  }

  function openEdit(department: DepartmentSettingsRecord) {
    setDialogMode("edit")
    setEditingDepartment(department)
    setDialogOpen(true)
  }

  async function handleDelete(department: DepartmentSettingsRecord) {
    if (!window.confirm(`Delete department "${department.name}"?`)) return

    const res = await fetch(`/api/settings/departments/${department.id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const body = (await res.json()) as { error?: string }
      window.alert(body.error ?? "Failed to delete department")
      return
    }
    void loadDepartments()
  }

  return (
    <>
      <Card className="w-full min-w-0 rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Departments</CardTitle>
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
                  placeholder="Search departments…"
                  className="pl-8"
                  aria-label="Search departments"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
            {canManageDepartments ? (
              <Button type="button" onClick={openCreate} className="rounded-full">
                <Plus aria-hidden="true" />
                Add department
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading departments…</p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !error && data?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No departments found. Add a department to assign to users.
            </p>
          ) : null}
          {data && data.items.length > 0 ? (
            <>
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[36rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Users</TableHead>
                      {canManageDepartments ? (
                        <TableHead className="w-12">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((department) => (
                      <TableRow key={department.id}>
                        <TableCell className="font-medium">
                          {department.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {department.userCount}
                        </TableCell>
                        {canManageDepartments ? (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Actions for ${department.name}`}
                                >
                                  <MoreHorizontal
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEdit(department)}
                                >
                                  <Pencil aria-hidden="true" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => void handleDelete(department)}
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

      {canManageDepartments ? (
        <DepartmentFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          department={editingDepartment}
          onSaved={() => void loadDepartments()}
        />
      ) : null}
    </>
  )
}
