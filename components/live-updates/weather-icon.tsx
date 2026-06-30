import { Sun, Cloud, CloudRain, CloudSnow, Wind, CloudLightning, CloudSun, Snowflake } from "lucide-react"

export function getWeatherIcon(
  weatherId: number,
  iconCode: string,
  size: "sm" | "md" | "lg" = "md",
) {
  const isDay = iconCode.endsWith("d")
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-24 w-24",
  }
  const iconClass = sizeClasses[size]

  if (weatherId >= 200 && weatherId < 300) {
    return <CloudLightning className={`${iconClass} lu-weather-storm`} />
  } else if (weatherId >= 300 && weatherId < 600) {
    return <CloudRain className={`${iconClass} lu-weather-rain`} />
  } else if (weatherId >= 600 && weatherId < 700) {
    return <Snowflake className={`${iconClass} lu-weather-snow`} />
  } else if (weatherId >= 700 && weatherId < 800) {
    return <Wind className={`${iconClass} lu-weather-wind`} />
  } else if (weatherId === 800) {
    return isDay ? (
      <Sun className={`${iconClass} lu-weather-sun`} />
    ) : (
      <Sun className={`${iconClass} lu-weather-wind`} />
    )
  } else if (weatherId > 800) {
    return isDay ? (
      <CloudSun className={`${iconClass} lu-weather-wind`} />
    ) : (
      <Cloud className={`${iconClass} lu-weather-wind`} />
    )
  }
  return <Cloud className={`${iconClass} lu-weather-wind`} />
}
