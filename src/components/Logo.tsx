import Image from "next/image";
import logo from "@/assets/logo.png";

export function Logo({ className = "h-14 w-auto" }: { className?: string }) {
  return <Image src={logo} alt="ALMAS" priority unoptimized className={className} />;
}
