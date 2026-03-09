'use server';

import { db } from '@/db/drizzle';
import { recipes, recipeIngredients, recipeInstructions, favorites, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { eq, and, or, ne, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function getRecipes() {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const allRecipes = await db.query.recipes.findMany({
    where: or(
      eq(recipes.userId, session.user.id),
      eq(recipes.isPublic, true),
    ),
    with: {
      user: {
        columns: { id: true, name: true, username: true },
      },
      ingredients: {
        orderBy: (ingredients, { asc }) => [asc(ingredients.order)],
      },
      instructions: {
        orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
      },
      favorites: {
        where: eq(favorites.userId, session.user.id),
      },
    },
    orderBy: [desc(recipes.createdAt)],
  });

  return allRecipes;
}

export async function getRecipeById(id: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const recipe = await db.query.recipes.findFirst({
    where: and(
      eq(recipes.id, id),
      or(
        eq(recipes.userId, session.user.id),
        eq(recipes.isPublic, true),
      ),
    ),
    with: {
      user: {
        columns: { id: true, name: true, username: true },
      },
      ingredients: {
        orderBy: (ingredients, { asc }) => [asc(ingredients.order)],
      },
      instructions: {
        orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
      },
      favorites: {
        where: eq(favorites.userId, session.user.id),
      },
    },
  });

  return recipe;
}

export async function getFavoriteRecipes() {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const favoriteRecipes = await db.query.favorites.findMany({
    where: eq(favorites.userId, session.user.id),
    with: {
      recipe: {
        with: {
          user: {
            columns: { id: true, name: true, username: true },
          },
          ingredients: {
            orderBy: (ingredients, { asc }) => [asc(ingredients.order)],
          },
          instructions: {
            orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
          },
        },
      },
    },
  });

  return favoriteRecipes.map((fav) => fav.recipe);
}

export async function toggleFavorite(recipeId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const existing = await db.query.favorites.findFirst({
    where: and(eq(favorites.userId, session.user.id), eq(favorites.recipeId, recipeId)),
  });

  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
  } else {
    await db.insert(favorites).values({
      userId: session.user.id,
      recipeId: recipeId,
    });
  }

  revalidatePath('/dashboard', 'page');
  revalidatePath('/recipes', 'page');
  revalidatePath('/favorites', 'page');
  revalidatePath(`/recipes/${recipeId}`, 'page');
}

export async function createRecipe(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Extract recipe data
  const titleDe = formData.get('titleDe') as string;
  const descriptionDe = formData.get('descriptionDe') as string;
  const prepTime = parseInt(formData.get('prepTime') as string) || 0;
  const cookTime = parseInt(formData.get('cookTime') as string) || 0;
  const servings = parseInt(formData.get('servings') as string) || 2;
  const calories = parseInt(formData.get('calories') as string) || 0;
  const category = formData.get('category') as string;
  const imageUrl = formData.get('imageUrl') as string;

  // Create recipe
  const [newRecipe] = await db
    .insert(recipes)
    .values({
      userId: session.user.id,
      titleDe,
      titleEn: titleDe,
      descriptionDe,
      descriptionEn: descriptionDe,
      prepTime,
      cookTime,
      servings,
      calories,
      category,
      imageUrl,
      isPublic: false,
    })
    .returning();

  // Parse and insert ingredients
  const ingredientsJson = formData.get('ingredients') as string;
  if (ingredientsJson) {
    const ingredientsData = JSON.parse(ingredientsJson);
    await db.insert(recipeIngredients).values(
      ingredientsData.map((ing: any, index: number) => ({
        recipeId: newRecipe.id,
        nameDe: ing.name || ing.nameDe,
        nameEn: ing.name || ing.nameDe,
        amount: parseFloat(ing.amount),
        unit: ing.unit,
        order: index,
      }))
    );
  }

  // Parse and insert instructions
  const instructionsJson = formData.get('instructions') as string;
  if (instructionsJson) {
    const instructionsData = JSON.parse(instructionsJson);
    await db.insert(recipeInstructions).values(
      instructionsData.map((inst: any, index: number) => ({
        recipeId: newRecipe.id,
        stepNumber: index + 1,
        instructionDe: inst.instruction || inst.instructionDe,
        instructionEn: inst.instruction || inst.instructionDe,
      }))
    );
  }

  revalidatePath('/recipes', 'page');
  revalidatePath('/dashboard', 'page');

  redirect(`/recipes/${newRecipe.id}`);
}

export async function updateRecipe(recipeId: string, formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const existingRecipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, recipeId), eq(recipes.userId, session.user.id)),
  });

  if (!existingRecipe) {
    throw new Error('Recipe not found or unauthorized');
  }

  // Extract recipe data
  const titleDe = formData.get('titleDe') as string;
  const descriptionDe = formData.get('descriptionDe') as string;
  const prepTime = parseInt(formData.get('prepTime') as string) || 0;
  const cookTime = parseInt(formData.get('cookTime') as string) || 0;
  const servings = parseInt(formData.get('servings') as string) || 2;
  const calories = parseInt(formData.get('calories') as string) || 0;
  const category = formData.get('category') as string;
  const imageUrl = formData.get('imageUrl') as string;

  // Update recipe
  await db
    .update(recipes)
    .set({
      titleDe,
      titleEn: titleDe,
      descriptionDe,
      descriptionEn: descriptionDe,
      prepTime,
      cookTime,
      servings,
      calories,
      category,
      imageUrl,
    })
    .where(eq(recipes.id, recipeId));

  // Delete existing ingredients and instructions
  await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));
  await db.delete(recipeInstructions).where(eq(recipeInstructions.recipeId, recipeId));

  // Parse and insert new ingredients
  const ingredientsJson = formData.get('ingredients') as string;
  if (ingredientsJson) {
    const ingredientsData = JSON.parse(ingredientsJson);
    await db.insert(recipeIngredients).values(
      ingredientsData.map((ing: any, index: number) => ({
        recipeId: recipeId,
        nameDe: ing.name || ing.nameDe,
        nameEn: ing.name || ing.nameDe,
        amount: parseFloat(ing.amount),
        unit: ing.unit,
        order: index,
      }))
    );
  }

  // Parse and insert new instructions
  const instructionsJson = formData.get('instructions') as string;
  if (instructionsJson) {
    const instructionsData = JSON.parse(instructionsJson);
    await db.insert(recipeInstructions).values(
      instructionsData.map((inst: any, index: number) => ({
        recipeId: recipeId,
        stepNumber: index + 1,
        instructionDe: inst.instruction || inst.instructionDe,
        instructionEn: inst.instruction || inst.instructionDe,
      }))
    );
  }

  revalidatePath('/recipes', 'page');
  revalidatePath('/dashboard', 'page');
  revalidatePath(`/recipes/${recipeId}`, 'page');

  redirect(`/recipes/${recipeId}`);
}

