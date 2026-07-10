/** ISO timestamp for local echoes. Server-authoritative fields get restamped on push. */
export const nowISO = (): string => new Date().toISOString()
