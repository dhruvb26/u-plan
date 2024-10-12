import React from "react";
import { Dock, DockIcon } from "./dock";
import { Home, MessageCircle } from "lucide-react";
import Link from "next/link";

export type IconProps = React.HTMLAttributes<SVGElement>;

export function MapDock() {
  return (
    <Dock direction="bottom">
      <DockIcon>
        <Link href="/">
          <Home className="size-5 text-white" />
        </Link>
      </DockIcon>
      <DockIcon>
        <Link href={"/chat"}>
          <MessageCircle className="size-5 text-white" />
        </Link>
      </DockIcon>
    </Dock>
  );
}
