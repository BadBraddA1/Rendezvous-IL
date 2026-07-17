import { revalidatePath } from "next/cache"

/** Bust CDN/edge cache so apps pick up admin schedule edits quickly. */
export function revalidatePublicSchedule() {
  revalidatePath("/api/schedule")
}
