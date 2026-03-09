import { Plus, Globe } from 'lucide-react';
import { getRecipes } from '@/app/actions/recipes';
import { auth } from '@/lib/auth';
import RecipeCard from '@/components/recipes/recipe-card';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function RecipesPage() {
  const locale = 'en' as 'de' | 'en';
  const t = await getTranslations('recipes');
  const tSettings = await getTranslations('settings');
  const tDashboard = await getTranslations('dashboard');
  const session = await auth();
  const currentUserId = session?.user?.id ?? '';

  const allRecipes = await getRecipes();
  const myRecipes = allRecipes.filter((r) => r.userId === currentUserId);
  const communityRecipes = allRecipes.filter((r) => r.userId !== currentUserId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">{t('title')}</h1>
          <p className="text-zinc-400 text-lg">{t('subtitle')}</p>
        </div>
        <Link
          href="/recipes/new"
          className="flex items-center gap-2 px-5 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-zinc-200 transition-all hover:-translate-y-0.5 shadow-lg shadow-white/5"
        >
          <Plus size={18} /> {t('newRecipe')}
        </Link>
      </div>

      <div className="h-px bg-white/10" />

      {myRecipes.length > 0 && (
        <div className="space-y-4">
          {communityRecipes.length > 0 && (
            <h2 className="text-xl font-bold text-white">{tSettings('myRecipes')}</h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {myRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} locale={locale} currentUserId={currentUserId} />
            ))}
          </div>
        </div>
      )}

      {communityRecipes.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Globe size={20} className="text-green-400" />
            <h2 className="text-xl font-bold text-white">{tSettings('communityRecipes')}</h2>
          </div>
          <div className="h-px bg-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {communityRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} locale={locale} currentUserId={currentUserId} />
            ))}
          </div>
        </div>
      )}

      {myRecipes.length === 0 && communityRecipes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center border-4 border-dashed border-white/10 rounded-3xl bg-zinc-900/50 backdrop-blur-md">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10">
            <Plus size={32} className="text-zinc-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">{tDashboard('kitchenEmpty')}</h2>
          <p className="text-zinc-400 max-w-md mb-8 text-lg">
            {tDashboard('startJourney')}
          </p>
          <Link
            href="/recipes/new"
            className="px-6 py-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors font-medium"
          >
            {tDashboard('createFirstRecipe')}
          </Link>
        </div>
      )}
    </div>
  );
}
