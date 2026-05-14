"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Hash, Loader2, Plus, Send, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LinkRenderer, LinkPreviewCard, extractUrls, useLinkPreviews, type OgData } from "@/components/link-renderer";
import { cn } from "@/lib/utils";

interface Channel { _id: string; name: string; description?: string; }
interface Message {
  _id: string;
  content: string;
  edited: boolean;
  deleted: boolean;
  createdAt: string;
  userId: { _id: string; name?: string; email: string };
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Collect all unique URLs across all messages
function collectUrls(messages: Message[]): string[] {
  const all: string[] = [];
  for (const m of messages) {
    if (!m.deleted) all.push(...extractUrls(m.content));
  }
  return [...new Set(all)];
}

function MessageContent({ msg, preview }: { msg: Message; preview?: OgData }) {
  if (msg.deleted) {
    return <p className="flex-1 text-sm leading-relaxed text-slate-600 italic">{msg.content}</p>;
  }
  return (
    <div className="flex-1 min-w-0">
      <LinkRenderer text={msg.content} className="text-sm leading-relaxed text-slate-200" />
      {msg.edited && <span className="text-[10px] text-slate-600 ml-1">(edited)</span>}
      {preview && <LinkPreviewCard data={preview} />}
    </div>
  );
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTimeRef = useRef<string>(new Date(0).toISOString());

  // Collect URLs from all messages and fetch OG previews
  const allUrls = collectUrls(messages);
  const previews = useLinkPreviews(allUrls);

  const fetchChannels = useCallback(async () => {
    const res = await fetch("/api/chat/channels");
    if (res.ok) {
      const { channels: c } = await res.json();
      setChannels(c);
      if (!activeChannel && c.length > 0) setActiveChannel(c[0]);
    }
    setLoadingChannels(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchChannels(); }, [fetchChannels]);

  const fetchMessages = useCallback(async (channelId: string, initial = false) => {
    if (initial) setLoadingMsgs(true);
    const since = initial ? undefined : lastTimeRef.current;
    const url = `/api/chat/messages?channelId=${channelId}&limit=50${since ? `&since=${encodeURIComponent(since)}` : ""}`;
    const res = await fetch(url);
    if (res.ok) {
      const { messages: msgs, serverTime } = await res.json();
      if (initial) {
        setMessages(msgs);
        lastTimeRef.current = serverTime;
      } else if (msgs.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m: Message) => m._id));
          const newMsgs = msgs.filter((m: Message) => !existingIds.has(m._id));
          return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
        });
        lastTimeRef.current = serverTime;
      }
    }
    if (initial) setLoadingMsgs(false);
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    lastTimeRef.current = new Date(0).toISOString();
    void fetchMessages(activeChannel._id, true);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => void fetchMessages(activeChannel._id), 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChannel, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChannel || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: activeChannel._id, content }),
      });
      if (res.ok) {
        const { message } = await res.json();
        setMessages((prev) => [...prev.filter((m) => m._id !== message._id), message]);
      }
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (id: string) => {
    setMessages((prev) => prev.filter((m) => m._id !== id));
    await fetch(`/api/chat/messages?id=${id}`, { method: "DELETE" });
  };

  const createChannel = async () => {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) return;
    const res = await fetch("/api/chat/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const { channel } = await res.json();
      setChannels((prev) => [...prev, channel]);
      setActiveChannel(channel);
    }
    setShowNewChannel(false);
    setNewChannelName("");
  };

  // Determine which message in a group gets the OG preview
  // (only the first URL-bearing message per group, to avoid clutter)
  function getPreviewForMsg(msg: Message): OgData | undefined {
    if (msg.deleted) return undefined;
    const urls = extractUrls(msg.content);
    if (urls.length === 0) return undefined;
    return previews[urls[0]];
  }

  // Group messages by author+time proximity
  const grouped = messages.reduce<Array<{ author: Message["userId"]; msgs: Message[]; time: string }>>((acc, msg) => {
    const last = acc[acc.length - 1];
    const isSameAuthor = last?.author._id === msg.userId._id;
    const timeDiff = last ? new Date(msg.createdAt).getTime() - new Date(last.time).getTime() : Infinity;
    if (isSameAuthor && timeDiff < 5 * 60 * 1000) {
      last.msgs.push(msg);
    } else {
      acc.push({ author: msg.userId, msgs: [msg], time: msg.createdAt });
    }
    return acc;
  }, []);

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-7xl overflow-hidden rounded-2xl border border-white/8 bg-black/30">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-white/8 md:flex">
          <div className="flex items-center justify-between p-3 border-b border-white/8">
            <span className="text-sm font-semibold text-slate-300">Channels</span>
            <button onClick={() => setShowNewChannel(true)}
              className="rounded-lg p-1 text-slate-500 hover:bg-white/8 hover:text-white">
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loadingChannels ? (
              <div className="flex justify-center py-4"><Loader2 className="size-4 animate-spin text-slate-500" /></div>
            ) : (
              channels.map((ch) => (
                <button key={ch._id} onClick={() => setActiveChannel(ch)}
                  className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                    activeChannel?._id === ch._id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
                  <Hash className="size-3.5 shrink-0" />
                  {ch.name}
                </button>
              ))
            )}
          </div>
          {showNewChannel && (
            <div className="border-t border-white/8 p-2">
              <div className="flex items-center gap-1">
                <Hash className="size-3.5 text-slate-500 shrink-0" />
                <input autoFocus value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void createChannel(); if (e.key === "Escape") { setShowNewChannel(false); setNewChannelName(""); } }}
                  placeholder="channel-name"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600" />
                <button onClick={() => { setShowNewChannel(false); setNewChannelName(""); }}
                  className="text-slate-600 hover:text-white"><X className="size-3.5" /></button>
              </div>
            </div>
          )}
        </aside>

        {/* Main chat */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeChannel ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                <Hash className="size-4 text-slate-500" />
                <span className="font-semibold">{activeChannel.name}</span>
                {activeChannel.description && (
                  <span className="text-xs text-slate-500 border-l border-white/10 ml-1 pl-2">{activeChannel.description}</span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-slate-500" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-600">
                    <Hash className="size-10" />
                    <p className="text-sm">Start the conversation in #{activeChannel.name}</p>
                  </div>
                ) : (
                  grouped.map((group, gi) => {
                    const initials = (group.author.name ?? group.author.email).slice(0, 2).toUpperCase();
                    const isMe = group.author._id === session?.user?.id;
                    return (
                      <div key={gi} className="flex gap-3 group">
                        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-700 text-xs font-semibold mt-0.5">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {group.author.name ?? group.author.email.split("@")[0]}
                            </span>
                            <span className="text-[11px] text-slate-600">{timeLabel(group.time)}</span>
                          </div>
                          <div className="space-y-1">
                            {group.msgs.map((msg) => (
                              <div key={msg._id} className="group/msg flex items-start gap-1">
                                <MessageContent msg={msg} preview={getPreviewForMsg(msg)} />
                                {isMe && !msg.deleted && (
                                  <button onClick={() => void deleteMessage(msg._id)}
                                    className="opacity-0 group-hover/msg:opacity-100 shrink-0 text-slate-600 hover:text-red-400 transition-opacity mt-0.5">
                                    <Trash2 className="size-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/8 p-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                    placeholder={`Message #${activeChannel.name}`}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                  <button onClick={() => void sendMessage()} disabled={!input.trim() || sending}
                    className="grid size-7 place-items-center rounded-lg bg-blue-500 text-white disabled:opacity-40 hover:bg-blue-400 transition-colors">
                    <Send className="size-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-600">
              <Hash className="size-10" />
              <p>Select a channel to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
