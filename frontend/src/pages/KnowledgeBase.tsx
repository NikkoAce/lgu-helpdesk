import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import { Book, ChevronRight, Search, FileText } from 'lucide-react';

interface Article {
  _id: string;
  title: string;
  slug: string;
  category: string;
  tags: string[];
  viewCount: number;
  createdAt: string;
  author?: { name: string };
  content?: string;
}

export const KnowledgeBase: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [search, setSearch] = useState('');

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth<Article[]>('knowledge');
      setArticles(data);
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const handleReadArticle = async (slug: string) => {
    try {
      setLoading(true);
      const articleData = await fetchWithAuth<Article>(`knowledge/${slug}`);
      setSelectedArticle(articleData);
    } catch (err) {
      console.error('Failed to load article details:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-base-300 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold font-heading text-base-content tracking-tight flex items-center gap-2">
            <Book size={24} className="text-primary" />
            Knowledge Base
          </h1>
          <p className="text-sm text-base-content/60 mt-1">Browse helpful articles, guides, and FAQs.</p>
        </div>
        {!selectedArticle && (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" size={16} />
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-sm input-bordered w-full pl-9 bg-base-100"
            />
          </div>
        )}
      </div>

      {selectedArticle ? (
        <div className="space-y-6">
          <button 
            onClick={() => setSelectedArticle(null)}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <ChevronRight size={14} className="rotate-180" /> Back to Articles
          </button>
          
          <div className="bg-base-100 rounded-2xl border border-base-300 p-8 shadow-sm">
            <div className="mb-6 space-y-2">
              <div className="flex gap-2 mb-2">
                <span className="badge badge-primary badge-sm font-bold">{selectedArticle.category}</span>
              </div>
              <h2 className="text-3xl font-extrabold text-base-content">{selectedArticle.title}</h2>
              <div className="text-xs text-base-content/60 flex items-center gap-4 pt-2">
                <span>By {selectedArticle.author?.name || 'System'}</span>
                <span>•</span>
                <span>Published on {new Date(selectedArticle.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>{selectedArticle.viewCount} Views</span>
              </div>
            </div>
            
            <div className="divider"></div>
            
            <div className="prose prose-sm max-w-none text-base-content leading-relaxed whitespace-pre-wrap">
              {selectedArticle.content}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
             <div className="col-span-full py-12 flex justify-center">
               <span className="loading loading-spinner loading-md text-primary"></span>
             </div>
          ) : filteredArticles.length > 0 ? (
            filteredArticles.map(article => (
              <div 
                key={article._id} 
                onClick={() => handleReadArticle(article.slug)}
                className="bg-base-100 rounded-xl border border-base-300 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between group h-40"
              >
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
                    {article.category}
                  </div>
                  <h3 className="text-sm font-bold text-base-content group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                </div>
                
                <div className="flex items-center justify-between mt-4 border-t border-base-200 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-base-content/50">
                    <FileText size={14} />
                    <span>Read Article</span>
                  </div>
                  <ChevronRight size={16} className="text-base-content/30 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-base-content/50 border border-dashed border-base-300 rounded-xl">
              No articles found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
