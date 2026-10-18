/**
 * Swiggy MCP Client
 * Implements JSON-RPC 2.0 communication with Swiggy MCP servers:
 * - https://mcp.swiggy.com/food (Swiggy Food)
 * - https://mcp.swiggy.com/im   (Swiggy Instamart)
 */

class SwiggyMcpClient {
  constructor(options = {}) {
    this.token = options.token || '';
    this.isSandbox = options.isSandbox !== undefined ? options.isSandbox : true;
    this.foodUrl = options.foodUrl || 'https://mcp.swiggy.com/food';
    this.instamartUrl = options.instamartUrl || 'https://mcp.swiggy.com/im';
    this.requestId = 1;
    this.onLog = options.onLog || (() => {});
  }

  setToken(token) {
    this.token = token;
    if (token && token.trim().length > 0) {
      this.isSandbox = false;
    }
  }

  setSandbox(isSandbox) {
    this.isSandbox = isSandbox;
  }

  /**
   * Dispatches a JSON-RPC 2.0 tools/call to Swiggy MCP endpoint
   */
  async callTool(serverType, toolName, args = {}) {
    const endpoint = serverType === 'food' ? this.foodUrl : this.instamartUrl;
    const reqPayload = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
      },
      id: this.requestId++
    };

    this.onLog({
      type: 'request',
      server: serverType,
      endpoint,
      payload: reqPayload,
      timestamp: new Date().toLocaleTimeString()
    });

    if (this.isSandbox) {
      await new Promise(r => setTimeout(r, 450)); // Realistic network latency
      const mockResult = this._getSandboxResponse(serverType, toolName, args);
      this.onLog({
        type: 'response',
        server: serverType,
        payload: mockResult,
        isSandbox: true,
        timestamp: new Date().toLocaleTimeString()
      });
      return mockResult;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(reqPayload)
      });

      const data = await response.json();
      this.onLog({
        type: 'response',
        server: serverType,
        status: response.status,
        payload: data,
        isSandbox: false,
        timestamp: new Date().toLocaleTimeString()
      });

      if (!response.ok) {
        throw new Error(data.error_description || data.error?.message || `HTTP ${response.status}`);
      }

      return data.result || data;
    } catch (err) {
      this.onLog({
        type: 'error',
        server: serverType,
        error: err.message,
        timestamp: new Date().toLocaleTimeString()
      });
      throw err;
    }
  }

  /**
   * Rich authentic sandbox data generator mirroring Swiggy MCP schemas
   */
  _getSandboxResponse(serverType, toolName, args) {
    const q = (args.query || '').toLowerCase();

    if (serverType === 'food') {
      if (toolName === 'search_restaurants' || toolName === 'search_menu') {
        return {
          success: true,
          data: {
            restaurants: [
              {
                id: "rest_meghana_01",
                name: "Meghana Foods",
                cuisine: ["Biryani", "Andhra", "North Indian"],
                rating: 4.5,
                ratingCount: "25K+",
                costForTwo: "₹500 for two",
                sla: { deliveryTime: 22, minDeliveryTime: 20, maxDeliveryTime: 25 },
                address: "Koramangala 5th Block, Bangalore",
                dishes: [
                  {
                    id: "dish_01",
                    name: "Special Paneer Biryani",
                    price: 320,
                    inStock: true,
                    isVeg: true,
                    description: "Fragrant basmati rice layered with spiced paneer cubes, served with raita & salan.",
                    rating: 4.6
                  },
                  {
                    id: "dish_02",
                    name: "Hyderabadi Chicken Biryani",
                    price: 360,
                    inStock: true,
                    isVeg: false,
                    description: "Authentic dum biryani slow-cooked with tender marinated chicken.",
                    rating: 4.7
                  }
                ],
                coupons: [
                  { code: "SWIGGYIT", discount: "20% OFF up to ₹50", minOrder: 199 },
                  { code: "FEAST100", discount: "Flat ₹100 OFF", minOrder: 399 }
                ]
              },
              {
                id: "rest_toscano_02",
                name: "Toscano & Pizzeria",
                cuisine: ["Italian", "Pizza", "Pasta", "Desserts"],
                rating: 4.6,
                ratingCount: "12K+",
                costForTwo: "₹900 for two",
                sla: { deliveryTime: 30, minDeliveryTime: 25, maxDeliveryTime: 35 },
                address: "Indiranagar 100ft Road, Bangalore",
                dishes: [
                  {
                    id: "dish_03",
                    name: "Handcrafted Fettuccine Alfredo",
                    price: 440,
                    inStock: true,
                    isVeg: true,
                    description: "Tossed in garlic parmesan cream sauce with toasted herb croutons.",
                    rating: 4.5
                  },
                  {
                    id: "dish_04",
                    name: "Classic Margherita Sourdough",
                    price: 495,
                    inStock: true,
                    isVeg: true,
                    description: "San Marzano tomatoes, fresh buffalo mozzarella, fresh basil.",
                    rating: 4.8
                  }
                ],
                coupons: [
                  { code: "ITALIAN50", discount: "₹50 OFF", minOrder: 349 }
                ]
              },
              {
                id: "rest_chaipoint_03",
                name: "Chai Point & All Day Snacks",
                cuisine: ["Beverages", "Snacks", "Street Food", "Bakery"],
                rating: 4.3,
                ratingCount: "18K+",
                costForTwo: "₹250 for two",
                sla: { deliveryTime: 16, minDeliveryTime: 14, maxDeliveryTime: 18 },
                address: "HSR Layout Sector 3, Bangalore",
                dishes: [
                  {
                    id: "dish_05",
                    name: "Ginger Masala Chai (Flask 500ml)",
                    price: 160,
                    inStock: true,
                    isVeg: true,
                    description: "Freshly brewed with crushed ginger and Indian spices in heat-retaining flask.",
                    rating: 4.4
                  },
                  {
                    id: "dish_06",
                    name: "Crispy Samosa (Set of 2) + Mint Chutney",
                    price: 90,
                    inStock: true,
                    isVeg: true,
                    description: "Flaky crust stuffed with spicy potato & green peas filling.",
                    rating: 4.2
                  }
                ],
                coupons: [
                  { code: "CHAI10", discount: "10% OFF", minOrder: 149 }
                ]
              }
            ]
          }
        };
      }
    }

    if (serverType === 'im') {
      if (toolName === 'search_products') {
        const queryLower = q;
        const catalog = [
          {
            displayName: "Amul Malai Fresh Paneer",
            brand: "Amul",
            inStock: true,
            isAvail: true,
            productId: "prod_paneer_200g",
            variations: [{
              spinId: "spin_pan_01",
              skuId: "sku_pan_200",
              displayName: "Amul Malai Fresh Paneer (200 g)",
              brandName: "Amul",
              price: { mrp: 95, offerPrice: 89 },
              isInStockAndAvailable: true,
              sla: { value: "8-12", unit: "mins" },
              vegClassifier: "VEG"
            }]
          },
          {
            displayName: "India Gate Basmati Rice Super",
            brand: "India Gate",
            inStock: true,
            isAvail: true,
            productId: "prod_rice_1kg",
            variations: [{
              spinId: "spin_rice_01",
              skuId: "sku_rice_1k",
              displayName: "India Gate Basmati Rice Super (1 kg)",
              brandName: "India Gate",
              price: { mrp: 180, offerPrice: 155 },
              isInStockAndAvailable: true,
              sla: { value: "8-12", unit: "mins" },
              vegClassifier: "VEG"
            }]
          },
          {
            displayName: "Fresh Red Onions",
            brand: "Instamart Fresh",
            inStock: true,
            isAvail: true,
            productId: "prod_onion_1kg",
            variations: [{
              spinId: "spin_onion_01",
              skuId: "sku_onion_1k",
              displayName: "Fresh Red Onion (1 kg)",
              brandName: "Instamart Fresh",
              price: { mrp: 45, offerPrice: 38 },
              isInStockAndAvailable: true,
              sla: { value: "8-12", unit: "mins" },
              vegClassifier: "VEG"
            }]
          },
          {
            displayName: "Barilla Durum Wheat Fettuccine / Penne",
            brand: "Barilla",
            inStock: true,
            isAvail: true,
            productId: "prod_pasta_500g",
            variations: [{
              spinId: "spin_pasta_01",
              skuId: "sku_pasta_500",
              displayName: "Barilla Penne Rigate Pasta (500 g)",
              brandName: "Barilla",
              price: { mrp: 275, offerPrice: 239 },
              isInStockAndAvailable: true,
              sla: { value: "8-12", unit: "mins" },
              vegClassifier: "VEG"
            }]
          },
          {
            displayName: "Amul Fresh Cream 250ml",
            brand: "Amul",
            inStock: true,
            isAvail: true,
            productId: "prod_cream_250",
            variations: [{
              spinId: "spin_cream_01",
              skuId: "sku_cream_250",
              displayName: "Amul Fresh Cream (250 ml)",
              brandName: "Amul",
              price: { mrp: 70, offerPrice: 65 },
              isInStockAndAvailable: true,
              sla: { value: "8-12", unit: "mins" },
              vegClassifier: "VEG"
            }]
          },
          {
            displayName: "Nandini GoodLife Toned Milk 1L",
            brand: "Nandini",
            inStock: true,
            isAvail: true,
            productId: "prod_milk_1l",
            variations: [{
              spinId: "spin_milk_01",
              skuId: "sku_milk_1l",
              displayName: "Nandini Toned Milk (1 L)",
              brandName: "Nandini",
              price: { mrp: 48, offerPrice: 46 },
              isInStockAndAvailable: true,
              sla: { value: "8-12", unit: "mins" },
              vegClassifier: "VEG"
            }]
          },
          {
            displayName: "Taj Mahal Tea 250g",
            brand: "Brooke Bond",
            inStock: true,
            isAvail: true,
            productId: "prod_tea_250",
            variations: [{
              spinId: "spin_tea_01",
              skuId: "sku_tea_250",
              displayName: "Brooke Bond Taj Mahal Tea (250 g)",
              brandName: "Brooke Bond",
              price: { mrp: 165, offerPrice: 145 },
              isInStockAndAvailable: true,
              sla: { value: "8-12", unit: "mins" },
              vegClassifier: "VEG"
            }]
          },
          {
            displayName: "Fresh Ginger & Green Chillies Combo",
            brand: "Instamart Fresh",
            inStock: true,
            isAvail: true,
            productId: "prod_ginger_chilli",
            variations: [{
              spinId: "spin_gin_01",
              skuId: "sku_gin_combo",
              displayName: "Fresh Ginger (100g) + Chillies (100g)",
              brandName: "Instamart Fresh",
              price: { mrp: 35, offerPrice: 28 },
              isInStockAndAvailable: true,
              sla: { value: "8-12", unit: "mins" },
              vegClassifier: "VEG"
            }]
          }
        ];

        // Filter based on query or return top picks
        const matched = catalog.filter(p => 
          p.displayName.toLowerCase().includes(queryLower) ||
          p.brand.toLowerCase().includes(queryLower) ||
          queryLower.includes(p.brand.toLowerCase())
        );

        return {
          success: true,
          data: {
            products: matched.length > 0 ? matched : catalog.slice(0, 4)
          }
        };
      }

      if (toolName === 'update_cart') {
        return {
          success: true,
          data: {
            cartId: "cart_im_" + Math.random().toString(36).substring(2, 9),
            itemsCount: args.items ? args.items.length : 1,
            subtotal: 310,
            deliveryFee: 15,
            handlingFee: 5,
            grandTotal: 330,
            slaMinutes: 11
          },
          message: "Cart updated successfully with Instamart items!"
        };
      }
    }

    return {
      success: true,
      data: { message: `Executed ${toolName} on ${serverType}` }
    };
  }

  /**
   * Intelligently breaks down any dish/craving into grocery essentials
   */
  decomposeCravingToGroceries(craving) {
    const c = craving.toLowerCase();
    
    if (c.includes('biryani') || c.includes('pulao')) {
      return [
        { name: "Basmati Rice", query: "basmati rice", optional: false },
        { name: "Paneer or Chicken", query: c.includes('chicken') ? "chicken breast" : "paneer", optional: false },
        { name: "Onions & Mint", query: "onion", optional: false },
        { name: "Biryani Masala", query: "biryani masala", optional: true }
      ];
    }
    
    if (c.includes('pasta') || c.includes('alfredo') || c.includes('italian')) {
      return [
        { name: "Penne / Fettuccine Pasta", query: "pasta", optional: false },
        { name: "Fresh Cream / Cheese", query: "amul fresh cream", optional: false },
        { name: "Garlic & Herbs", query: "garlic", optional: false },
        { name: "Olive Oil / Butter", query: "butter", optional: true }
      ];
    }

    if (c.includes('chai') || c.includes('tea') || c.includes('snack') || c.includes('samosa')) {
      return [
        { name: "Premium Tea Leaves", query: "tea", optional: false },
        { name: "Fresh Milk", query: "milk", optional: false },
        { name: "Fresh Ginger", query: "ginger", optional: false },
        { name: "Ready-to-Fry Samosas / Biscuits", query: "samosa", optional: true }
      ];
    }

    if (c.includes('coffee') || c.includes('latte')) {
      return [
        { name: "Instant Coffee / Brew", query: "coffee", optional: false },
        { name: "Fresh Milk", query: "milk", optional: false },
        { name: "Brown Sugar / Sweetener", query: "sugar", optional: true }
      ];
    }

    // Default fallback breakdown
    return [
      { name: "Main Ingredient for " + craving, query: craving.split(' ')[0] || "paneer", optional: false },
      { name: "Cooking Oil / Butter", query: "butter", optional: false },
      { name: "Fresh Seasoning & Spices", query: "spices", optional: true }
    ];
  }
}

// Export for browser and node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SwiggyMcpClient;
}
