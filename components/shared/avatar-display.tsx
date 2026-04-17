import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarDisplayProps {
  fullName: string;
  signedUrl?: string | null;
  className?: string;
}

export function AvatarDisplay({ fullName, signedUrl, className }: AvatarDisplayProps) {
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {signedUrl ? <AvatarImage src={signedUrl} alt={fullName} /> : null}
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  );
}
