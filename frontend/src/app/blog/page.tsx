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
        <main className="min-h-screen text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* Exact same header style as Courses */}
                <div className="text-center space-y-3 max-w-2xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
                        Blog
                    </h1>
                    <p className="text-slate-400">
                        Notes on teaching, learning, and what we're building on the platform.
                    </p>
                </div>

                {posts.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800">
                        <p className="text-slate-400 text-lg">
                            No articles have been published yet. Please check back soon.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 lg:gap-8">
                        {posts.map((post) => (
                            <Link
                                key={post.id}
                                href={`/blog/${post.documentId || post.id}`}
                                // Exact same card wrapper style as Courses + overflow-hidden for image
                                className="group flex flex-col justify-between rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden space-y-0 shadow-sm hover:border-slate-700 transition-colors"
                            >
                                {post.CoverImageURL ? (
                                    <img
                                        src={post.CoverImageURL}
                                        alt={post.Title}
                                        className="h-44 w-full object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="h-44 w-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 flex items-center justify-center shrink-0">
                                        <span className="text-2xl font-extrabold text-indigo-500/30">Learnix</span>
                                    </div>
                                )}

                                {/* Same padding as Courses card */}
                                <div className="flex flex-1 flex-col p-6 sm:p-8 space-y-4">
                                    <div className="space-y-3">
                                        <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                                            {post.Title}
                                        </h3>
                                        <p className="text-slate-400 text-sm line-clamp-3">
                                            {blocksExcerpt(post.Body)}
                                        </p>
                                    </div>

                                    {/* Pushing the author to the bottom with margin-top: auto */}
                                    <div className="pt-4 mt-auto border-t border-slate-800">
                                        <AuthorByline author={post.author} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}