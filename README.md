# 🛵 Swiggy CraveCraft — AI Craving & Grocery Copilot

An AI-powered commerce assistant built on **Swiggy's Model Context Protocol (MCP)** platform.

It solves a daily dilemma: **"I have a craving — should I order it ready-to-eat from Swiggy Food, or get the ingredients delivered in 10 minutes via Instamart to cook it?"**

---

## 🌟 Features

1. **Dual Swiggy MCP Integration**:
   - 🍔 **Swiggy Food MCP (`/food`)**: Runs `search_restaurants`, `search_menu`, and checks coupons (`fetch_food_coupons`) with ratings, ETA, and price.
   - ⚡ **Swiggy Instamart MCP (`/im`)**: Deconstructs any recipe into grocery staples, calls `search_products`, picks matching SKUs/spinIds, and prepares an `update_cart` payload.
2. **Side-by-Side Decision Matrix**:
   - Compares **Total Cost**, **Delivery Time**, and **Effort** side-by-side.
3. **Live MCP JSON-RPC Inspector**:
   - Shows the exact JSON-RPC 2.0 payloads sent and received (`method: "tools/call"`).
4. **Zero-Friction Dual Engine**:
   - **Sandbox Mode**: Works right away with authentic Swiggy mock schemas (Bangalore, Mumbai, Delhi).
   - **Live MCP Mode**: Plug in your Swiggy Bearer token to query `https://mcp.swiggy.com/food` and `https://mcp.swiggy.com/im` directly.

---

## 🚀 Quick Start

Simply serve the folder with any static file server:

```bash
# Using Python
python -m http.server 3000

# OR using Node
npx serve .
```

Open `http://localhost:3000` in your browser.

---

## 🛠️ Swiggy MCP Endpoints Used

- **Food**: `https://mcp.swiggy.com/food`
  - `search_restaurants`
  - `search_menu`
  - `fetch_food_coupons`
- **Instamart**: `https://mcp.swiggy.com/im`
  - `search_products`
  - `update_cart`
  - `list_coupons`
