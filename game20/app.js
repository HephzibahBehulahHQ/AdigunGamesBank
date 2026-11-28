import { DAYS, STOCKS, makeMarket, transact, advanceDay, netWorth } from "./engine.js";

const $ = selector => document.querySelector(selector);
const chart = $("#chart");
const trade = $("#trade");
const help = $("#studio-help");
const result = $("#end-screen");
const money = value => "$" + value.toFixed(2);
const tickers = ["HLG", "QFS", "ORB", "GCM", "MNB"];
let market = makeMarket();
let stock = STOCKS[0];
let opened = false;

$("#stocks").replaceChildren(...STOCKS.map((item, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = tickers[index];
  button.setAttribute("aria-label", item.name);
  button.title = item.name;
  button.addEventListener("click", () => {
    stock = item;
    renderQuote();
  });
  return button;
}));

function draw() {
  const context = chart.getContext("2d");
  if (!context) return;
  const { width, height } = chart.getBoundingClientRect();
  const density = Math.min(devicePixelRatio, 2);
  chart.width = Math.round(width * density);
  chart.height = Math.round(height * density);
  context.scale(density, density);

  const left = 47;
  const right = width - 21;
  const top = 105;
  const bottom = height - (width <= 600 ? 120 : 77);
  if (bottom <= top || right <= left) return;
  const values = market.history[stock.id];
  const low = Math.min(...values) * .94;
  const high = Math.max(...values) * 1.06;
  const xAt = index => left + index * (right - left) / DAYS;
  const yAt = price => top + (high - price) * (bottom - top) / (high - low);

  context.strokeStyle = "#294459";
  context.fillStyle = "#bbd1df";
  context.font = "11px ui-monospace, monospace";
  for (let index = 0; index <= 5; index++) {
    const value = high - (high - low) * index / 5;
    const y = yAt(value);
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();
    context.fillText("$" + value.toFixed(0), 5, y + 4);
  }
  for (let day = 0; day <= DAYS; day += 5) {
    context.fillText(String(day), xAt(day) - 4, bottom + 21);
  }
  context.lineWidth = 2;
  context.strokeStyle = context.fillStyle = stock.color;
  context.beginPath();
  values.forEach((value, index) => {
    if (index) context.lineTo(xAt(index), yAt(value));
    else context.moveTo(xAt(index), yAt(value));
  });
  context.stroke();
  context.beginPath();
  context.arc(xAt(values.length - 1), yAt(values.at(-1)), 4, 0, 2 * Math.PI);
  context.fill();
}

function renderQuote() {
  const price = market.prices[stock.id];
  const previous = market.history[stock.id].at(-2);
  $("#stock-name").textContent = stock.name;
  $("#price").textContent = money(price);
  $("#change").textContent = previous ? ((price / previous - 1) * 100).toFixed(2) + "%" : "";
  $("#order-quote").textContent = stock.name + " · " + money(price);
  for (const [index, button] of [...$("#stocks").children].entries()) {
    button.setAttribute("aria-pressed", String(STOCKS[index] === stock));
  }
  draw();
}

function render() {
  $("#day").textContent = market.day;
  for (const [account, id] of [["player", "player"], ["ai", "ai"]]) {
    $("#" + id + "-value").textContent = money(netWorth(market, account));
    $("#" + id + "-cash").textContent = money(market.cash[account]);
  }
  $("#holdings").replaceChildren(...STOCKS.map(item => {
    const row = document.createElement("div");
    row.className = "holding";
    row.textContent = item.name + " · " + market.shares.player[item.id] + " shares";
    return row;
  }));
  $("#log").replaceChildren(...market.log.slice(0, 40).map(line => {
    const row = document.createElement("li");
    row.textContent = line;
    return row;
  }));
  $("#stocks").hidden = $("#trade-open").hidden = $("#advance").hidden = !opened || market.finished;
  $("#start").hidden = opened;
  $("#results-open").hidden = !market.finished;
  renderQuote();
}

function order(side) {
  try {
    transact(market, "player", side, stock.id, Number($("#quantity").value));
    $("#order-status").textContent = "Filled at " + money(market.prices[stock.id]) + " per share.";
    render();
  } catch (error) {
    $("#order-status").textContent = error.message;
  }
}

$("#start").addEventListener("click", () => {
  opened = true;
  render();
  $("#stocks").firstElementChild.focus();
});
$("#trade-open").addEventListener("click", () => {
  $("#order-status").textContent = "";
  trade.showModal();
});
$("#buy").addEventListener("click", () => order("buy"));
$("#sell").addEventListener("click", () => order("sell"));
$("#advance").addEventListener("click", () => {
  advanceDay(market);
  $("#message").textContent = `Day ${market.day} settled. ${market.events.join(" · ")}`;
  render();
  if (!market.finished) return;
  $("#end-title").textContent = market.winner === "player" ? "You win" : market.winner === "ai" ? "Opponent wins" : "Market tied";
  $("#end-copy").textContent = `Day ${DAYS} closed at ${money(netWorth(market, "player"))} for you and ${money(netWorth(market, "ai"))} for the opponent.`;
  $("#results-open").focus();
  result.showModal();
});

function reset() {
  market = makeMarket(Date.now() >>> 0);
  stock = STOCKS[0];
  opened = false;
  $("#message").textContent = "";
  $("#quantity").value = 10;
  result.close();
  help.close();
  render();
  $("#start").focus();
}

$("#again").addEventListener("click", reset);
$("#restart").addEventListener("click", reset);
$("#results-open").addEventListener("click", () => result.showModal());
$("#book-open").addEventListener("click", () => $("#book").showModal());
$("#help-open").addEventListener("click", () => help.showModal());
new ResizeObserver(draw).observe(chart);
render();