export async function deleteRecipe(recipeId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, recipeId), eq(recipes.userId, session.user.id)),
  });

  if (!recipe) {
    throw new Error('Recipe not found or unauthorized');
  }

  // Delete recipe (cascade will handle ingredients, instructions, favorites)
  await db.delete(recipes).where(eq(recipes.id, recipeId));

  revalidatePath('/recipes', 'page');
  revalidatePath('/dashboard', 'page');
  revalidatePath('/favorites', 'page');

  redirect('/recipes');
}

export async function toggleRecipePublic(recipeId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, recipeId), eq(recipes.userId, session.user.id)),
  });

  if (!recipe) {
    throw new Error('Recipe not found or unauthorized');
  }

  await db
    .update(recipes)
    .set({ isPublic: !recipe.isPublic, updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));

  revalidatePath('/recipes', 'page');
  revalidatePath(`/recipes/${recipeId}`, 'page');
  revalidatePath('/dashboard', 'page');
}

export async function forkRecipe(recipeId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const sourceRecipe = await db.query.recipes.findFirst({
    where: and(
      eq(recipes.id, recipeId),
      eq(recipes.isPublic, true),
      ne(recipes.userId, session.user.id),
    ),
    with: {
      ingredients: {
        orderBy: (ingredients, { asc }) => [asc(ingredients.order)],
      },
      instructions: {
        orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
      },
    },
  });

  if (!sourceRecipe) {
    throw new Error('Recipe not found or not public');
  }

  const [newRecipe] = await db
    .insert(recipes)
    .values({
      userId: session.user.id,
      titleDe: sourceRecipe.titleDe,
      titleEn: sourceRecipe.titleEn,
      subtitleDe: sourceRecipe.subtitleDe,
      subtitleEn: sourceRecipe.subtitleEn,
      descriptionDe: sourceRecipe.descriptionDe,
      descriptionEn: sourceRecipe.descriptionEn,
      imageUrl: sourceRecipe.imageUrl,
      prepTime: sourceRecipe.prepTime,
      cookTime: sourceRecipe.cookTime,
      servings: sourceRecipe.servings,
      calories: sourceRecipe.calories,
      category: sourceRecipe.category,
      tags: sourceRecipe.tags,
      isPublic: false,
      forkedFromId: sourceRecipe.id,
    })
    .returning();

  if (sourceRecipe.ingredients.length > 0) {
    await db.insert(recipeIngredients).values(
      sourceRecipe.ingredients.map((ing) => ({
        recipeId: newRecipe.id,
        nameDe: ing.nameDe,
        nameEn: ing.nameEn,
        amount: ing.amount,
        unit: ing.unit,
        order: ing.order,
      }))
    );
  }

  if (sourceRecipe.instructions.length > 0) {
    await db.insert(recipeInstructions).values(
      sourceRecipe.instructions.map((inst) => ({
        recipeId: newRecipe.id,
        stepNumber: inst.stepNumber,
        instructionDe: inst.instructionDe,
        instructionEn: inst.instructionEn,
      }))
    );
  }

  revalidatePath('/recipes', 'page');
  revalidatePath('/dashboard', 'page');

  redirect(`/recipes/${newRecipe.id}`);
}

