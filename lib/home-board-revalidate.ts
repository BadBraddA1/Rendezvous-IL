import { revalidatePath } from "next/cache"

export function revalidatePublicHomeBoard() {
  revalidatePath("/api/home-board")
}
