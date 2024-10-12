"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  HandHelping,
  InspectionPanel,
  Waves,
} from "lucide-react";
import FlickeringGrid from "@/components/ui/flickering-grid";

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hello! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [firstMessageSent, setFirstMessageSent] = useState(false);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: "user", content: input }]);
      setInput("");
      setFirstMessageSent(true);
      // Here you would typically send the message to your chatbot backend
      // and then add the response to the messages
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
    <div className="flex flex-col h-screen">
      <header className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <Image
            src="/logo.png" // Replace with your actual logo path
            alt="U-Plan Logo"
            width={40}
            height={40}
          />
        </div>
        {firstMessageSent && (
          <h1 className="font-bold text-3xl tracking-tight">u-plan</h1>
        )}
        <nav>
          <ul className="flexr">
            <Link href="/about">
              <Button variant={"link"}>About us</Button>
            </Link>{" "}
            <Link href="/demo">
              <Button variant={"link"}>Demo</Button>
            </Link>{" "}
          </ul>
        </nav>
      </header>
      <main className="flex-grow overflow-hidden px-12">
        {!firstMessageSent && (
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="font-bold text-7xl tracking-tight mb-8">u-plan</h1>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex w-full max-w-md space-x-2 mb-8"
            >
              <Input
                placeholder="Help me smartly plan this city."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-grow"
              />
              <Button type="submit">Send</Button>
            </form>
            <div className="flex flex-row space-x-2 my-4">
              <div className="rounded-full bg-gray-100 p-4 py-2 text-sm text-black font-light">
                <HandHelping className="inline mr-1 stroke-1 scale-x-[-1]" />
                Can you show me high-risk zones for heat in Tempe - 85281?
              </div>
              <div className="rounded-full bg-gray-100 p-4 py-2 text-sm text-black font-light">
                <Waves className="inline mr-1 stroke-1 scale-x-[-1] size-4" />
                What materials should I use in areas with low NDWI to mitigate
                water stress?
              </div>
            </div>
            <div className="rounded-full bg-gray-100 p-4 py-2 text-sm text-black font-light">
              <InspectionPanel className="inline mr-1 stroke-1 scale-x-[-1] size-4" />
              Can you recommend a material based on the UHI index and albedo
              data?
            </div>
          </div>
        )}
        {firstMessageSent && (
          <ScrollArea className="h-full w-full p-4">
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
        )}
      </main>
      {firstMessageSent && (
        <footer className="p-4 px-12">
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
        </footer>
      )}
    </div>
  );
}
