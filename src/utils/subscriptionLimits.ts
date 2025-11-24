import { supabase } from '../lib/supabase';

export interface LimitCheckResult {
  allowed: boolean;
  message?: string;
  current?: number;
  limit?: number;
}

export async function checkBookCreationLimit(userId: string): Promise<LimitCheckResult> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('books_limit')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      return { allowed: false, message: 'Profile not found' };
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('books_created')
      .eq('user_id', userId)
      .gte('period_end', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString())
      .maybeSingle();

    const booksCreated = usage?.books_created || 0;

    if (booksCreated >= profile.books_limit) {
      return {
        allowed: false,
        message: `You've reached your monthly limit of ${profile.books_limit} books. Upgrade your plan to create more.`,
        current: booksCreated,
        limit: profile.books_limit,
      };
    }

    return { allowed: true, current: booksCreated, limit: profile.books_limit };
  } catch (error) {
    console.error('Error checking book creation limit:', error);
    return { allowed: false, message: 'Error checking limits' };
  }
}

export async function checkPageCreationLimit(userId: string, bookId: string): Promise<LimitCheckResult> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('pages_per_book_limit')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      return { allowed: false, message: 'Profile not found' };
    }

    const { count } = await supabase
      .from('book_pages')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', bookId);

    const pagesCount = count || 0;

    if (pagesCount >= profile.pages_per_book_limit) {
      return {
        allowed: false,
        message: `This book has reached the maximum of ${profile.pages_per_book_limit} pages. Upgrade your plan for higher limits.`,
        current: pagesCount,
        limit: profile.pages_per_book_limit,
      };
    }

    return { allowed: true, current: pagesCount, limit: profile.pages_per_book_limit };
  } catch (error) {
    console.error('Error checking page creation limit:', error);
    return { allowed: false, message: 'Error checking limits' };
  }
}

export async function checkAICredits(userId: string): Promise<LimitCheckResult> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_credits_remaining')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      return { allowed: false, message: 'Profile not found' };
    }

    if (profile.ai_credits_remaining <= 0) {
      return {
        allowed: false,
        message: 'You have no AI credits remaining this month. Upgrade your plan or wait for renewal.',
        current: 0,
        limit: 0,
      };
    }

    return { allowed: true, current: profile.ai_credits_remaining };
  } catch (error) {
    console.error('Error checking AI credits:', error);
    return { allowed: false, message: 'Error checking credits' };
  }
}

export async function decrementAICredits(userId: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_credits_remaining')
      .eq('id', userId)
      .maybeSingle();

    if (!profile || profile.ai_credits_remaining <= 0) {
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ai_credits_remaining: profile.ai_credits_remaining - 1 })
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error('Error decrementing AI credits:', error);
    return false;
  }
}

export async function incrementBookCount(userId: string): Promise<boolean> {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('id, books_created')
      .eq('user_id', userId)
      .gte('period_end', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString())
      .maybeSingle();

    if (usage) {
      const { error } = await supabase
        .from('usage_tracking')
        .update({ books_created: usage.books_created + 1 })
        .eq('id', usage.id);

      return !error;
    }

    return false;
  } catch (error) {
    console.error('Error incrementing book count:', error);
    return false;
  }
}

export async function incrementPageCount(userId: string): Promise<boolean> {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('id, pages_generated')
      .eq('user_id', userId)
      .gte('period_end', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString())
      .maybeSingle();

    if (usage) {
      const { error } = await supabase
        .from('usage_tracking')
        .update({ pages_generated: usage.pages_generated + 1 })
        .eq('id', usage.id);

      return !error;
    }

    return false;
  } catch (error) {
    console.error('Error incrementing page count:', error);
    return false;
  }
}

export async function incrementImageCount(userId: string): Promise<boolean> {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('id, images_generated')
      .eq('user_id', userId)
      .gte('period_end', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString())
      .maybeSingle();

    if (usage) {
      const { error } = await supabase
        .from('usage_tracking')
        .update({ images_generated: usage.images_generated + 1 })
        .eq('id', usage.id);

      return !error;
    }

    return false;
  } catch (error) {
    console.error('Error incrementing image count:', error);
    return false;
  }
}
