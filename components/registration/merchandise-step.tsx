"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, ShirtIcon, Mountain, AlertCircle, Ruler } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import type { RegistrationData, TshirtOrder } from "@/types/registration"

type Props = {
  data: RegistrationData
  updateData: (updates: Partial<RegistrationData>) => void
}

const TSHIRT_SIZES = [
  { value: "6M", label: "Infant 6M" },
  { value: "12M", label: "Infant 12M" },
  { value: "18M", label: "Infant 18M" },
  { value: "24M", label: "Infant 24M" },
  { value: "2T", label: "Toddler 2T" },
  { value: "4T", label: "Toddler 4T" },
  { value: "5/6", label: "Toddler 5/6" },
  { value: "yXS", label: "Youth XS" },
  { value: "yS", label: "Youth S" },
  { value: "yM", label: "Youth M" },
  { value: "yL", label: "Youth L" },
  { value: "aS", label: "Adult S (Unisex)" },
  { value: "aM", label: "Adult M (Unisex)" },
  { value: "aL", label: "Adult L (Unisex)" },
  { value: "aXL", label: "Adult XL (Unisex)" },
  { value: "a2XL", label: "Adult 2XL (Unisex)" },
  { value: "a3XL", label: "Adult 3XL (Unisex)" },
  { value: "a4XL", label: "Adult 4XL (Unisex)" },
  { value: "a5XL", label: "Adult 5XL (Unisex)" },
  { value: "wS", label: "Women's S" },
  { value: "wM", label: "Women's M" },
  { value: "wL", label: "Women's L" },
  { value: "wXL", label: "Women's XL" },
  { value: "w2XL", label: "Women's 2XL" },
  { value: "w3XL", label: "Women's 3XL" },
]

