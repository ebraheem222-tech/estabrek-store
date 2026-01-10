"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

const ChatIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const MinimizeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface LiveChatProps {
  apiBaseUrl?: string;
  storeName?: string;
  welcomeMessage?: string;
  placeholder?: string;
  position?: "bottom-right" | "bottom-left";
}

export function LiveChat({
  apiBaseUrl,
  storeName = "متجرنا",
  welcomeMessage = "مرحباً! كيف يمكنني مساعدتك اليوم؟",
  placeholder = "اكتب رسالتك...",
  position = "bottom-right",
}: LiveChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const baseUrl = apiBaseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/v1";

  // Generate session ID
  useEffect(() => {
    let id = localStorage.getItem("chat_session_id");
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("chat_session_id", id);
    }
    setSessionId(id);
  }, []);

  // Add welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, welcomeMessage, messages.length]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const res = await fetch(`${baseUrl}/storefront/chatbot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
          pageUrl: window.location.href,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: data.reply || data.message || "عذراً، حدث خطأ. حاول مرة أخرى.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    } catch (err) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "عذراً، لم نتمكن من الرد الآن. حاول مرة أخرى لاحقاً.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, baseUrl, sessionId, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickReplies = [
    "ما هي طرق الدفع؟",
    "كيف أتابع طلبي؟",
    "سياسة الإرجاع",
    "مواعيد التوصيل",
  ];

  return (
    <>
      {/* Chat Button */}
      <button
        className={`live-chat-button ${position} ${isOpen ? "hidden" : ""}`}
        onClick={() => setIsOpen(true)}
        aria-label="فتح الدردشة"
      >
        <ChatIcon />
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
        <span className="chat-pulse" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`live-chat-window ${position} ${isMinimized ? "minimized" : ""}`}>
          {/* Header */}
          <div className="live-chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">
                <span>💬</span>
              </div>
              <div>
                <h3>{storeName}</h3>
                <span className="online-status">
                  <span className="online-dot" />
                  متصل الآن
                </span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button onClick={() => setIsMinimized(!isMinimized)} aria-label="تصغير">
                <MinimizeIcon />
              </button>
              <button onClick={() => setIsOpen(false)} aria-label="إغلاق">
                <CloseIcon />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="live-chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`chat-message ${msg.role}`}>
                    <div className="message-content">
                      {msg.content}
                    </div>
                    <span className="message-time">
                      {msg.timestamp.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="chat-message assistant">
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {messages.length <= 1 && (
                <div className="quick-replies">
                  {quickReplies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputValue(reply);
                        inputRef.current?.focus();
                      }}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="live-chat-input">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={isTyping}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  aria-label="إرسال"
                >
                  <SendIcon />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

// Floating Chat Bubble with Preview
export function ChatBubblePreview({
  message = "هل تحتاج مساعدة؟",
  delay = 5000,
  onOpen,
}: {
  message?: string;
  delay?: number;
  onOpen?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDismissed) return;
    
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, isDismissed]);

  if (!isVisible || isDismissed) return null;

  return (
    <div className="chat-bubble-preview">
      <button className="bubble-dismiss" onClick={() => setIsDismissed(true)}>
        <CloseIcon />
      </button>
      <p>{message}</p>
      <button className="bubble-cta" onClick={onOpen}>
        ابدأ المحادثة
      </button>
    </div>
  );
}
