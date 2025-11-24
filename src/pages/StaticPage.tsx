import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StaticPageProps {
  slug: string;
  onBack: () => void;
}

interface PageData {
  title: string;
  content: string;
  meta_description: string | null;
  updated_at: string;
}

export default function StaticPage({ slug, onBack }: StaticPageProps) {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from('static_pages')
        .select('title, content, meta_description, updated_at')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setNotFound(true);
      } else {
        setPage(data);
      }
    } catch (error) {
      console.error('Error loading page:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (content: string) => {
    let html = content;

    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-gray-900 mb-6">$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    html = html.replace(/^\- (.*$)/gim, '<li class="ml-6">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc space-y-2 my-4">$1</ul>');

    html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-6">$1</li>');

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline">$1</a>');

    html = html.replace(/\n\n/g, '</p><p class="text-gray-700 leading-relaxed mb-4">');
    html = '<p class="text-gray-700 leading-relaxed mb-4">' + html + '</p>';

    return html;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
            <p className="text-gray-600">The page you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <article className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }}
          />

          <div className="mt-12 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
