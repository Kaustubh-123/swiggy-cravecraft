// Initialize Swiggy MCP Client
const mcp = new SwiggyMcpClient({
  isSandbox: true,
  onLog: renderMcpLog
});

// DOM Elements
const inputCraving = document.getElementById('inputCraving');
const btnSearch = document.getElementById('btnSearch');
const foodResultsContainer = document.getElementById('foodResultsContainer');
const imResultsContainer = document.getElementById('imResultsContainer');
const decisionBanner = document.getElementById('decisionBanner');
const foodStatPrice = document.getElementById('foodStatPrice');
const imStatPrice = document.getElementById('imStatPrice');
const statSavings = document.getElementById('statSavings');
const logStream = document.getElementById('logStream');
const btnClearLogs = document.getElementById('btnClearLogs');
const statusDot = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');

// Modal Elements
const btnOpenTokenModal = document.getElementById('btnOpenTokenModal');
const tokenModal = document.getElementById('tokenModal');
const btnCancelToken = document.getElementById('btnCancelToken');
const btnSaveToken = document.getElementById('btnSaveToken');
const tokenInput = document.getElementById('tokenInput');

// Preset Pills
document.querySelectorAll('.craving-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    inputCraving.value = pill.getAttribute('data-val');
    runCravingQuery();
  });
});

// Search on click or enter
btnSearch.addEventListener('click', runCravingQuery);
inputCraving.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runCravingQuery();
});

// Clear logs
btnClearLogs.addEventListener('click', () => {
  logStream.innerHTML = '';
});

// Token modal handlers
btnOpenTokenModal.addEventListener('click', () => {
  tokenModal.classList.add('open');
});

btnCancelToken.addEventListener('click', () => {
  tokenModal.classList.remove('open');
});

btnSaveToken.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (token) {
    mcp.setToken(token);
    statusDot.style.background = '#38bdf8';
    statusDot.style.boxShadow = '0 0 8px #38bdf8';
    statusLabel.textContent = 'Live MCP Active';
    renderSystemLog(`Swiggy Bearer Token set. Direct live requests active.`);
  } else {
    mcp.setSandbox(true);
    statusDot.style.background = '#22c55e';
    statusDot.style.boxShadow = '0 0 8px #22c55e';
    statusLabel.textContent = 'Sandbox Mode';
    renderSystemLog(`Switched back to Sandbox Mode.`);
  }
  tokenModal.classList.remove('open');
});

/**
 * Executes Dual MCP queries across Swiggy Food and Swiggy Instamart
 */
