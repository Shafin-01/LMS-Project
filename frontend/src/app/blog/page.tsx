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

function AuthorByline({ author }: { author?: BlogAuthor | null }) {
  if (!author?.username) return null;

  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[11px] font-semibold text-indigo-300">
        {author.username[0]?.toUpperCase()}
      </span>
      <span className="text-xs font-medium text-slate-500">{author.username}</span>
    </div>
  );
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

        <div className="space-y-2">
          <span className="inline-block rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            From the team
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Blog</h1>
          <p className="text-slate-400">
            Notes on teaching, learning, and what we're building on the platform.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            No articles have been published yet — check back soon.
          </div>
        ) : (
          // auto-fit lets cards stretch to fill the row instead of leaving
          // empty grid tracks when there are only one or two posts.
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.documentId || post.id}`}
                className="group flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors"
              >
                {post.CoverImageURL ? (
                  <img
                    src={post.CoverImageURL}
                    alt={post.Title}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="h-44 w-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 flex items-center justify-center">
                    <span className="text-2xl font-extrabold text-indigo-500/30">LMS</span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5 space-y-2">
                  <h2 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {post.Title}
                  </h2>
                  <p className="text-sm text-slate-400 line-clamp-3 flex-1">
                    {blocksExcerpt(post.Body)}
                  </p>
                  <AuthorByline author={post.author} />
                  <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-indigo-300 transition-colors group-hover:border-indigo-500/40 group-hover:bg-indigo-500/10">
                    Read article
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}