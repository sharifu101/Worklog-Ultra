"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Search, SendHorizonal } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Contact = {
  id: string;
  name: string;
  role: string;
  department: { name: string } | null;
};

type Message = {
  id: string;
  subject: string | null;
  body: string;
  readAt: Date | null;
  createdAt: Date;
  senderId: string;
  recipientId: string;
  sender: { name: string; role: string };
  recipient: { name: string; role: string };
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
};

type ConversationMessage = Message & {
  direction: "incoming" | "outgoing";
  partnerId: string;
  partnerName: string;
  isUnreadIncoming: boolean;
};

type ConversationSummary = {
  contact: Contact;
  messages: ConversationMessage[];
  unreadCount: number;
  latestMessageAt: number;
  latestPreview: string;
};

function getContactMeta(contact: Contact) {
  return contact.department?.name ?? contact.role;
}

function formatClock(value: Date | string) {
  return new Intl.DateTimeFormat("en-BD", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function MessagesCenter({
  currentUserId,
  contacts = [],
  messages = [],
}: {
  currentUserId: string;
  contacts: Contact[];
  messages: Message[];
}) {
  const router = useRouter();
  const [selectedContactId, setSelectedContactId] = useState("");
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputId = "workspace-chat-file-input";

  const normalizedMessages = useMemo<ConversationMessage[]>(
    () =>
      (messages ?? []).map((message) => {
        const outgoing = message.senderId === currentUserId;

        return {
          ...message,
          direction: outgoing ? "outgoing" : "incoming",
          partnerId: outgoing ? message.recipientId : message.senderId,
          partnerName: outgoing ? message.recipient.name : message.sender.name,
          isUnreadIncoming: !outgoing && !message.readAt,
        };
      }),
    [currentUserId, messages],
  );

  const conversations = useMemo<ConversationSummary[]>(() => {
    const map = new Map<string, ConversationSummary>();

    for (const contact of contacts ?? []) {
      map.set(contact.id, {
        contact,
        messages: [],
        unreadCount: 0,
        latestMessageAt: 0,
        latestPreview: "Start chatting",
      });
    }

    for (const message of normalizedMessages) {
      const fallbackContact: Contact = {
        id: message.partnerId,
        name: message.partnerName,
        role: message.direction === "outgoing" ? message.recipient.role : message.sender.role,
        department: null,
      };

      const current =
        map.get(message.partnerId) ??
        ({
          contact: fallbackContact,
          messages: [],
          unreadCount: 0,
          latestMessageAt: 0,
          latestPreview: "Start chatting",
        } satisfies ConversationSummary);

      current.messages.push(message);
      current.latestMessageAt = Math.max(current.latestMessageAt, new Date(message.createdAt).getTime());
      current.latestPreview = message.body.trim() || "Attachment";

      if (message.isUnreadIncoming) {
        current.unreadCount += 1;
      }

      map.set(message.partnerId, current);
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        messages: [...item.messages].sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        ),
      }))
      .sort((left, right) => {
        if (right.latestMessageAt !== left.latestMessageAt) {
          return right.latestMessageAt - left.latestMessageAt;
        }

        return left.contact.name.localeCompare(right.contact.name);
      });
  }, [contacts, normalizedMessages]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return conversations;
    }

    return conversations.filter((item) =>
      [item.contact.name, item.contact.role, item.contact.department?.name ?? "", item.latestPreview]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [conversations, search]);

  useEffect(() => {
    if (!filteredConversations.length) {
      setSelectedContactId("");
      return;
    }

    setSelectedContactId((current) => {
      if (current && filteredConversations.some((item) => item.contact.id === current)) {
        return current;
      }

      return filteredConversations[0]?.contact.id ?? "";
    });
  }, [filteredConversations]);

  const selectedConversation =
    filteredConversations.find((item) => item.contact.id === selectedContactId) ??
    conversations.find((item) => item.contact.id === selectedContactId) ??
    null;
  const selectedContact = selectedConversation?.contact ?? null;

  async function sendMessage() {
    if (!selectedContact?.id || !body.trim()) {
      toast.error("Choose a teammate and write a message first.");
      return;
    }

    setSending(true);
    const payload = new FormData();
    payload.append("recipientId", selectedContact.id);
    payload.append("subject", "");
    payload.append("body", body);
    attachments.forEach((file) => payload.append("attachments", file));

    const response = await fetch("/api/messages", {
      method: "POST",
      body: payload,
    });

    const raw = await response.text();
    const result = raw ? JSON.parse(raw) : { message: "Message could not be sent." };
    setSending(false);

    if (!response.ok) {
      toast.error(result.message);
      return;
    }

    setBody("");
    setAttachments([]);
    toast.success(result.message);
    router.refresh();
  }

  return (
    <>
      <div
        className="overflow-hidden rounded-[28px] border border-[#d9e6ff] bg-white shadow-[0_24px_60px_rgba(37,99,235,0.08)]"
        style={{
          display: "grid",
          gridTemplateColumns: "320px minmax(0, 1fr)",
          minHeight: "760px",
        }}
      >
        <aside className="border-r border-[#e5eefc] bg-[#fbfdff]">
          <div className="border-b border-[#e5eefc] px-5 py-4">
            <h2 className="text-[1.8rem] font-bold tracking-[-0.03em] text-[#10203a]">Messages</h2>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa1c2]" />
              <Input
                className="h-11 rounded-2xl border-[#d7e4fb] bg-white pl-10 text-[#10203a] placeholder:text-[#8fa1c2]"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search teammate"
                value={search}
              />
            </div>
          </div>

          <div className="space-y-1 overflow-y-auto px-3 py-3" style={{ maxHeight: "680px" }}>
            {filteredConversations.length ? (
              filteredConversations.map((conversation) => {
                const active = conversation.contact.id === selectedConversation?.contact.id;

                return (
                  <button
                    key={conversation.contact.id}
                    className={`flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition ${
                      active
                        ? "border-[#60a5fa] bg-[linear-gradient(135deg,#bfdbfe_0%,#dbeafe_55%,#eff6ff_100%)] shadow-[0_12px_24px_rgba(59,130,246,0.16)]"
                        : "border-transparent bg-[#f8fbff] hover:border-[#cfe0fb] hover:bg-[#eef5ff]"
                    }`}
                    onClick={() => setSelectedContactId(conversation.contact.id)}
                    type="button"
                  >
                    <Avatar className="h-12 w-12 border border-[#d4e1f7]">
                      <AvatarFallback className="bg-[#edf4ff] text-[#153a75]">
                        {conversation.contact.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                  <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-[#10203a]">{conversation.contact.name}</p>
                        <span className="shrink-0 text-[11px] text-[#8fa1c2]">
                          {conversation.latestMessageAt ? formatClock(new Date(conversation.latestMessageAt)) : ""}
                        </span>
                      </div>
                      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8db1]">
                        {getContactMeta(conversation.contact)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="truncate text-xs text-[#6b7a99]">{conversation.latestPreview}</p>
                        {conversation.unreadCount > 0 ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1d9bf0] px-1.5 text-[10px] font-bold text-white">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                  </div>
                </button>
              );
            })
            ) : (
              <div className="px-3 py-10 text-center text-sm text-[#8fa1c2]">No teammate found.</div>
            )}
          </div>
        </aside>

        <section className="flex min-h-[760px] flex-col bg-[#f7fbff]">
          <div className="flex items-center gap-4 border-b border-[#e5eefc] bg-white px-6 py-4">
            <Avatar className="h-12 w-12 border border-[#d4e1f7]">
              <AvatarFallback className="bg-[#edf4ff] text-[#153a75]">
                {selectedContact?.name?.slice(0, 1) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-[#10203a]">{selectedContact?.name ?? "Choose Teammate"}</p>
              <p className="truncate text-sm text-[#6b7a99]">
                {selectedContact ? getContactMeta(selectedContact) : "Select a user from the left"}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-[linear-gradient(180deg,#f7fbff_0%,#edf5ff_100%)] px-6 py-6">
            {selectedConversation?.messages.length ? (
              selectedConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[72%]">
                    <div
                      className={`rounded-[24px] px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.14)] ${
                        message.direction === "outgoing"
                          ? "rounded-br-md bg-[#1d9bf0] text-white"
                          : "rounded-bl-md bg-white text-[#10203a]"
                      }`}
                    >
                      <p className="whitespace-pre-line text-sm leading-6">{message.body}</p>
                      {message.attachments.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                                message.direction === "outgoing"
                                  ? "bg-white/15 text-white"
                                  : "border border-[#d9e6ff] bg-[#f8fbff] text-[#1d78d6]"
                              }`}
                              href={attachment.fileUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {attachment.fileName}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <p
                      className={`mt-1 px-2 text-[11px] text-[#8fa1c2] ${
                        message.direction === "outgoing" ? "text-right" : "text-left"
                      }`}
                    >
                      {message.direction === "outgoing" ? "You" : message.sender.name} ·{" "}
                      {formatDistanceToNowStrict(new Date(message.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-[24px] border border-dashed border-[#d9e6ff] bg-white/70 p-8 text-center text-sm text-[#8fa1c2]">
                {selectedContact
                  ? `${selectedContact.name} er sathe ekhono kono message nei. Nicher input box theke start korun.`
                  : "Select a user from the left to open the chat."}
              </div>
            )}
          </div>

          <div className="border-t border-[#e5eefc] bg-white px-6 py-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Textarea
                  className="min-h-[56px] rounded-[22px] border-[#d7e4fb] bg-[#f7fbff] text-[#10203a] placeholder:text-[#8fa1c2]"
                  disabled={!selectedContact}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={selectedContact ? `Type a message for ${selectedContact.name}...` : "Select teammate first"}
                  value={body}
                />
              </div>
              <div className="flex flex-col gap-2">
                <input
                  className="hidden"
                  disabled={!selectedContact}
                  multiple
                  id={fileInputId}
                  onChange={(event) => setAttachments(Array.from(event.target.files ?? []))}
                  type="file"
                />
                <label
                  className={`flex w-[320px] cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                    selectedContact
                      ? "border-[#cfe0fb] bg-[#eef5ff] text-[#10203a] hover:bg-[#e0edff]"
                      : "cursor-not-allowed border-[#e5eefc] bg-[#f4f7fb] text-[#9aa9c2]"
                  }`}
                  htmlFor={selectedContact ? fileInputId : undefined}
                >
                  <span
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                      selectedContact ? "bg-[#1d4ed8] text-white" : "bg-[#dbe4f2] text-[#7b8da9]"
                    }`}
                  >
                    Choose Files
                  </span>
                  <span className="ml-3 truncate text-right">
                    {attachments.length
                      ? attachments.length === 1
                        ? attachments[0]?.name
                        : `${attachments.length} files selected`
                      : "No file chosen"}
                  </span>
                </label>
                <button
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-5 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:bg-[#9db8f5] disabled:text-white"
                  disabled={sending || !selectedContact}
                  onClick={sendMessage}
                  type="button"
                >
                  <SendHorizonal className="h-4 w-4" />
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
            {attachments.length ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6b7a99]">
                {attachments.map((file) => (
                  <span
                    key={`${file.name}-${file.size}`}
                    className="rounded-full border border-[#d9e6ff] bg-[#f7fbff] px-2.5 py-1"
                  >
                    {file.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 1023px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }

        :global(input[type="file"]::file-selector-button) {
          cursor: pointer;
        }

        :global(input[type="file"]) {
          color: #10203a;
        }
      `}</style>
    </>
  );
}
