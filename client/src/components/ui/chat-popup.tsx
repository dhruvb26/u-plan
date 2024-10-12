"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function ChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hello! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: "user", content: input }]);
      setInput("");
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content: "I received your message. How else can I help?",
          },
        ]);
      }, 1000);
    }
  };

  return (
    <div>
      <Button
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center  text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-[450px] h-[600px] flex flex-col">
          <CardHeader className="flex items-end py-2">
            <Link href={"/chat"}>
              <Button variant={"link"}>
                Add more context{" "}
                <ArrowUpRight className="stroke-1 inline ml-1 size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col justify-between h-full overflow-hidden">
            <ScrollArea className="h-full w-full">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  } mb-4`}
                >
                  <div
                    className={`flex items-center ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <Avatar className="w-8 h-8 m-2">
                      {message.role === "bot" ? (
                        <AvatarImage src="/logo.png" alt="Bot" />
                      ) : (
                        <AvatarImage
                          src="https://randomuser.me/api/portraits/men/1.jpg"
                          alt="User"
                        />
                      )}
                    </Avatar>
                    <div
                      className={`rounded-lg p-2 text-sm break-words ${
                        message.role === "user"
                          ? "bg-gray-400 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
          <CardFooter className="">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex w-full space-x-2"
            >
              <Input
                placeholder="Help me smartly plan this city."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-grow"
              />
              <Button type="submit">Send</Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
