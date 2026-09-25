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
import { Textarea } from "@/components/ui/textarea"
import {
  PermissionsPicker,
  type PermissionOption,
} from "@/components/settings/permissions-picker"
import type { RoleRecord } from "@/lib/db/settings/types"
import { toast } from "sonner"

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  role: RoleRecord | null
  permissions: PermissionOption[]
  onSaved: () => void
}

export function RoleFormDialog({
  open,
  onOpenChange,
  mode,
  role,
  permissions,
  onSaved,
}: RoleFormDialogProps) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [permissionIds, setPermissionIds] = React.useState<number[]>([])
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isSystem = role?.isSystem ?? false

  React.useEffect(() => {
    if (!open) return
    setError(null)
    if (mode === "edit" && role) {
      setName(role.name)
      setDescription(role.description ?? "")
      setPermissionIds(role.permissionIds)
    } else {
      setName("")
      setDescription("")
      setPermissionIds([])
    }
  }, [open, mode, role])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const url =
        mode === "create"
          ? "/api/settings/roles"
          : `/api/settings/roles/${role?.id}`
      const method = mode === "create" ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          permissionIds,
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to save role")
      }

      toast.success(mode === "create" ? "Role created" : "Role updated")
      onSaved()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save role"
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
            {mode === "create" ? "Create role" : "Edit role"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSystem && mode === "edit"}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Permissions</p>
            <PermissionsPicker
              permissions={permissions}
              selectedIds={permissionIds}
              onChange={setPermissionIds}
            />
          </div>
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
