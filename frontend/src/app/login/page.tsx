"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
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
                        Sign in to your Learnix account
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

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                required
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 pr-12 text-white focus:outline-none focus:border-indigo-500"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>
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