async function runCravingQuery() {
  const craving = inputCraving.value.trim();
  if (!craving) return;

  btnSearch.disabled = true;
  btnSearch.textContent = 'Querying MCP...';

  foodResultsContainer.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Querying mcp.swiggy.com/food...</div>`;
  imResultsContainer.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Deconstructing recipe & querying mcp.swiggy.com/im...</div>`;

  try {
    // 1. Swiggy Food MCP Call
    const foodPromise = mcp.callTool('food', 'search_restaurants', {
      query: craving,
      addressId: 'addr_user_home'
    });

    // 2. Swiggy Instamart Recipe Decomposition & Tool Call
    const groceryList = mcp.decomposeCravingToGroceries(craving);
    const mainIngredient = groceryList[0] || { query: craving };
    const imPromise = mcp.callTool('im', 'search_products', {
      query: mainIngredient.query,
      addressId: 'addr_user_home'
    });

    const [foodRes, imRes] = await Promise.all([foodPromise, imPromise]);

    renderFoodResults(foodRes, craving);
    renderInstamartResults(imRes, groceryList);
    renderVerdict(foodRes, imRes);

  } catch (err) {
    renderSystemLog(`Error executing tools: ${err.message}`, true);
  } finally {
    btnSearch.disabled = false;
    btnSearch.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Explore Options`;
  }
}

/**
 * Render Swiggy Food restaurant & dish cards
 */
function renderFoodResults(res, query) {
  const data = res?.data || res;
  const restaurants = data?.restaurants || [];

  if (!restaurants.length) {
    foodResultsContainer.innerHTML = `<div style="color:var(--text-muted); padding:20px;">No restaurants found for "${query}".</div>`;
    return;
  }

  let html = '';
  restaurants.forEach(r => {
    const dish = r.dishes?.[0] || { name: query, price: 300, isVeg: true, rating: 4.4 };
    const coupon = r.coupons?.[0] || { code: 'SWIGGYIT', discount: '20% OFF' };

    html += `
      <div class="food-card">
        <div class="card-top">
          <div>
            <div class="dish-title">
              <span style="display:inline-block; width:10px; height:10px; border-radius:2px; border:2px solid ${dish.isVeg ? '#22c55e' : '#ef4444'};"></span>
              ${dish.name}
            </div>
            <div class="restaurant-meta">
              <span>🏠 <strong>${r.name}</strong></span>
              <span>⭐ ${r.rating}</span>
              <span>⏱️ ${r.sla?.deliveryTime || 25} mins</span>
            </div>
          </div>
          <div class="dish-price">₹${dish.price}</div>
        </div>

        <p class="dish-desc">${dish.description || 'Authentic preparation delivered warm to your doorstep.'}</p>

        <div class="card-footer">
          <span class="coupon-badge">🏷️ ${coupon.code}: ${coupon.discount}</span>
          <button class="btn-action-sm" onclick="prepareFoodCart('${r.id}', '${dish.id}', '${dish.name}', ${dish.price})">
            Add to Food Cart
          </button>
        </div>
      </div>
    `;
  });

  foodResultsContainer.innerHTML = html;
}

/**
 * Render Swiggy Instamart ingredients & products
 */
function renderInstamartResults(res, groceryList) {
  const data = res?.data || res;
  const products = data?.products || [];

  let html = `
    <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px;">
      Recipe decomposed into <strong>${groceryList.length} essential items</strong>:
    </div>
  `;

  let totalImCost = 0;
  const cartItemsPayload = [];

  products.slice(0, 4).forEach((p, idx) => {
    const variation = p.variations?.[0] || {};
    const price = variation.price?.offerPrice || variation.price?.mrp || 80;
    const mrp = variation.price?.mrp || price;
    totalImCost += price;

    cartItemsPayload.push({
      spinId: variation.spinId || "spin_" + idx,
      skuId: variation.skuId || "sku_" + idx,
      quantity: 1
    });

    html += `
      <div class="im-item">
        <div class="im-item-left">
          <span class="im-item-name">${variation.displayName || p.displayName}</span>
          <span class="im-item-brand">${p.brand || 'Instamart'} • ⏱️ 10 mins delivery</span>
        </div>
        <div>
          <div class="im-item-price">₹${price}</div>
          ${mrp > price ? `<div class="im-item-mrp">₹${mrp}</div>` : ''}
        </div>
      </div>
    `;
  });

  html += `
    <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:0.75rem; color:var(--text-muted);">Est. Grocery Total:</div>
        <div style="font-size:1.1rem; font-weight:800; color:#22c55e;">₹${totalImCost}</div>
      </div>
      <button class="btn-action-sm" style="border-color:#22c55e; color:#22c55e; background:rgba(34,197,94,0.1);" onclick='updateInstamartCart(${JSON.stringify(cartItemsPayload)})'>
        ⚡ Update Instamart Cart
      </button>
    </div>
  `;

  imResultsContainer.innerHTML = html;
}

/**
 * Render Side-by-Side Decision Verdict
 */
function renderVerdict(foodRes, imRes) {
  const foodRest = foodRes?.data?.restaurants?.[0];
  const foodPrice = foodRest?.dishes?.[0]?.price || 320;

  const imProducts = imRes?.data?.products || [];
  let imPrice = 0;
  imProducts.slice(0, 3).forEach(p => {
    const varObj = p.variations?.[0] || {};
    imPrice += (varObj.price?.offerPrice || 60);
  });
  if (imPrice === 0) imPrice = 189;

  foodStatPrice.textContent = `₹${foodPrice}`;
  imStatPrice.textContent = `₹${imPrice}`;

  const diff = foodPrice - imPrice;
  if (diff > 0) {
    statSavings.textContent = `₹${diff} saved`;
    document.getElementById('verdictTitle').textContent = `🍳 Instamart wins on budget!`;
    document.getElementById('verdictSubtitle').textContent = `Cook it yourself to save ₹${diff}. Grocery delivers in ~10 mins.`;
  } else {
    statSavings.textContent = `Similar cost`;
    document.getElementById('verdictTitle').textContent = `🛵 Food delivery wins on convenience!`;
    document.getElementById('verdictSubtitle').textContent = `Ready-to-eat delivered in ~22 mins with zero prep.`;
  }

  decisionBanner.style.display = 'flex';
}

/**
 * Action: Prepare Food Cart
 */
window.prepareFoodCart = async function(restaurantId, dishId, dishName, price) {
  renderSystemLog(`Preparing Food Cart via MCP tool: update_food_cart`);
  const res = await mcp.callTool('food', 'update_food_cart', {
    restaurantId,
    items: [{ dishId, quantity: 1 }]
  });
  alert(`Added "${dishName}" (₹${price}) to your Swiggy Food cart!`);
};

/**
 * Action: Update Instamart Cart
 */
window.updateInstamartCart = async function(items) {
  renderSystemLog(`Calling Instamart MCP tool: update_cart with ${items.length} SKUs`);
  const res = await mcp.callTool('im', 'update_cart', {
    items
  });
  alert(`Swiggy Instamart cart updated with ${items.length} items! Ready for 10-minute checkout.`);
};

/**
 * Log helper for MCP Inspector stream
 */
function renderMcpLog(log) {
  const entry = document.createElement('div');
  entry.className = `log-entry ${log.type === 'request' ? 'req' : (log.type === 'error' ? 'err' : 'res')}`;

  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = `[${log.timestamp}] `;

  const meta = document.createElement('div');
  meta.className = `log-meta ${log.type === 'request' ? 'req' : (log.type === 'error' ? 'err' : 'res')}`;
  
  if (log.type === 'request') {
    meta.textContent = `➔ ${log.server.toUpperCase()} MCP · ${log.payload.params.name}`;
  } else if (log.type === 'response') {
    meta.textContent = `✔ ${log.server.toUpperCase()} MCP Response (${log.isSandbox ? 'Sandbox' : 'Live'})`;
  } else {
    meta.textContent = `✖ Error: ${log.error}`;
  }

  const pre = document.createElement('pre');
  pre.className = 'payload-block';
  pre.textContent = JSON.stringify(log.payload || log.error, null, 2);

  entry.appendChild(time);
  entry.appendChild(meta);
  entry.appendChild(pre);

  logStream.appendChild(entry);
  logStream.scrollTop = logStream.scrollHeight;
}

function renderSystemLog(msg, isError = false) {
  const entry = document.createElement('div');
  entry.className = `log-entry ${isError ? 'err' : ''}`;
  entry.innerHTML = `
    <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
    <div class="log-meta ${isError ? 'err' : ''}">${isError ? '✖' : 'ℹ️'} ${msg}</div>
  `;
  logStream.appendChild(entry);
  logStream.scrollTop = logStream.scrollHeight;
}

// Initial query on page load
window.addEventListener('DOMContentLoaded', () => {
  runCravingQuery();
});
