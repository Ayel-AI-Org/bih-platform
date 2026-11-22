import { FormEvent, useMemo, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { getAiChatReply } from "@/database/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import FormattedAiMessage from "@/components/layout/FormattedAiMessage";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const getLocalFallbackReply = (input: string) => {
  const text = input.toLowerCase();

  if (text.includes("refine") || text.includes("project idea") || text.includes("suggest")) {
    return "To propose a community initiative:\n1. Visit the Suggest Project page (/suggest-project)\n2. Provide your project concept, target location, timeline, and estimated budget\n3. Submit for review by our project committee";
  }

  if (text.includes("donat") || text.includes("paystack") || text.includes("momo")) {
    return "To donate to community initiatives:\n1. Visit the Donate page (/donate)\n2. Select your donation amount and payment method (Mobile Money or Card via Paystack)\n3. Complete your transaction securely";
  }

  if (text.includes("register") || text.includes("volunteer") || text.includes("ngo") || text.includes("donor")) {
    return "To join our community:\n1. Go to Register (/register)\n2. Choose your role: Volunteer, NGO Partner, or Donor\n3. Complete the registration form and submit";
  }

  if (text.includes("phone") || text.includes("contact") || text.includes("call") || text.includes("location") || text.includes("address")) {
    return "Bridge for Impact Hub is located in Accra, Ghana. You can reach our team at bridgeforimpacthub@gmail.com or call +233 (0) 57 880 9478.";
  }

  if (text.includes("admin") || text.includes("internal") || text.includes("staff")) {
    return "Administrative portals are restricted to authorized personnel. For organizational inquiries, please contact bridgeforimpacthub@gmail.com or call +233 (0) 57 880 9478.";
  }

  return "I can help with questions about volunteering, project proposals, and donations. For further assistance, contact us at bridgeforimpacthub@gmail.com or call +233 (0) 57 880 9478.";
};

const AiChatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I am the BIH Assistant. How can I assist you with volunteering, project proposals, or donations in Accra, Ghana?",
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
    } catch (error) {
      const fallback = getLocalFallbackReply(text);
      const detail = error instanceof Error ? error.message : "AI service unavailable";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `AI Service Notice: ${detail}\n\n${fallback}`,
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
                    {message.role === "assistant" ? (
                      <FormattedAiMessage content={message.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    )}
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
