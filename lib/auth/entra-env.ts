function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed || trimmed.includes("your-") || trimmed.includes("YOUR_")) {
    throw new Error(
      `Missing or placeholder ${name}. Set it in nexmate/.env.local.`
    )
  }
  return trimmed
}

export function getEntraAuthEnv() {
  const clientId = (
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID ??
    process.env.AUTH_MICROSOFT_ENTRA_ID
  )?.trim()

  const clientSecret = (
    process.env.AUTH_MICROSOFT_ENTRA_SECRET ??
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
  )?.trim()

  const issuer = (
    process.env.AUTH_MICROSOFT_ENTRA_ISSUER ??
    process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
  )?.trim()

  return {
    clientId: required("AUTH_MICROSOFT_ENTRA_ID_ID", clientId),
    clientSecret: required("AUTH_MICROSOFT_ENTRA_SECRET", clientSecret),
    issuer: required("AUTH_MICROSOFT_ENTRA_ISSUER", issuer),
  }
}
