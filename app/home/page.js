"use client";
import { useState, useRef, useEffect } from "react";
import React from 'react';
import { useRouter } from "next/navigation";

const home = () => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      content: "Hey! Welcome to Arroact Technologies.",
      timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    },
  ]);
  const messagesEndRef = useRef(null);
   const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStreamChat = async () => {
    if (!message.trim()) return;

    setLoading(true);

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: message.trim(),
      timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentMessage = message.trim();
    setMessage("");

    const aiMessageId = Date.now() + 1;
    const aiMessage = {
      id: aiMessageId,
      type: "ai",
      content: "",
      timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    };

    setMessages((prev) => [...prev, aiMessage]);

    try {
      const messageHistory = messages
        .filter((msg) => msg.content.trim() !== "")
        .map((msg) => ({
          type: msg.type,
          content: msg.content,
        }));

      const res = await fetch("/api/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
          messageHistory: messageHistory,
          conversationId: "default",
        }),
      });

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "chunk" && data.content) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  )
                );
              } else if (data.type === "done") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: data.fullResponse }
                      : msg
                  )
                );
                break;
              } else if (data.type === "error") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: data.content }
                      : msg
                  )
                );
                break;
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content:
                  "Sorry, I'm having trouble connecting right now. Please try again! 💔",
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStreamChat();
    }
  };

  return (
     <div className="h-screen flex flex-col bg-neutral-950 text-white">
      <header className="fixed top-0 left-0 right-0 z-10 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800">
        
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center relative justify-center">
          <button  onClick={() => router.push("/")}  className="px-4 py-2 absolute right-full bg-white text-black font-medium rounded-xl shadow hover:bg-neutral-200 transition">
          Back
        </button>
          <h1 className="text-2xl font-semibold tracking-wide text-white">
            Arroact ChatBot
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-hidden pt-20 pb-24">
        <div className="h-full overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[70%] flex flex-col gap-1`}
                >
                  <div
                    className={`p-4 rounded-2xl shadow-sm ${
                      msg.type === "user"
                        ? "bg-neutral-800 border border-neutral-700 text-white rounded-br-sm"
                        : "bg-neutral-900 border border-neutral-800 text-gray-200 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                  <span
                    className={`text-xs text-gray-500 px-2 ${
                      msg.type === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl rounded-bl-sm p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-400">Typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-neutral-900/90 backdrop-blur-md border-t border-neutral-800">
        <div className="max-w-4xl mx-auto p-5">
          <div className="flex items-center gap-3 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-sm p-2">
            <input
              type="text"
              onChange={(e) => setMessage(e.target.value)}
              value={message}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1 p-3 bg-transparent text-white placeholder:text-gray-500 focus:outline-none text-sm"
            />
            <button
              onClick={handleStreamChat}
              disabled={loading || !message.trim()}
              className="bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-gray-400 rounded-xl px-4 py-2 flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-sm text-sm font-medium"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Send"
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default home