import { useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StaticPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  display_location: string[];
  is_published: boolean;
  display_order: number;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

interface StaticPagesManagerProps {
  pages: StaticPage[];
  onUpdate: () => void;
}

export default function StaticPagesManager({ pages, onUpdate }: StaticPagesManagerProps) {
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    display_location: [] as string[],
    is_published: false,
    display_order: 0,
    meta_description: '',
  });

  const handleEdit = (page: StaticPage) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content,
      display_location: page.display_location,
      is_published: page.is_published,
      display_order: page.display_order,
      meta_description: page.meta_description || '',
    });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({
      title: '',
      slug: '',
      content: '',
      display_location: [],
      is_published: false,
      display_order: pages.length,
      meta_description: '',
    });
  };

  const handleCancel = () => {
    setEditingPage(null);
    setIsCreating(false);
    setFormData({
      title: '',
      slug: '',
      content: '',
      display_location: [],
      is_published: false,
      display_order: 0,
      meta_description: '',
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(formData.slug)) {
        alert('Slug must be lowercase with hyphens only (e.g., terms-of-service)');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingPage) {
        const { error } = await supabase
          .from('static_pages')
          .update({
            title: formData.title,
            slug: formData.slug,
            content: formData.content,
            display_location: formData.display_location,
            is_published: formData.is_published,
            display_order: formData.display_order,
            meta_description: formData.meta_description || null,
          })
          .eq('id', editingPage.id);

        if (error) throw error;
        alert('Page updated successfully!');
      } else {
        const { error } = await supabase
          .from('static_pages')
          .insert([{
            title: formData.title,
            slug: formData.slug,
            content: formData.content,
            display_location: formData.display_location,
            is_published: formData.is_published,
            display_order: formData.display_order,
            meta_description: formData.meta_description || null,
            created_by: user.id,
          }]);

        if (error) throw error;
        alert('Page created successfully!');
      }

      handleCancel();
      onUpdate();
    } catch (error: any) {
      console.error('Error saving page:', error);
      alert(`Failed to save page: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('static_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;
      alert('Page deleted successfully!');
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting page:', error);
      alert(`Failed to delete page: ${error.message}`);
    }
  };

  const toggleLocation = (location: string) => {
    setFormData(prev => ({
      ...prev,
      display_location: prev.display_location.includes(location)
        ? prev.display_location.filter(l => l !== location)
        : [...prev.display_location, location]
    }));
  };

  if (isCreating || editingPage) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingPage ? 'Edit Page' : 'Create New Page'}
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Terms of Service"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., terms-of-service"
            />
            <p className="mt-1 text-xs text-gray-500">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content (Markdown supported)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="# Page Title&#10;&#10;Your content here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Location
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.display_location.includes('footer')}
                  onChange={() => toggleLocation('footer')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Footer</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.display_location.includes('header')}
                  onChange={() => toggleLocation('header')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Header</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 pt-7">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Published</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Description (SEO)
            </label>
            <textarea
              value={formData.meta_description}
              onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description for search engines"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !formData.title || !formData.slug}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Page'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Static Pages</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Page
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Display
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {page.title}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                  /{page.slug}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {page.display_location.length > 0 ? page.display_location.join(', ') : 'None'}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                    page.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {page.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {page.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {page.display_order}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(page)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No static pages yet. Create your first page!</p>
          </div>
        )}
      </div>
    </div>
  );
}
