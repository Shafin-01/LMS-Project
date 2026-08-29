"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();

    // Only accept an internal path as the post-login destination, so a
    // crafted "redirect" query value can never send the user off-site.
    const rawRedirect = searchParams.get("redirect");
    const redirectTo = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/";

    // Set by IdleLogout when a session was ended automatically, so the
    // user understands why they landed back on the login page instead of
    // wondering if something went wrong.
    const loggedOutForInactivity = searchParams.get("reason") === "idle";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const baseUrl =
                process.env.NEXT_PUBLIC_STRAPI_API_URL ||
                "http://localhost:1337";

            const res = await fetch(`${baseUrl}/api/auth/local`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    identifier: identifier.trim(),
                    password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error?.message || "Invalid credentials"
                );
            }

            const meRes = await fetch(
                `${baseUrl}/api/users/me?populate=role`,
                {
                    headers: {
                        Authorization: `Bearer ${data.jwt}`,
                    },
                }
            );

            if (!meRes.ok) {
                throw new Error(
                    "Could not load your account information."
                );
            }

            const fullUser = await meRes.json();

            localStorage.setItem("jwt", data.jwt);
            localStorage.setItem(
                "user",
                JSON.stringify(fullUser)
            );

            // Send the user back to whichever page sent them to log in,
            // instead of always landing on the home page.
            router.push(redirectTo);
        } catch (err: any) {
            setError(
                err?.message || "Login failed. Please try again."
            );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white">
                        Welcome Back
                    </h2>

                    <p className="text-sm text-slate-400">
                        Sign in to your LMS account
                    </p>
                </div>

                {loggedOutForInactivity && !error && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm p-3 rounded-lg text-center">
                        You were logged out after a period of inactivity. Please log in again.
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center">
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleLogin}
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Email or Username
                        </label>

                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) =>
                                setIdentifier(e.target.value)
                            }
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                            placeholder="name@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-600/30"
                    >
                        Sign In
                    </button>
                </form>

                <p className="text-center text-sm text-slate-400">
                    Don't have an account?{" "}
                    <Link
                        href={
                            rawRedirect
                                ? `/register?redirect=${encodeURIComponent(redirectTo)}`
                                : "/register"
                        }
                        className="text-indigo-400 hover:underline"
                    >
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    );
}