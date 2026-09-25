export interface PaginationParams {
  page: number
  pageSize: number
  offset: number
  search: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function parsePagination(
  searchParams: URLSearchParams,
  defaultPageSize = 10
): PaginationParams {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const rawSize =
    Number.parseInt(searchParams.get("pageSize") ?? String(defaultPageSize), 10) ||
    defaultPageSize
  const pageSize = Math.min(100, Math.max(5, rawSize))
  const search = (searchParams.get("search") ?? "").trim()
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    search,
  }
}

export function toPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
