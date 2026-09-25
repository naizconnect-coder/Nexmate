export interface GraphMeProfile {
  displayName?: string
  mail?: string
  userPrincipalName?: string
  jobTitle?: string
  department?: string
  employeeId?: string
}

export async function fetchGraphMe(
  accessToken: string
): Promise<GraphMeProfile | null> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,jobTitle,department,employeeId",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    )
    if (!response.ok) return null
    return (await response.json()) as GraphMeProfile
  } catch {
    return null
  }
}
