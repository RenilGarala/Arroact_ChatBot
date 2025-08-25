"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <div className="h-screen w-full flex items-center justify-center bg-neutral-950 text-white">
      <div className="max-w-2xl text-center px-6">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6">
          Arroact Technologies
        </h1>
        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
          At Arroact, we turn ideas into digital reality building fast, thinking smart, and partnering with brands that lead.
        </p>
        <div className="flex justify-center gap-4">
          <button  onClick={() => router.push("/home")}  className="px-6 py-3 bg-white text-black font-medium rounded-xl shadow hover:bg-neutral-200 transition">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
