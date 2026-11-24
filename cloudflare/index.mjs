import accountWorker from "./account.mjs";
import productBot from "./product-bot.mjs";

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === "/api/account")
      return accountWorker.fetch(request, env);
    if (new URL(request.url).pathname === "/api/bot")
      return productBot.fetch(request, env);
    return env.ASSETS.fetch(request);
  },
};
