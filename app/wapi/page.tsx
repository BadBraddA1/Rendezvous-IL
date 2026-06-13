"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import { MainContent } from "@/components/main-content"

export default function WeatherApiTestPage() {
  const [response, setResponse] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<number | null>(null)

  const testApi = async () => {
    setLoading(true)
    setResponse("")
    setStatus(null)
    
    try {
      const res = await fetch("/api/weather")
      setStatus(res.status)
      const data = await res.json()
      setResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setResponse(`Fetch error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainContent className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Weather API Test</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Test /api/weather</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-center">
              <Button onClick={testApi} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Weather API"
                )}
              </Button>
              
              {status !== null && (
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  status === 200 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  Status: {status}
                </span>
              )}
            </div>
            
            {response && (
              <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[600px] text-xs">
                {response}
              </pre>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>API Endpoint:</strong> /api/weather</p>
            <p><strong>Location:</strong> Lake Williamson Christian Center, Carlinville, IL</p>
            <p><strong>Coordinates:</strong> 39.2795, -89.8820</p>
            <p><strong>Expected env vars:</strong> OPENWEATHER_API_KEY, Open_Weather, or OPEN_WEATHER</p>
          </CardContent>
        </Card>
      </div>
    </MainContent>
  )
}