export async function scrapeRecipe(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
        console.error('Failed to fetch URL:', response.status, response.statusText);
        throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    const html = await response.text();

    // Extract all JSON-LD scripts
    const jsonLdRegex = /<script(?:\s+[^>]*)?\s+type=["']application\/ld\+json["'](?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
    const matches = [...html.matchAll(jsonLdRegex)];

    if (matches.length === 0) {
      console.error('No JSON-LD scripts found in HTML. HTML length:', html.length);
      throw new Error('No recipe data found');
    }

    let recipeData = null;

    for (const match of matches) {
      try {
        const jsonContent = match[1];
        const json = JSON.parse(jsonContent);
        
        // Helper to find recipe in an object or array
        const findRecipe = (data: any): any => {
           if (Array.isArray(data)) {
              for (const item of data) {
                 const result = findRecipe(item);
                 if (result) return result;
              }
           } else if (typeof data === 'object' && data !== null) {
              if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
                 return data;
              }
              if (data['@graph']) {
                 return findRecipe(data['@graph']);
              }
           }
           return null;
        };

        const found = findRecipe(json);
        if (found) {
           recipeData = found;
           break; 
        }

      } catch (e) {
        console.warn('Failed to parse a JSON-LD block', e);
        continue;
      }
    }

    if (!recipeData) {
      throw new Error('No recipe data found in JSON-LD');
    }

    const jsonLd = recipeData;

    // Helper to parse ISO 8601 duration
    const parseDuration = (duration: string) => {
      if (!duration) return 0;
      const match = duration.match(/P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?/);
      if (!match) return 0;
      const days = parseInt(match[1] || '0');
      const hours = parseInt(match[2] || '0');
      const minutes = parseInt(match[3] || '0');
      return days * 24 * 60 + hours * 60 + minutes;
    };
    
    // Helper to clean instructions
    const parseInstructions = (instructions: any[]) => {
      if (!instructions) return [];
      
      let steps: string[] = [];
      
      const extractSteps = (item: any) => {
        if (typeof item === 'string') {
          steps.push(item);
        } else if (item['@type'] === 'HowToStep') {
          steps.push(item.text);
        } else if (item['@type'] === 'HowToSection') {
           if (item.itemListElement) {
               item.itemListElement.forEach(extractSteps);
           }
        }
      };

      if (Array.isArray(instructions)) {
          instructions.forEach(extractSteps);
      } else {
          extractSteps(instructions);
      }
      
      // Clean up common HTML entities or formatting issues
      return steps.map(step => 
          step.replace(/&nbsp;/g, ' ')
              .replace(/<[^>]*>/g, '') // remove HTML tags if any leaks in
              .trim()
      );
    };

    // Helper to normalize ingredients
    const normalizeIngredients = (ingredients: string[]) => {
        if(!ingredients) return [];
        return ingredients.map(ing => {
            // "500 g Hackfleisch"
            const match = ing.match(/^([\d.,]+)\s*([a-zA-ZäöüÄÖÜß]+)\s+(.+)$/);
            if (match) {
                return {
                    amount: parseFloat(match[1].replace(',', '.')),
                    unit: match[2],
                    nameDe: match[3]
                };
            }
            
            // "3 Eier"
            const matchNoUnit = ing.match(/^([\d.,]+)\s+(.+)$/);
            if (matchNoUnit) {
                return {
                    amount: parseFloat(matchNoUnit[1].replace(',', '.')),
                    unit: 'Stk',
                    nameDe: matchNoUnit[2]
                };
            }

            return {
                amount: 0, 
                unit: '', 
                nameDe: ing
            };
        });
    }

    // Map data
    return {
      titleDe: jsonLd.name,
      descriptionDe: jsonLd.description,
      prepTime: parseDuration(jsonLd.prepTime),
      cookTime: parseDuration(jsonLd.cookTime),
      servings: typeof jsonLd.recipeYield === 'string' ? parseInt(jsonLd.recipeYield) : (parseInt(jsonLd.recipeYield) || 2),
      calories: jsonLd.nutrition?.calories ? parseInt(jsonLd.nutrition.calories.toString().replace(/[^0-9]/g, '')) : 0,
      category: Array.isArray(jsonLd.recipeCategory) ? jsonLd.recipeCategory[0] : jsonLd.recipeCategory,
      imageUrl: Array.isArray(jsonLd.image) ? jsonLd.image[0] : (typeof jsonLd.image === 'object' ? jsonLd.image.url : jsonLd.image),
      ingredients: normalizeIngredients(jsonLd.recipeIngredient),
      instructions: parseInstructions(jsonLd.recipeInstructions),
    };

  } catch (error) {
    console.error('Scraping error:', error);
    return null;
  }
}