export function MerchandiseStep({ data, updateData }: Props) {
  const [sizeChartOpen, setSizeChartOpen] = useState(false)
  const addTshirtOrder = () => {
    const newOrder: TshirtOrder = {
      id: Date.now().toString(),
      size: "aM",
      quantity: 1,
    }
    updateData({ tshirtOrders: [...data.tshirtOrders, newOrder] })
  }

  const removeTshirtOrder = (id: string) => {
    updateData({ tshirtOrders: data.tshirtOrders.filter((o) => o.id !== id) })
  }

  const updateTshirtOrder = (id: string, updates: Partial<TshirtOrder>) => {
    updateData({
      tshirtOrders: data.tshirtOrders.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    })
  }

  // Calculate totals
  useEffect(() => {
    const tshirtTotal = data.tshirtOrders.reduce((sum, order) => sum + order.quantity * 12, 0)
    const climbingTowerTotal = data.climbingTowerParticipants * 10
    updateData({ tshirtTotal, climbingTowerTotal })
  }, [data.tshirtOrders, data.climbingTowerParticipants])

  const totalTshirts = data.tshirtOrders.reduce((sum, order) => sum + order.quantity, 0)

  return (
    <div className="space-y-6">
      {/* T-Shirts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShirtIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Rendezvous T-Shirts (Interest Gauge)</h3>
          </div>
          <Dialog open={sizeChartOpen} onOpenChange={setSizeChartOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Ruler className="h-4 w-4" />
                Size Chart
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>T-Shirt Size Charts</DialogTitle>
              </DialogHeader>
              <div className="relative w-full">
                <Image
                  src="/shirt-size-charts.png"
                  alt="T-Shirt Size Charts showing Adult, Ladies, Youth, Toddler and Infant sizing"
                  width={900}
                  height={1200}
                  className="w-full h-auto rounded-md"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground mb-3">
            We are not certain if we will order shirts this year.
          </p>
          <p className="text-sm text-muted-foreground">
            It will depend upon if we can hit a minimum order quantity. If you would like T-shirts at $12 each, please
            select your sizes and quantities below. We will let you know by April 1st if shirts will be ordered. If not,
            we will deduct it from your total owed at check-in.
          </p>
          <p className="text-sm font-semibold text-foreground mt-2">
            T-shirts are included in your registration total below.
          </p>
        </div>

        {data.tshirtOrders.length > 0 && (
          <div className="space-y-3">
            {data.tshirtOrders.map((order) => (
              <div key={order.id} className="flex items-start gap-3 rounded-lg border p-4">
                <div className="flex-1 grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor={`size-${order.id}`}>Size</Label>
                    <Select value={order.size} onValueChange={(value) => updateTshirtOrder(order.id, { size: value })}>
                      <SelectTrigger id={`size-${order.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TSHIRT_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`quantity-${order.id}`}>Quantity</Label>
                    <Input
                      id={`quantity-${order.id}`}
                      type="number"
                      min="1"
                      value={order.quantity}
                      onChange={(e) => updateTshirtOrder(order.id, { quantity: Number.parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeTshirtOrder(order.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button onClick={addTshirtOrder} variant="outline" className="w-full bg-transparent">
          <Plus className="mr-2 h-4 w-4" />
          Request T-Shirt
        </Button>
      </div>

      {/* Climbing Tower */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mountain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Indoor Climbing Tower (Add-On)</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Friday at 1:30 PM. $10 per person (ages 10+). Minimum 15 participants required.
        </p>
        <div>
          <Label htmlFor="climbingTower">Number of Participants</Label>
          <Input
            id="climbingTower"
            type="number"
            min="0"
            value={data.climbingTowerParticipants}
            onChange={(e) => updateData({ climbingTowerParticipants: Number.parseInt(e.target.value) || 0 })}
            className="md:w-1/3"
          />
        </div>
      </div>

      {/* Scholarship */}
      <div className="space-y-4">
        <h3 className="font-semibold">Scholarship Fund</h3>
        <p className="text-sm text-muted-foreground">
          Help families attend who couldn't otherwise afford it. All donations go directly to the scholarship fund.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="scholarshipDonation">Donate to Scholarship Fund (optional)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                id="scholarshipDonation"
                type="number"
                min="0"
                step="5"
                value={data.scholarshipDonation}
                onChange={(e) => updateData({ scholarshipDonation: Number.parseFloat(e.target.value) || 0 })}
                className="md:w-1/3"
              />
            </div>
            {data.scholarshipDonation > 0 && (
              <p className="mt-2 text-sm text-green-600 font-medium">
                Thank you! Your ${data.scholarshipDonation.toFixed(2)} donation will be added to your total.
              </p>
            )}
          </div>

          <div className="rounded-lg border-2 border-dashed p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="scholarshipRequested"
                checked={data.scholarshipRequested}
                onChange={(e) => updateData({ scholarshipRequested: e.target.checked })}
                className="mt-1"
              />
              <div>
                <Label htmlFor="scholarshipRequested" className="cursor-pointer font-medium">
                  Request Financial Assistance
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  If you need financial assistance to attend, check this box. Stephen will contact you to discuss
                  available help. No registration fee required with this request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      {!data.scholarshipRequested ? (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle>Merchandise & Add-Ons Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">T-Shirts ({totalTshirts} × $12)</span>
              <span className="font-medium">${data.tshirtTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Climbing Tower ({data.climbingTowerParticipants} × $10)</span>
              <span className="font-medium">${data.climbingTowerTotal.toFixed(2)}</span>
            </div>
            {data.scholarshipDonation > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Scholarship Donation</span>
                <span className="font-medium text-green-600">+${data.scholarshipDonation.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t pt-2">
              <span className="font-semibold">Merchandise Total:</span>
              <span className="text-2xl font-bold text-primary">
                ${(data.tshirtTotal + data.climbingTowerTotal + data.scholarshipDonation).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            You've requested financial assistance. Stephen will review your registration and contact you via email to
            discuss your needs and available help.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
