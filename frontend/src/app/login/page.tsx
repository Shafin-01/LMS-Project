"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

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
                    "User information load করা যায়নি।"
                );
            }

            const fullUser = await meRes.json();

            localStorage.setItem("jwt", data.jwt);
            localStorage.setItem(
                "user",
                JSON.stringify(fullUser)
            );

            router.push("/");
        } catch (err: any) {
            setError(
                err?.message || "Login করা যায়নি।"
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
                        href="/register"
                        className="text-indigo-400 hover:underline"
                    >
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
}