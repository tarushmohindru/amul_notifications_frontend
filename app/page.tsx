"use client"

import { useState, useEffect } from "react"
import { Search, Bell, BellRing } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

interface Product {
  available: number
  price: number
  images: string[]
}

interface ProductsData {
  [key: string]: Product
}

interface SubscriptionData {
  email: string
  subscribedAt: string
  productName: string
}

interface StoredSubscriptions {
  [productName: string]: SubscriptionData
}

export default function Component() {
  const [allProducts, setAllProducts] = useState<ProductsData>({})
  const [availableProducts, setAvailableProducts] = useState<ProductsData>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [subscribedProducts, setSubscribedProducts] = useState<Set<string>>(new Set())
  const [storedSubscriptions, setStoredSubscriptions] = useState<StoredSubscriptions>({})
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  // Enhanced localStorage utilities
  const loadSubscriptionsFromStorage = (): StoredSubscriptions => {
    try {
      const stored = localStorage.getItem("productSubscriptions")
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error("Error loading subscriptions from localStorage:", error)
      toast({
        title: "Storage Error",
        description: "Failed to load your subscription preferences",
        variant: "destructive",
      })
    }
    return {}
  }

  const saveSubscriptionsToStorage = (subscriptions: StoredSubscriptions) => {
    try {
      localStorage.setItem("productSubscriptions", JSON.stringify(subscriptions))
      setStoredSubscriptions(subscriptions)
      
      // Update the Set for quick lookups
      const productNames = new Set(Object.keys(subscriptions))
      setSubscribedProducts(productNames)
      
      // Also save user email if we have subscriptions
      const emails = Object.values(subscriptions).map(sub => sub.email)
      if (emails.length > 0) {
        localStorage.setItem("userEmail", emails[0]) // Use the most recent email
      }
    } catch (error) {
      console.error("Error saving subscriptions to localStorage:", error)
      toast({
        title: "Storage Error", 
        description: "Failed to save your subscription preferences",
        variant: "destructive",
      })
    }
  }

  const addSubscription = (productName: string, userEmail: string) => {
    const newSubscriptions = { ...storedSubscriptions }
    newSubscriptions[productName] = {
      email: userEmail,
      subscribedAt: new Date().toISOString(),
      productName: productName
    }
    saveSubscriptionsToStorage(newSubscriptions)
  }

  const removeSubscription = (productName: string) => {
    const newSubscriptions = { ...storedSubscriptions }
    delete newSubscriptions[productName]
    saveSubscriptionsToStorage(newSubscriptions)
  }

  const getSubscriptionInfo = (productName: string): SubscriptionData | null => {
    return storedSubscriptions[productName] || null
  }

  const getAllSubscriptions = (): SubscriptionData[] => {
    return Object.values(storedSubscriptions)
  }

  const clearAllSubscriptions = () => {
    try {
      localStorage.removeItem("productSubscriptions")
      localStorage.removeItem("subscribedProducts") // Remove old format too
      setStoredSubscriptions({})
      setSubscribedProducts(new Set())
      toast({
        title: "Cleared",
        description: "All subscriptions have been cleared",
      })
    } catch (error) {
      console.error("Error clearing subscriptions:", error)
      toast({
        title: "Error",
        description: "Failed to clear subscriptions",
        variant: "destructive",
      })
    }
  }

  const getSubscriptionStats = () => {
    const subscriptions = getAllSubscriptions()
    const emailCounts: { [email: string]: number } = {}
    
    subscriptions.forEach(sub => {
      emailCounts[sub.email] = (emailCounts[sub.email] || 0) + 1
    })

    return {
      totalSubscriptions: subscriptions.length,
      uniqueEmails: Object.keys(emailCounts).length,
      emailBreakdown: emailCounts,
      oldestSubscription: subscriptions.length > 0 
        ? subscriptions.reduce((oldest, current) => 
            new Date(current.subscribedAt) < new Date(oldest.subscribedAt) ? current : oldest
          )
        : null
    }
  }

  // Load subscribed products from localStorage
  useEffect(() => {
    const subscriptions = loadSubscriptionsFromStorage()
    setStoredSubscriptions(subscriptions)
    
    // Set up the product names Set for quick lookups
    const productNames = new Set(Object.keys(subscriptions))
    setSubscribedProducts(productNames)

    // Load stored email if available
    const storedEmail = localStorage.getItem("userEmail")
    if (storedEmail) {
      setEmail(storedEmail)
    }
  }, [])

  // Remove the old saveSubscriptions function since we have enhanced versions now

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [allResponse, availableResponse] = await Promise.all([fetch("/api/all"), fetch("/api/available")])

        const allData = await allResponse.json()
        const availableData = await availableResponse.json()

        setAllProducts(allData)
        setAvailableProducts(availableData)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [toast])

  const handleSubscribe = async (productName: string) => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          product: productName,
        }),
      })

      if (response.ok) {
        addSubscription(productName, email)

        toast({
          title: "Subscribed!",
          description: `You'll be notified when ${productName} becomes available`,
        })
      } else {
        const errorText = await response.text()
        toast({
          title: "Subscription Failed",
          description: errorText,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe to notifications",
        variant: "destructive",
      })
    }
  }

  const handleUnsubscribe = async (productName: string) => {
    try {
      const response = await fetch("/api/notify/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          product: productName,
        }),
      })

      if (response.ok) {
        removeSubscription(productName)

        toast({
          title: "Unsubscribed",
          description: `You won't receive notifications for ${productName}`,
        })
      } else {
        const errorText = await response.text()
        toast({
          title: "Unsubscribe Failed",
          description: errorText,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unsubscribe from notifications",
        variant: "destructive",
      })
    }
  }

  const getCurrentProducts = () => {
    return activeTab === "all" ? allProducts : availableProducts
  }

  const filteredProducts = Object.entries(getCurrentProducts()).filter(([name]) =>
    name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const ProductCard = ({ name, product }: { name: string; product: Product }) => {
    const isSubscribed = subscribedProducts.has(name)
    const isAvailable = product.available === 1
    const [localEmail, setLocalEmail] = useState(email)
    const [dialogOpen, setDialogOpen] = useState(false)

    // Update local email when global email changes
    useEffect(() => {
      setLocalEmail(email)
    }, [email])

    const handleSubscribeLocal = async () => {
      if (!localEmail) {
        toast({
          title: "Email Required",
          description: "Please enter your email address",
          variant: "destructive",
        })
        return
      }
      
      // Update global email state
      setEmail(localEmail)
      await handleSubscribe(name)
      setDialogOpen(false)
    }

    const handleUnsubscribeLocal = async () => {
      await handleUnsubscribe(name)
      setDialogOpen(false)
    }

    return (
      <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden bg-gray-50">
            <Image
              src={product.images[0] ?? "/placeholder.svg?height=300&width=300"}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {!isAvailable && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Badge variant="secondary" className="bg-white/90 text-gray-900">
                  Out of Stock
                </Badge>
              </div>
            )}
            {isSubscribed && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-blue-500 hover:bg-blue-600">
                  <BellRing className="w-3 h-3 mr-1" />
                  Subscribed
                </Badge>
              </div>
            )}
          </div>

          <div className="p-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">{name}</h3>
            <p className="text-2xl font-bold text-gray-900 mb-4">₹{product.price}</p>

            <div className="flex gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant={isSubscribed ? "outline" : "default"}
                    className="flex-1"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    {isSubscribed ? "Manage Notifications" : "Notify When Available"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Notification Settings for {name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={localEmail}
                        onChange={(e) => setLocalEmail(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div className="flex gap-2">
                      {isSubscribed ? (
                        <Button variant="outline" onClick={handleUnsubscribeLocal} className="flex-1">
                          Unsubscribe
                        </Button>
                      ) : (
                        <Button onClick={handleSubscribeLocal} className="flex-1">
                          Subscribe to Notifications
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="md:text-2xl font-bold text-gray-900 ">Amul Protein Products</h1>
              <Badge variant="outline" className="hidden sm:inline-flex">
                {Object.keys(allProducts).length} Products
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-white/50"
                />
              </div>

              {subscribedProducts.size > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Badge className="bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors">
                      <BellRing className="w-3 h-3 mr-1" />
                      {subscribedProducts.size} Subscribed
                    </Badge>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Your Subscriptions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {getAllSubscriptions().length > 0 ? (
                        getAllSubscriptions()
                          .sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime())
                          .map((subscription) => (
                          <div key={subscription.productName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{subscription.productName}</h4>
                              <p className="text-sm text-gray-600">{subscription.email}</p>
                              <p className="text-xs text-gray-500">
                                Subscribed: {new Date(subscription.subscribedAt).toLocaleDateString()} at {new Date(subscription.subscribedAt).toLocaleTimeString()}
                              </p>
                            </div>
                            <Button
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                removeSubscription(subscription.productName)
                                toast({
                                  title: "Removed",
                                  description: `Unsubscribed from ${subscription.productName}`,
                                })
                              }}
                              className="ml-2"
                            >
                              Remove
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No active subscriptions</p>
                      )}
                    </div>
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>Total subscriptions: {subscribedProducts.size}</span>
                        <span>Unique emails: {getSubscriptionStats().uniqueEmails}</span>
                      </div>
                      {subscribedProducts.size > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={clearAllSubscriptions}
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Clear All Subscriptions
                        </Button>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100">
            <TabsTrigger value="all" className="data-[state=active]:bg-white">
              All Products ({Object.keys(allProducts).length})
            </TabsTrigger>
            <TabsTrigger value="available" className="data-[state=active]:bg-white">
              Available ({Object.keys(availableProducts).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(([name, product]) => (
                <ProductCard key={name} name={name} product={product} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="available" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(([name, product]) => (
                <ProductCard key={name} name={name} product={product} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </main>
    </div>
  )
}
