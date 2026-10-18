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
      await new Promise(r => setTimeout(r, 380)); // Realistic network latency
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
   * Helper to format title case
   */
  _toTitleCase(str) {
    return (str || '').toLowerCase().replace(/(?:^|\s|-|\/)\S/g, c => c.toUpperCase()).trim();
  }

  /**
   * Rich authentic sandbox data generator mirroring Swiggy MCP schemas
   * Generates exact, food-specific restaurants, dishes & Instamart products for ANY craving
   */
  _getSandboxResponse(serverType, toolName, args) {
    const rawQuery = (args.query || '').trim();
    const q = rawQuery.toLowerCase();
    const title = this._toTitleCase(rawQuery) || 'Delicious Food';

    // -------------------------------------------------------------
    // SWIGGY FOOD MCP MOCK LOGIC
    // -------------------------------------------------------------
    if (serverType === 'food') {
      if (toolName === 'search_restaurants' || toolName === 'search_menu') {
        const restaurants = this._buildFoodRestaurants(q, title);
        return {
          success: true,
          data: { restaurants }
        };
      }
    }

    // -------------------------------------------------------------
    // SWIGGY INSTAMART MCP MOCK LOGIC
    // -------------------------------------------------------------
    if (serverType === 'im') {
      if (toolName === 'search_products') {
        const products = this._buildInstamartProducts(q, title, args.groceries);
        return {
          success: true,
          data: { products }
        };
      }

      if (toolName === 'update_cart') {
        const count = args.items ? args.items.length : 3;
        const subtotal = count * 65 + 40;
        return {
          success: true,
          data: {
            cartId: "cart_im_" + Math.random().toString(36).substring(2, 9),
            itemsCount: count,
            subtotal: subtotal,
            deliveryFee: 15,
            handlingFee: 5,
            grandTotal: subtotal + 20,
            slaMinutes: 10
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
   * Generates exact restaurants and dishes for the searched food
   */
  _buildFoodRestaurants(q, title) {
    // 1. MOMOS
    if (q.includes('momo') || q.includes('dimsum') || q.includes('dumpling')) {
      return [
        {
          id: "rest_wow_momo",
          name: "Wow! Momo",
          cuisine: ["Tibetan", "Chinese", "Momos", "Fast Food"],
          rating: 4.5,
          costForTwo: "₹350 for two",
          sla: { deliveryTime: 20 },
          dishes: [
            {
              id: "dish_momo_01",
              name: "Darjeeling Veg Steamed Momos (8 Pcs)",
              price: 189,
              isVeg: true,
              description: "Handcrafted thin-wrapper dumplings filled with finely chopped cabbage, carrots, onion & mountain spices. Served with fiery red momo chutney.",
              rating: 4.6
            },
            {
              id: "dish_momo_02",
              name: "Pan Fried Schezwan Chicken Momos (8 Pcs)",
              price: 249,
              isVeg: false,
              description: "Pan-crisped chicken dumplings tossed in rich, tangy Schezwan sauce.",
              rating: 4.7
            }
          ],
          coupons: [{ code: "MOMOMAGIC", discount: "Flat ₹50 OFF", minOrder: 199 }]
        },
        {
          id: "rest_momo_zone",
          name: "Momo Zone - The Momo Company",
          cuisine: ["Street Food", "Momos", "Snacks"],
          rating: 4.3,
          costForTwo: "₹300 for two",
          sla: { deliveryTime: 18 },
          dishes: [
            {
              id: "dish_momo_03",
              name: "Kurkure Cheese & Corn Momos (6 Pcs)",
              price: 219,
              isVeg: true,
              description: "Extra-crunchy panko-crusted fried momos stuffed with molten mozzarella & sweet corn.",
              rating: 4.5
            }
          ],
          coupons: [{ code: "SWIGGY50", discount: "20% OFF", minOrder: 150 }]
        },
        {
          id: "rest_himalayan_cafe",
          name: "The Himalayan Cafe & Kitchen",
          cuisine: ["Tibetan", "Asian", "Soups"],
          rating: 4.6,
          costForTwo: "₹450 for two",
          sla: { deliveryTime: 24 },
          dishes: [
            {
              id: "dish_momo_04",
              name: "Authentic Kothey Fried Momos & Thukpa",
              price: 220,
              isVeg: true,
              description: "Half-steamed half-crisped pan-seared momos served with clear vegetable thukpa broth.",
              rating: 4.8
            }
          ],
          coupons: [{ code: "TASTY30", discount: "15% OFF", minOrder: 249 }]
        }
      ];
    }

    // 2. PAV BHAJI
    if (q.includes('pav') || q.includes('bhaji') || q.includes('pavbhaji')) {
      return [
        {
          id: "rest_sardar_pavbhaji",
          name: "Sardar Refreshments & Pav Bhaji",
          cuisine: ["Street Food", "Mumbai", "Fast Food"],
          rating: 4.6,
          costForTwo: "₹300 for two",
          sla: { deliveryTime: 18 },
          dishes: [
            {
              id: "dish_pb_01",
              name: "Special Amul Butter Pav Bhaji + 2 Soft Pavs",
              price: 195,
              isVeg: true,
              description: "Mumbai-style slow-simmered spiced mashed potato, cauliflower & green peas bhaji drenched in melting Amul butter. Served with chopped onions & lemon wedge.",
              rating: 4.7
            },
            {
              id: "dish_pb_02",
              name: "Extra Amul Butter Toasted Pav (Pair)",
              price: 45,
              isVeg: true,
              description: "Fluffy ladi pavs roasted golden-brown on the tawa with generous butter and pav bhaji masala.",
              rating: 4.8
            }
          ],
          coupons: [{ code: "MUMBAI50", discount: "20% OFF up to ₹50", minOrder: 149 }]
        },
        {
          id: "rest_shiv_sagar",
          name: "Shiv Sagar Pure Veg",
          cuisine: ["North Indian", "Street Food", "Fast Food"],
          rating: 4.4,
          costForTwo: "₹400 for two",
          sla: { deliveryTime: 22 },
          dishes: [
            {
              id: "dish_pb_03",
              name: "Grated Amul Cheese Pav Bhaji",
              price: 235,
              isVeg: true,
              description: "Signature spiced bhaji loaded with a thick mountain of freshly grated cheddar cheese.",
              rating: 4.5
            }
          ],
          coupons: [{ code: "VEGDEAL", discount: "Flat ₹40 OFF", minOrder: 199 }]
        },
        {
          id: "rest_amar_juice",
          name: "Amar Fast Food & Juice Centre",
          cuisine: ["Fast Food", "Beverages", "Street Food"],
          rating: 4.5,
          costForTwo: "₹350 for two",
          sla: { deliveryTime: 20 },
          dishes: [
            {
              id: "dish_pb_04",
              name: "Khada Pav Bhaji Special",
              price: 210,
              isVeg: true,
              description: "Chunky vegetable bhaji with visible sautéed capsicum, tomato chunks, and spicy Kolhapuri masala.",
              rating: 4.6
            }
          ],
          coupons: [{ code: "FEAST100", discount: "Flat ₹100 OFF", minOrder: 399 }]
        }
      ];
    }

    // 3. BIRYANI
    if (q.includes('biryani') || q.includes('pulao')) {
      const isChicken = q.includes('chicken') || q.includes('non');
      return [
        {
          id: "rest_meghana_foods",
          name: "Meghana Foods",
          cuisine: ["Biryani", "Andhra", "North Indian"],
          rating: 4.5,
          costForTwo: "₹500 for two",
          sla: { deliveryTime: 22 },
          dishes: [
            {
              id: "dish_bir_01",
              name: isChicken ? "Hyderabadi Chicken Dum Biryani" : "Special Paneer Dum Biryani",
              price: isChicken ? 360 : 320,
              isVeg: !isChicken,
              description: "Fragrant basmati rice layered with aromatic Indian spices, caramelized onions, served with cooling cucumber raita and spicy salan.",
              rating: 4.7
            }
          ],
          coupons: [{ code: "SWIGGYIT", discount: "20% OFF", minOrder: 199 }]
        },
        {
          id: "rest_behrouz",
          name: "Behrouz Biryani - Royal Flavours",
          cuisine: ["Mughlai", "Biryani", "Kebabs"],
          rating: 4.4,
          costForTwo: "₹650 for two",
          sla: { deliveryTime: 26 },
          dishes: [
            {
              id: "dish_bir_02",
              name: isChicken ? "Dum Gosht / Chicken Biryani (Personal)" : "Subz-e-Faluk Paneer Biryani",
              price: isChicken ? 395 : 340,
              isVeg: !isChicken,
              description: "Slow dum-cooked with saffron-infused basmati, garnished with fried cashews & golden fried onions.",
              rating: 4.6
            }
          ],
          coupons: [{ code: "ROYAL60", discount: "Flat ₹60 OFF", minOrder: 299 }]
        }
      ];
    }

    // 4. PIZZA
    if (q.includes('pizza') || q.includes('italian')) {
      return [
        {
          id: "rest_lapinoz",
          name: "La Pino'z Pizza",
          cuisine: ["Italian", "Pizza", "Fast Food"],
          rating: 4.4,
          costForTwo: "₹450 for two",
          sla: { deliveryTime: 25 },
          dishes: [
            {
              id: "dish_piz_01",
              name: "Farm Villa Gourmet Pizza (Regular 7\")",
              price: 245,
              isVeg: true,
              description: "Crunchy bell peppers, red onions, juicy sweet corn, fresh tomatoes & 100% mozzarella.",
              rating: 4.5
            }
          ],
          coupons: [{ code: "PIZZA50", discount: "50% OFF up to ₹100", minOrder: 249 }]
        },
        {
          id: "rest_toscano",
          name: "Toscano & Pizzeria",
          cuisine: ["Italian", "Pizza", "Pasta"],
          rating: 4.6,
          costForTwo: "₹800 for two",
          sla: { deliveryTime: 30 },
          dishes: [
            {
              id: "dish_piz_02",
              name: "Classic Sourdough Margherita",
              price: 395,
              isVeg: true,
              description: "San Marzano marinara, fresh bocconcini mozzarella, extra virgin olive oil and sweet basil.",
              rating: 4.8
            }
          ],
          coupons: [{ code: "ITALIAN40", discount: "Flat ₹75 OFF", minOrder: 399 }]
        }
      ];
    }

    // 5. BURGER
    if (q.includes('burger')) {
      return [
        {
          id: "rest_burger_king",
          name: "Burger King",
          cuisine: ["Burgers", "American", "Fast Food"],
          rating: 4.3,
          costForTwo: "₹350 for two",
          sla: { deliveryTime: 18 },
          dishes: [
            {
              id: "dish_bur_01",
              name: "Crispy Veg Double Patty Whopper",
              price: 189,
              isVeg: true,
              description: "Toasted sesame bun, double crispy vegetable patties, creamy mayo, fresh lettuce and sliced tomatoes.",
              rating: 4.4
            }
          ],
          coupons: [{ code: "BKFEST", discount: "20% OFF", minOrder: 159 }]
        },
        {
          id: "rest_boss_burger",
          name: "Boss Burger Co.",
          cuisine: ["Burgers", "Gourmet", "Fries"],
          rating: 4.5,
          costForTwo: "₹500 for two",
          sla: { deliveryTime: 24 },
          dishes: [
            {
              id: "dish_bur_02",
              name: "Smash Cheese Melt Burger",
              price: 279,
              isVeg: true,
              description: "Brioche bun, melted aged cheddar, caramelized onions, house truffle mayo and crispy patty.",
              rating: 4.6
            }
          ],
          coupons: [{ code: "BOSS50", discount: "Flat ₹50 OFF", minOrder: 249 }]
        }
      ];
    }

    // 6. CHAI / TEA / COFFEE
    if (q.includes('chai') || q.includes('tea') || q.includes('coffee') || q.includes('latte')) {
      const isCoffee = q.includes('coffee') || q.includes('latte');
      return [
        {
          id: "rest_chaipoint",
          name: isCoffee ? "Third Wave Coffee" : "Chai Point",
          cuisine: ["Beverages", "Snacks", "Cafe"],
          rating: 4.5,
          costForTwo: "₹250 for two",
          sla: { deliveryTime: 15 },
          dishes: [
            {
              id: "dish_bev_01",
              name: isCoffee ? "Iced Classic Vanilla Latte (350ml)" : "Fresh Adrak Masala Chai Flask (500ml)",
              price: isCoffee ? 230 : 160,
              isVeg: true,
              description: isCoffee ? "Double espresso shot blended with cold whole milk and Madagascar vanilla syrup." : "Handcrafted tea brewed with crushed fresh ginger, cardamom & fresh cow milk.",
              rating: 4.6
            }
          ],
          coupons: [{ code: "BREW20", discount: "20% OFF", minOrder: 149 }]
        }
      ];
    }

    // 7. UNIVERSAL DYNAMIC ENGINE (ANY OTHER FOOD)
    return [
      {
        id: `rest_${q.replace(/[^a-z0-9]/g, '_')}_01`,
        name: `${title} Kitchen & Express`,
        cuisine: [title, "North Indian", "Fast Food"],
        rating: 4.5,
        costForTwo: "₹400 for two",
        sla: { deliveryTime: 22 },
        dishes: [
          {
            id: `dish_${q.replace(/[^a-z0-9]/g, '_')}_1`,
            name: `Special Authentic ${title} Platter`,
            price: 260,
            isVeg: !q.includes('chicken') && !q.includes('mutton') && !q.includes('fish'),
            description: `Freshly prepared chef's special ${title}, cooked with premium ingredients and authentic spices. Served hot with accompanying dips and garnishes.`,
            rating: 4.6
          },
          {
            id: `dish_${q.replace(/[^a-z0-9]/g, '_')}_2`,
            name: `Classic Handcrafted ${title}`,
            price: 210,
            isVeg: !q.includes('chicken') && !q.includes('mutton') && !q.includes('fish'),
            description: `Traditional homestyle preparation of ${title} with rich aroma and balanced seasonings.`,
            rating: 4.4
          }
        ],
        coupons: [{ code: "SWIGGYDEAL", discount: "20% OFF up to ₹50", minOrder: 199 }]
      },
      {
        id: `rest_${q.replace(/[^a-z0-9]/g, '_')}_02`,
        name: `The Royal ${title} Corner`,
        cuisine: [title, "Street Food", "Snacks"],
        rating: 4.4,
        costForTwo: "₹300 for two",
        sla: { deliveryTime: 18 },
        dishes: [
          {
            id: `dish_${q.replace(/[^a-z0-9]/g, '_')}_3`,
            name: `Crispy Tossed ${title} Special`,
            price: 225,
            isVeg: true,
            description: `Quick-fired ${title} seasoned to perfection and served warm.`,
            rating: 4.5
          }
        ],
        coupons: [{ code: "TASTY15", discount: "Flat ₹40 OFF", minOrder: 199 }]
      }
    ];
  }

  /**
   * Generates exact, food-specific Instamart products & ingredients for ANY craving
   */
  _buildInstamartProducts(q, title, groceriesList) {
    // 1. MOMOS
    if (q.includes('momo') || q.includes('dimsum') || q.includes('dumpling')) {
      return [
        this._makeProduct("Fortune Maida / All-Purpose Flour", "Fortune", 48, 42, "Pack of 500 g", "Essential thin dough wrapper for steamed/fried momos"),
        this._makeProduct("Fresh Cabbage & Shredded Carrots Combo", "Instamart Fresh", 65, 49, "500 g Combo Pack", "Crisp vegetable filling for authentic momos"),
        this._makeProduct("Ching's Secret Schezwan Chutney", "Ching's", 85, 75, "Bottle of 250 g", "Fiery red garlic momo dipping chutney"),
        this._makeProduct("Fresh Spring Onion & Garlic", "Instamart Fresh", 40, 32, "200 g Combo Pack", "Aromatic seasoning for dumpling stuffing")
      ];
    }

    // 2. PAV BHAJI
    if (q.includes('pav') || q.includes('bhaji') || q.includes('pavbhaji')) {
      return [
        this._makeProduct("The Baker's Dozen Fresh Ladi Pav", "The Baker's Dozen", 50, 44, "Pack of 6 Pavs", "Pillowy soft traditional Mumbai pavs"),
        this._makeProduct("Amul Pasteurized Butter", "Amul", 60, 56, "Pack of 100 g", "Crucial rich butter for topping and toasting pavs"),
        this._makeProduct("Fresh Potatoes (1 kg) & Green Peas (500 g)", "Instamart Fresh", 95, 79, "Fresh Veggie Combo", "Core vegetable base for thick mashed bhaji"),
        this._makeProduct("Everest Pav Bhaji Masala", "Everest", 82, 74, "Carton of 100 g", "Authentic blend of roasted spices for rich red bhaji"),
        this._makeProduct("Fresh Tomatoes & Onions Combo", "Instamart Fresh", 70, 58, "1 kg (500g each)", "For fresh gravy base and chopped onion garnish")
      ];
    }

    // 3. BIRYANI
    if (q.includes('biryani') || q.includes('pulao')) {
      const isChicken = q.includes('chicken');
      return [
        this._makeProduct("India Gate Super Basmati Rice", "India Gate", 195, 168, "Bag of 1 kg", "Extra long-grain fragrant rice"),
        this._makeProduct(isChicken ? "Fresh Chicken Breast Boneless" : "Amul Malai Fresh Paneer", isChicken ? "Fresh Meat" : "Amul", isChicken ? 180 : 95, isChicken ? 155 : 89, isChicken ? "450 g Pack" : "200 g Pack", "Protein centerpiece for dum biryani"),
        this._makeProduct("Fresh Red Onions & Mint Leaves", "Instamart Fresh", 55, 45, "1 kg Combo", "For crispy golden birista & herb layers"),
        this._makeProduct("Everest Shahi Biryani Masala", "Everest", 85, 76, "Box of 50 g", "Aromatic royal biryani spice blend")
      ];
    }

    // 4. PIZZA
    if (q.includes('pizza') || q.includes('italian')) {
      return [
        this._makeProduct("English Oven Thin Crust Pizza Base", "English Oven", 65, 55, "Pack of 2 Bases (8\")", "Ready to bake artisan crust"),
        this._makeProduct("Amul Diced Mozzarella Pizza Cheese", "Amul", 130, 115, "Pouch of 200 g", "Perfect gooey cheese pull"),
        this._makeProduct("Veeba Pizza & Pasta Sauce", "Veeba", 99, 85, "Jar of 280 g", "Herb-infused Italian tomato sauce"),
        this._makeProduct("Fresh Red & Yellow Bell Peppers", "Instamart Fresh", 80, 65, "Pack of 2 Peppers", "Crisp gourmet vegetable toppings")
      ];
    }

    // 5. BURGER
    if (q.includes('burger')) {
      return [
        this._makeProduct("English Oven Sesame Burger Buns", "English Oven", 55, 48, "Pack of 4 Buns", "Soft golden seeded buns"),
        this._makeProduct("ITC Master Chef Crispy Veggie Patties", "ITC", 175, 149, "Pack of 4 Patties (400g)", "Ready to fry crispy burger patties"),
        this._makeProduct("Amul Processed Cheese Slices", "Amul", 90, 82, "Pack of 5 Slices (100g)", "Melt-in-mouth cheese slices"),
        this._makeProduct("Veeba Creamy Burger Mayonnaise", "Veeba", 89, 75, "Pouch of 250 g", "Zesty burger dressing")
      ];
    }

    // 6. CHAI / COFFEE / BEVERAGE
    if (q.includes('chai') || q.includes('tea') || q.includes('coffee')) {
      const isCoffee = q.includes('coffee') || q.includes('latte');
      return [
        this._makeProduct(isCoffee ? "Nescafe Classic Instant Coffee" : "Brooke Bond Taj Mahal Tea", isCoffee ? "Nescafe" : "Brooke Bond", isCoffee ? 190 : 165, isCoffee ? 169 : 145, isCoffee ? "Jar of 100 g" : "Pack of 250 g", "Rich aromatic brew"),
        this._makeProduct("Nandini GoodLife Toned Milk", "Nandini", 48, 46, "Pouch of 1 L", "Fresh creamy milk for beverages"),
        this._makeProduct(isCoffee ? "Hershey's Chocolate Syrup" : "Fresh Ginger & Green Cardamom", isCoffee ? "Hershey's" : "Instamart Fresh", isCoffee ? 120 : 45, isCoffee ? 105 : 36, isCoffee ? "Bottle of 200 g" : "Fresh Combo", "Flavor enhancement")
      ];
    }

    // 7. UNIVERSAL RECIPE INGREDIENT GENERATOR FOR ANY OTHER FOOD
    const items = groceriesList && groceriesList.length > 0 ? groceriesList : this.decomposeCravingToGroceries(q);
    
    return items.map((item, idx) => {
      const basePrices = [95, 60, 45, 75, 50];
      const mrp = basePrices[idx % basePrices.length];
      const offer = mrp - Math.floor(mrp * 0.12);
      return this._makeProduct(
        item.name,
        "Instamart Fresh / Staple",
        mrp,
        offer,
        "Pack for 2 servings",
        `Essential fresh ingredient to cook ${title} at home in 10-15 mins`
      );
    });
  }

  /**
   * Helper to format Swiggy Instamart product schema
   */
  _makeProduct(displayName, brand, mrp, offerPrice, quantityDesc, subtitle = "") {
    const id = "prod_" + displayName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return {
      displayName: displayName,
      brand: brand,
      inStock: true,
      isAvail: true,
      productId: id,
      variations: [{
        spinId: "spin_" + id,
        skuId: "sku_" + id,
        displayName: displayName + (quantityDesc ? ` (${quantityDesc})` : ''),
        brandName: brand,
        price: { mrp: mrp, offerPrice: offerPrice },
        quantityDescription: quantityDesc,
        isInStockAndAvailable: true,
        sla: { value: "8-12", unit: "mins" },
        vegClassifier: displayName.toLowerCase().includes('chicken') || displayName.toLowerCase().includes('meat') ? "NON_VEG" : "VEG"
      }]
    };
  }

  /**
   * Intelligently breaks down ANY dish/craving into grocery essentials
   */
  decomposeCravingToGroceries(craving) {
    const c = (craving || '').toLowerCase();
    const title = this._toTitleCase(craving);

    // Momos
    if (c.includes('momo') || c.includes('dimsum') || c.includes('dumpling')) {
      return [
        { name: "Maida / All-Purpose Flour (500g)", query: "maida", optional: false },
        { name: "Fresh Cabbage & Grated Carrots (500g)", query: "cabbage", optional: false },
        { name: "Schezwan Momo Chutney (250g)", query: "schezwan sauce", optional: false },
        { name: "Spring Onion & Fresh Garlic", query: "garlic", optional: true }
      ];
    }

    // Pav Bhaji
    if (c.includes('pav') || c.includes('bhaji') || c.includes('pavbhaji')) {
      return [
        { name: "Fresh Ladi Pavs (Pack of 6)", query: "ladi pav", optional: false },
        { name: "Amul Butter (100g)", query: "amul butter", optional: false },
        { name: "Potatoes (1kg) & Green Peas (500g)", query: "potato", optional: false },
        { name: "Pav Bhaji Masala (100g)", query: "pav bhaji masala", optional: false },
        { name: "Fresh Tomatoes & Onions", query: "tomato", optional: true }
      ];
    }

    // Biryani
    if (c.includes('biryani') || c.includes('pulao')) {
      const isChicken = c.includes('chicken');
      return [
        { name: "Super Basmati Rice (1kg)", query: "basmati rice", optional: false },
        { name: isChicken ? "Fresh Boneless Chicken (450g)" : "Fresh Malai Paneer (200g)", query: isChicken ? "chicken" : "paneer", optional: false },
        { name: "Red Onions & Mint Leaves", query: "onion", optional: false },
        { name: "Shahi Biryani Masala", query: "biryani masala", optional: true }
      ];
    }

    // Pizza
    if (c.includes('pizza')) {
      return [
        { name: "Fresh Pizza Base (Pack of 2)", query: "pizza base", optional: false },
        { name: "Mozzarella Pizza Cheese (200g)", query: "mozzarella cheese", optional: false },
        { name: "Pizza & Pasta Sauce (280g)", query: "pizza sauce", optional: false },
        { name: "Fresh Bell Peppers & Sweet Corn", query: "capsicum", optional: true }
      ];
    }

    // Burger
    if (c.includes('burger')) {
      return [
        { name: "Sesame Burger Buns (Pack of 4)", query: "burger bun", optional: false },
        { name: "Crispy Veg / Chicken Patties (Pack of 4)", query: "patties", optional: false },
        { name: "Amul Cheese Slices (Pack of 5)", query: "cheese slice", optional: false },
        { name: "Burger Mayonnaise (250g)", query: "mayonnaise", optional: true }
      ];
    }

    // Chai / Coffee
    if (c.includes('chai') || c.includes('tea') || c.includes('coffee')) {
      const isCoffee = c.includes('coffee');
      return [
        { name: isCoffee ? "Instant Coffee Jar (100g)" : "Premium Tea Leaves (250g)", query: isCoffee ? "coffee" : "tea", optional: false },
        { name: "Fresh Toned Milk (1L)", query: "milk", optional: false },
        { name: isCoffee ? "Sugar / Vanilla Flavour" : "Fresh Ginger & Cardamom", query: "ginger", optional: true }
      ];
    }

    // UNIVERSAL FOOD DECOMPOSITION
    return [
      { name: `Fresh Key Ingredients for ${title}`, query: c.split(' ')[0] || "paneer", optional: false },
      { name: `Cooking Butter / Refined Oil`, query: "butter", optional: false },
      { name: `Aromatic Spices & Seasoning for ${title}`, query: "spices", optional: false },
      { name: `Fresh Herb & Vegetable Garnish Pack`, query: "onion", optional: true }
    ];
  }
}

// Export for browser and node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SwiggyMcpClient;
}
