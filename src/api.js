const API_KEY = process.env.VUE_APP_API_KEY;
const tickersHandler = new Map();
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);
const AGGREGATE_INDEX = "5";

socket.addEventListener("message", (e) => {
  const { TYPE: type, FROMSYMBOL: currency, PRICE: newPrice} = JSON.parse(e.data);
  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }
  const handler = tickersHandler.get(currency) ?? [];
  handler.forEach((fn) => fn(newPrice));
});

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message)
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }
  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}

function subscribeToTickersOnWs(ticker) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
}

function unsubscribeFromTickersOnWs(ticker) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
}

export const subscribeToTickers = (ticker, cb) => {
  const subscribers = tickersHandler.get(ticker) || [];
  //по ключу ticker записываем тикеры с callback functions
  tickersHandler.set(ticker, [...subscribers, cb]);
  subscribeToTickersOnWs(ticker);
};

export const unsubscribeFromTickers = (ticker) => {
  tickersHandler.delete(ticker);
  unsubscribeFromTickersOnWs(ticker);
};

export const fetchAllTickersNames = async () => {
  const res = await fetch(
    "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
  );
  const result = await res.json();
  return result.Data;
};