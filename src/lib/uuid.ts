import { v4 } from 'uuid'

/** Client-generated UUID — a row's identity before it ever reaches the server. */
export const newId = (): string => v4()
