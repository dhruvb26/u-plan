import { Button } from "@/components/ui/button";
import Globe from "@/components/ui/globe";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <header className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <Image
            src="/logo.png" // Replace with your actual logo path
            alt="U-Plan Logo"
            width={40}
            height={40}
          />
        </div>
        <nav>
          <ul className="flex space-x-4">
            <Link href="/about">
              <Button variant={"link"}>About us</Button>
            </Link>{" "}
          </ul>
        </nav>
      </header>
      <main className="flex flex-col gap-4 row-start-2 items-center">
        <div className=" mt-12 flex flex-col space-y-1 items-center">
          <p className="text-base text-muted-foreground">
            Learn more about smartly planning your cities
            <Button variant={"link"} className="px-1">
              {" "}
              here.
            </Button>
          </p>
          <h1 className="text-7xl font-bold tracking-tighter">u-plan</h1>
        </div>

        <div className="flex gap-2 items-center flex-col sm:flex-row">
          <Link
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
          >
            <Button variant={"outline"} size={"lg"}>
              Chat
            </Button>
          </Link>

          <Link href="/demo">
            <Button size={"lg"}>_ Demo</Button>
          </Link>
        </div>

        <Globe className="w-full max-w-[600px] mx-auto mt-[5px] relative" />
      </main>
    </>
  );
}
