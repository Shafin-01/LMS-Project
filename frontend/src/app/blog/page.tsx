import { fetchAPI } from "@/lib/api";
import Link from "next/link";

interface BlogAuthor {
  id: number;
  username: string;
}

interface BlogPost {
  id: number;
  documentId: string;
  Title: string;
  Body: any;
  CoverImageURL?: string | null;
  author?: BlogAuthor | null;
}

interface BlogPostsResponse {
  data: BlogPost[];
}

function blocksExcerpt(body: any, maxLength = 160): string {
  if (!body) return "";
  if (typeof body === "string") return body.slice(0, maxLength);
  if (Array.isArray(body)) {
    const text = body
      .map((item: any) => item.children?.map((c: any) => c.text).join(""))
      .join(" ");
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  }
  return "";
}

export default async function BlogListPage() {
  let posts: BlogPost[] = [];

  try {
    const response = await fetchAPI<BlogPostsResponse>(
      "/blog-posts?populate=*&sort=publishedAt:desc"
    );
    posts = response.data || [];
  } catch (error) {
    console.error("Failed to fetch blog posts:", error);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300">
          ← Back to Home
        </Link>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Blog</h1>
          <p className="text-slate-400 mt-2">সর্বশেষ articles আর updates।</p>
        </div>

        {posts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            এখনো কোনো blog post প্রকাশিত হয়নি।
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.documentId || post.id}`}
                className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
              >
                {post.CoverImageURL && (
                  <img
                    src={post.CoverImageURL}
                    alt={post.Title}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-5 space-y-2">
                  <h2 className="text-lg font-bold text-white">{post.Title}</h2>
                  <p className="text-sm text-slate-400 line-clamp-3">{blocksExcerpt(post.Body)}</p>
                  {post.author?.username && (
                    <p className="text-xs text-slate-500 pt-1">— {post.author.username}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}