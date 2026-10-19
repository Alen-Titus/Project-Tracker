import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

export default async function IndexPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  // Find the user's first workspace
  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true }
  })

  if (workspaceMember) {
    redirect(`/${workspaceMember.workspaceId}`)
  } else {
    redirect("/onboarding")
  }
}
