'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { createUserAsAdmin, deleteUser, resetUserPassword } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Trash2, Loader2, Shield, User, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

type UserRow = {
  id: string
  username: string
  name: string | null
  email: string | null
  role: string
  image: string | null
  createdAt: Date | null
}

type State = {
  error?: string
  success?: string
}

const initialState: State = {}

export function UserManagement({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {tCommon('back')}
      </Link>

      <CreateUserSection />

      <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <User className="w-5 h-5 text-amber-400" />
            </div>
            <CardTitle className="text-xl text-zinc-100">{t('userManagement')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400">{t('noOtherUsers')}</p>
              <p className="text-zinc-500 text-sm mt-1">{t('noOtherUsersDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === currentUserId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CreateUserSection() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const [state, action, isPending] = useActionState(createUserAsAdmin, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const prevState = useRef(state)

  useEffect(() => {
    if (state === prevState.current) return
    prevState.current = state
    if (state?.success) {
      toast.success(state.success)
      formRef.current?.reset()
    }
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <UserPlus className="w-5 h-5 text-green-400" />
          </div>
          <CardTitle className="text-xl text-zinc-100">{t('createUser')}</CardTitle>
        </div>
      </CardHeader>
      <form action={action} ref={formRef}>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">{t('name')}</Label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                placeholder="Max Mustermann"
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-300">{t('username')}</Label>
              <Input
                id="username"
                name="username"
                required
                minLength={3}
                placeholder="max"
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">{t('password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100 pr-10 placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-zinc-300">{t('role')}</Label>
              <select
                id="role"
                name="role"
                defaultValue="user"
                className="w-full h-10 px-3 rounded-md bg-zinc-800/50 border border-zinc-700 text-zinc-100 text-sm"
              >
                <option value="user">{t('user')}</option>
                <option value="admin">{t('admin')}</option>
              </select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="px-6 py-4 bg-zinc-900/20">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon('saving')}
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('createUser')}
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function UserRow({ user, isCurrentUser }: { user: UserRow; isCurrentUser: boolean }) {
  const t = useTranslations('settings')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteUser(user.id)
    if (result.success) {
      toast.success(result.success)
    } else if (result.error) {
      toast.error(result.error)
    }
    setDeleting(false)
    setShowDeleteConfirm(false)
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-white font-bold text-sm">
            {(user.name || user.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-100 font-medium">{user.name || user.username}</span>
              {isCurrentUser && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {t('you')}
                </span>
              )}
              {user.role === 'admin' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Shield className="w-3 h-3 inline mr-1" />
                  {t('admin')}
                </span>
              )}
            </div>
            <span className="text-sm text-zinc-500">@{user.username}</span>
          </div>
        </div>
        {!isCurrentUser && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetPassword(!showResetPassword)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <KeyRound className="w-4 h-4" />
            </Button>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">{t('deleteUserConfirm')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('deleteUser')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-zinc-400"
                >
                  {t('no') || 'No'}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      {showResetPassword && !isCurrentUser && (
        <ResetPasswordForm userId={user.id} onDone={() => setShowResetPassword(false)} />
      )}
    </div>
  )
}

function ResetPasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const t = useTranslations('settings')
  const [state, action, isPending] = useActionState(resetUserPassword, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const prevState = useRef(state)

  useEffect(() => {
    if (state === prevState.current) return
    prevState.current = state
    if (state?.success) {
      toast.success(state.success)
      onDone()
    }
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state, onDone])

  return (
    <form action={action} className="flex items-end gap-2 pt-2 border-t border-zinc-700/50">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex-1 space-y-1">
        <Label className="text-xs text-zinc-400">{t('newPassword')}</Label>
        <div className="relative">
          <Input
            name="newPassword"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder="••••••••"
            className="bg-zinc-800/50 border-zinc-700 text-zinc-100 pr-10 h-9 text-sm placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        </div>
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={isPending}
        className="bg-amber-600 hover:bg-amber-700 text-white h-9"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('resetPassword')}
      </Button>
    </form>
  )
}
