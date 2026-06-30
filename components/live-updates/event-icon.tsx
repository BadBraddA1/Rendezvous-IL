import {
  Sun, MapPin, Clock, Users, Utensils, Coffee, Sandwich, UtensilsCrossed,
  ClipboardCheck, Camera, Music, Gamepad2, Mountain, Trophy, Palette,
  BookOpen, Dumbbell, TreePine, Flame, Tent, Heart, Star, Sparkles, PartyPopper,
  Moon, Megaphone, Target, Volleyball, Hand, Grid3x3, Dice5,
} from "lucide-react"
import { LU_ICON } from "@/lib/live-updates-colors"

export function getEventIcon(
  title: string,
  isMeal?: boolean,
  size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" = "md",
  colorOverrideClass?: string,
) {
  const lowerTitle = title.toLowerCase()
  const sizeClasses = {
    xs: "h-7 w-7",
    sm: "h-9 w-9",
    md: "h-14 w-14",
    lg: "h-20 w-20",
    xl: "h-28 w-28",
    "2xl": "h-36 w-36",
  }
  const sz = sizeClasses[size]
  const base = `${sz} shrink-0`
  const c = (defaultClass: string) => colorOverrideClass ?? defaultClass

  if (isMeal) {
    if (lowerTitle.includes("breakfast")) return <Coffee className={`${base} ${c(LU_ICON.meal)}`} />
    if (lowerTitle.includes("lunch")) return <Sandwich className={`${base} ${c(LU_ICON.meal)}`} />
    if (lowerTitle.includes("dinner")) return <UtensilsCrossed className={`${base} ${c(LU_ICON.meal)}`} />
    return <Utensils className={`${base} ${c(LU_ICON.meal)}`} />
  }

  if (lowerTitle.includes("good night")) return <Moon className={`${base} ${c(LU_ICON.muted)}`} />
  if (lowerTitle.includes("check-in") || lowerTitle.includes("checkout")) {
    return <ClipboardCheck className={`${base} ${c(LU_ICON.lake)}`} />
  }
  if (lowerTitle.includes("assembly") || lowerTitle.includes("announcement")) {
    return <Megaphone className={`${base} ${c(LU_ICON.coral)}`} />
  }
  if (lowerTitle.includes("archery")) return <Target className={`${base} ${c(LU_ICON.coral)}`} />
  if (lowerTitle.includes("dodgeball")) return <Volleyball className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes("game") || lowerTitle.includes("knockout")) {
    return <Gamepad2 className={`${base} ${c(LU_ICON.lake)}`} />
  }
  if (lowerTitle.includes("obstacle") || lowerTitle.includes("rope")) {
    return <Mountain className={`${base} ${c(LU_ICON.muted)}`} />
  }
  if (lowerTitle.includes("gym") || lowerTitle.includes("sport")) {
    return <Dumbbell className={`${base} ${c(LU_ICON.lake)}`} />
  }
  if (lowerTitle.includes("bonfire") || lowerTitle.includes("fire")) {
    return <Flame className={`${base} ${c(LU_ICON.warm)}`} />
  }
  if (lowerTitle.includes("picture") || lowerTitle.includes("photo")) {
    return <Camera className={`${base} ${c(LU_ICON.lake)}`} />
  }
  if (lowerTitle.includes("award") || lowerTitle.includes("ceremony")) {
    return <Trophy className={`${base} ${c(LU_ICON.warm)}`} />
  }
  if (lowerTitle.includes("farewell") || lowerTitle.includes("goodbye")) {
    return <Hand className={`${base} ${c(LU_ICON.warm)}`} />
  }
  if (lowerTitle.includes("ice breaker") || lowerTitle.includes("introduction")) {
    return <Users className={`${base} ${c(LU_ICON.lake)}`} />
  }
  if (lowerTitle.includes("nine square")) return <Grid3x3 className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes("table game")) return <Dice5 className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes("mom") || lowerTitle.includes("family")) {
    return <Heart className={`${base} ${c(LU_ICON.coral)}`} />
  }
  if (lowerTitle.includes("young adult") || lowerTitle.includes("session") || lowerTitle.includes("meeting")) {
    return <Users className={`${base} ${c(LU_ICON.lake)}`} />
  }
  if (lowerTitle.includes("afternoon") || lowerTitle.includes("activities")) {
    return <Sun className={`${base} ${c(LU_ICON.warm)}`} />
  }
  if (lowerTitle.includes("evening")) return <Moon className={`${base} ${c(LU_ICON.muted)}`} />

  return <MapPin className={`${base} ${c(LU_ICON.upcoming)}`} />
}
