import { FormEvent, useMemo, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { getAiChatReply } from "@/lib/platform-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const getLocalFallbackReply = (input: string) => {
  const text = input.toLowerCase();

  if (text.includes("refine") || text.includes("project idea") || text.includes("suggest")) {
    return "Great idea. Start with: 1) problem statement, 2) target beneficiaries, 3) location, 4) timeline, 5) expected budget, 6) measurable outcomes. I can help you draft each section now.";
  }

  if (text.includes("donat") || text.includes("paystack") || text.includes("momo")) {
    return "To donate, open Donate, choose Mobile Money, enter amount, and complete Paystack checkout. If you came from a project page, the purpose is auto-linked to that project.";
  }

  if (text.includes("register") || text.includes("volunteer") || text.includes("ngo") || text.includes("donor")) {
    return "Use /register and choose your path: Volunteer, NGO, or Donor. After submitting, login from /login. Admin accounts are redirected to /admin.";
  }

  if (text.includes("admin") || text.includes("approve") || text.includes("review")) {
    return "Admin reviews project suggestions in /admin. Approve creates a proposed project; reject updates status. Decision email can be sent when the email edge function is configured.";
  }

  return "I can help with project suggestions, donations, registration, and admin review. Tell me which one you want to do now.";
};

const AiChatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi, I am BIH Assistant. Ask me about project suggestions, donations, registration, or admin review.",
    },
  ]);

  const contextMessages = useMemo(
    () => messages.filter((item) => item.role === "user" || item.role === "assistant").slice(-10),
    [messages],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) {
      return;
    }

    const nextMessages = [...messages, { role: "user", content: text } as ChatMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const reply = await getAiChatReply([...contextMessages, { role: "user", content: text }]);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      const fallback = getLocalFallbackReply(text);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I could not reach live AI right now.\n\nFallback help:\n${fallback}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full h-12 w-12 p-0 bg-accent text-accent-foreground hover:bg-accent/90"
          aria-label="Open BIH chat assistant"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      ) : (
        <div className="w-[340px] rounded-xl border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">BIH Assistant</p>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} aria-label="Close chat">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-80 px-4 py-3">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={
                      message.role === "user"
                        ? "inline-block max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "inline-block max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
                    }
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isSending ? <p className="text-xs text-muted-foreground">BIH Assistant is typing...</p> : null}
            </div>
          </ScrollArea>

          <form onSubmit={onSubmit} className="flex gap-2 border-t p-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything about BIH..."
              disabled={isSending}
            />
            <Button type="submit" disabled={isSending || !input.trim()}>
              Send
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AiChatbot;
