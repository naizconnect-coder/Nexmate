"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { UserRecord } from "@/lib/db/settings/types"
import { toast } from "sonner"

interface RoleOption {
  id: number
  name: string
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  user: UserRecord | null
  roleOptions: RoleOption[]
  canAssignRoles?: boolean
  onSaved: () => void
}

export function UserFormDialog({
  open,
  onOpenChange,
  mode,
  user,
  roleOptions,
  canAssignRoles = false,
  onSaved,
}: UserFormDialogProps) {
  const [entraOid, setEntraOid] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [staffId, setStaffId] = React.useState("")
  const [department, setDepartment] = React.useState("")
  const [jobTitle, setJobTitle] = React.useState("")
  const [roleIds, setRoleIds] = React.useState<number[]>([])
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setError(null)
    if (mode === "edit" && user) {
      setEntraOid(user.entraOid)
      setFullName(user.fullName)
      setEmail(user.email ?? "")
      setStaffId(user.staffId ?? "")
      setDepartment(user.department ?? "")
      setJobTitle(user.jobTitle ?? "")
      setRoleIds(user.roleIds)
    } else {
      setEntraOid("")
      setFullName("")
      setEmail("")
      setStaffId("")
      setDepartment("")
      setJobTitle("")
      setRoleIds([])
    }
  }, [open, mode, user])

  function handleRoleToggle(roleId: number, checked: boolean) {
    if (checked) {
      setRoleIds((prev) => [...new Set([...prev, roleId])])
      return
    }
    setRoleIds((prev) => prev.filter((id) => id !== roleId))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      entraOid: entraOid.trim(),
      fullName: fullName.trim(),
      email: email.trim() || null,
      staffId: staffId.trim() || null,
      department: department.trim() || null,
      jobTitle: jobTitle.trim() || null,
      roleIds,
    }

    try {
      const url =
        mode === "create"
          ? "/api/settings/users"
          : `/api/settings/users/${user?.id}`
      const method = mode === "create" ? "POST" : "PATCH"
      const body =
        mode === "create"
          ? {
              ...payload,
              ...(canAssignRoles ? {} : { roleIds: undefined }),
            }
          : {
              fullName: payload.fullName,
              email: payload.email,
              staffId: payload.staffId,
              department: payload.department,
              jobTitle: payload.jobTitle,
              ...(canAssignRoles ? { roleIds: payload.roleIds } : {}),
            }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to save user")
      }

      toast.success(mode === "create" ? "User created" : "User updated")
      onSaved()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save user"
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add user" : "Edit user"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "create" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-entra-oid">Entra object ID</Label>
              <Input
                id="user-entra-oid"
                value={entraOid}
                onChange={(e) => setEntraOid(e.target.value)}
                required
                placeholder="GUID from Microsoft Entra"
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-full-name">Full name</Label>
            <Input
              id="user-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-staff-id">Staff ID</Label>
              <Input
                id="user-staff-id"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-department">Department</Label>
              <Input
                id="user-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-job-title">Job title</Label>
            <Input
              id="user-job-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          {canAssignRoles ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Roles</p>
              <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                {roleOptions.map((role) => (
                  <li key={role.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`user-role-${role.id}`}
                      checked={roleIds.includes(role.id)}
                      onCheckedChange={(v) =>
                        handleRoleToggle(role.id, v === true)
                      }
                    />
                    <Label htmlFor={`user-role-${role.id}`}>{role.name}</Label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
