import { fetchAPI } from "@/lib/api";
import BackButton from "@/components/BackButton";

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

interface BlogPostResponse {
  data: BlogPost;
}

function blocksToParagraphs(body: any): string[] {
  if (!body) return [];
  if (typeof body === "string") return [body];
  if (Array.isArray(body)) {
    return body.map((item: any) => item.children?.map((c: any) => c.text).join("") || "");
  }
  return [];
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const postId = resolvedParams.id;

  let post: BlogPost | null = null;

  try {
    const response = await fetchAPI<BlogPostResponse>(`/blog-posts/${postId}?populate=*`);
    post = response.data;
  } catch (error) {
    console.error("Failed to fetch blog post:", error);
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <h1 className="text-2xl font-bold">Blog post not found</h1>
        <BackButton href="/blog" label="Back to Blog" />
      </div>
    );
  }

  const paragraphs = blocksToParagraphs(post.Body);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">

        <BackButton href="/blog" label="Back to Blog" />

        {post.CoverImageURL && (
          <img
            src={post.CoverImageURL}
            alt={post.Title}
            className="w-full max-h-96 object-cover rounded-2xl border border-slate-800"
          />
        )}

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{post.Title}</h1>
          {post.author?.username && (
            <p className="text-sm text-slate-500">By {post.author.username}</p>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
          {paragraphs.length === 0 ? (
            <p className="text-slate-400">No content.</p>
          ) : (
            paragraphs.map((para, idx) => (
              <p key={idx} className="text-slate-300 text-base leading-relaxed">
                {para}
              </p>
            ))
          )}
        </div>
      </div>
    </main>
  );
}