import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const createWorkspace = async (formData: FormData) => {
    "use server"
    const name = formData.get("name") as string
    const session = await auth()
    if (!session?.user?.id || !name.trim()) return

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER"
          }
        }
      }
    })

    redirect(`/${workspace.id}`)
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Velocity</CardTitle>
          <CardDescription>
            Let's create your first workspace to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createWorkspace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input id="name" name="name" required placeholder="e.g. Acme Corp" />
            </div>
            <Button type="submit" className="w-full">
              Create Workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
