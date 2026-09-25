"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface PermissionOption {
  id: number
  permKey: string
  name: string
  module: string
  description: string | null
}

interface PermissionsPickerProps {
  permissions: PermissionOption[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
  className?: string
}

export function PermissionsPicker({
  permissions,
  selectedIds,
  onChange,
  disabled = false,
  className,
}: PermissionsPickerProps) {
  const byModule = React.useMemo(() => {
    const map = new Map<string, PermissionOption[]>()
    for (const perm of permissions) {
      const list = map.get(perm.module) ?? []
      list.push(perm)
      map.set(perm.module, list)
    }
    return map
  }, [permissions])

  function handleToggle(permissionId: number, checked: boolean) {
    if (disabled) return
    if (checked) {
      onChange([...new Set([...selectedIds, permissionId])])
      return
    }
    onChange(selectedIds.filter((id) => id !== permissionId))
  }

  return (
    <div className={cn("flex max-h-64 flex-col gap-4 overflow-y-auto", className)}>
      {[...byModule.entries()].map(([module, modulePerms]) => (
        <div key={module} className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {module}
          </p>
          <ul className="flex flex-col gap-2">
            {modulePerms.map((perm) => {
              const checked = selectedIds.includes(perm.id)
              const inputId = `perm-${perm.id}`
              return (
                <li key={perm.id} className="flex items-start gap-3">
                  <Checkbox
                    id={inputId}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(value) =>
                      handleToggle(perm.id, value === true)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={inputId} className="text-sm font-medium">
                      {perm.name}
                    </Label>
                    {perm.description ? (
                      <p className="text-xs text-muted-foreground">
                        {perm.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
