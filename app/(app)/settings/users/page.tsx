import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUsers } from "@/app/actions/admin"
import { Users } from "lucide-react"
import { getTranslations } from 'next-intl/server'
import { UserManagement } from "@/components/settings/user-management"

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await auth()
  const t = await getTranslations('settings')

  if (!session?.user?.id || session.user.role !== 'admin') {
    redirect("/settings")
  }

  const allUsers = await getUsers()

  return (
    <div className="container max-w-5xl mx-auto py-8 md:py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <Users className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              {t('userManagement')}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {t('userManagementDesc')}
            </p>
          </div>
        </div>
      </div>

      <UserManagement users={allUsers} currentUserId={session.user.id} />
    </div>
  )
}
