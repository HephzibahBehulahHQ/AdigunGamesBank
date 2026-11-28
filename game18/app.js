import { TOPICS, makeDebate, submitRound } from "./engine.js";

const $ = selector => document.querySelector(selector);
const topic = $("#topic");
const argument = $("#argument");
const result = $("#result");
const finish = $("#finish");
const help = $("#studio-help");
let game = makeDebate();
let currentResult = result;

topic.replaceChildren(...TOPICS.map(item => new Option(item.title, item.id)));

function showTopic() {
  $("#question").textContent = TOPICS.find(item => item.id === topic.value).question;
}

function renderMetrics(selector, score) {
  $(selector).replaceChildren(...[
    ["Logic", score.logic], ["Evidence", score.evidence],
    ["Rhetoric", score.rhetoric], ["Total", score.total + "/100"],
  ].map(([label, value]) => {
    const row = document.createElement("div");
    row.className = "metric";
    const metric = document.createElement("span");
    metric.textContent = label;
    const points = document.createElement("b");
    points.textContent = value;
    row.append(metric, points);
    return row;
  }));
}

function render() {
  $("#round").textContent = game.round;
  $("#player-wins").textContent = game.wins.player;
  $("#ai-wins").textContent = game.wins.ai;
  $("#history").replaceChildren(...game.history.map(round => {
    const item = document.createElement("li");
    const outcome = round.winner === "player" ? "you win" : round.winner === "ai" ? "opponent wins" : "draw";
    item.textContent = `Round ${round.round} · ${round.topic} · ${outcome}`;
    return item;
  }));
}

function showRound() {
  $("#start").hidden = true;
  $("#begin").hidden = true;
  $("#review").hidden = true;
  $("#play").hidden = false;
  $("#submit").hidden = false;
  $("#validation").textContent = "";
  argument.value = "";
  showTopic();
  topic.focus({ preventScroll: true });
}

topic.addEventListener("change", showTopic);
$("#begin").addEventListener("click", showRound);
$("#play").addEventListener("submit", event => {
  event.preventDefault();
  let round;
  try {
    round = submitRound(game, { topicId: topic.value, argument: argument.value });
  } catch (error) {
    $("#validation").textContent = error.message;
    argument.focus();
    return;
  }
  $("#play").hidden = true;
  $("#submit").hidden = true;
  $("#review").hidden = false;
  const outcome = round.winner === "player" ? "You win" : round.winner === "ai" ? "Opponent wins" : "Draw";
  $("#round-result").textContent = `Round ${round.round} · ${outcome}`;
  renderMetrics("#player-score", round.player);
  renderMetrics("#ai-score", round.ai);
  $("#ai-text").textContent = round.aiText;
  $("#next").textContent = game.complete ? "Final result" : "Next round";
  render();
  currentResult = result;
  $("#review").focus({ preventScroll: true });
  result.showModal();
});

$("#review").addEventListener("click", () => currentResult.showModal());
$("#help-open").addEventListener("click", () => help.showModal());
$("#next").addEventListener("click", () => {
  result.close();
  if (game.complete) {
    $("#finish-title").textContent = game.winner === "player" ? "Debate won" : game.winner === "ai" ? "Debate lost" : "Debate drawn";
    $("#finish-copy").textContent = `You ${game.wins.player}–${game.wins.ai} opponent, with ${game.wins.tie} tied rounds. Total rubric score ${game.total.player}–${game.total.ai}.`;
    currentResult = finish;
    finish.showModal();
    return;
  }
  topic.selectedIndex = game.round % TOPICS.length;
  showRound();
});

function reset() {
  game = makeDebate();
  help.close();
  finish.close();
  result.close();
  $("#start").hidden = false;
  $("#begin").hidden = false;
  $("#review").hidden = true;
  $("#play").hidden = true;
  $("#submit").hidden = true;
  topic.selectedIndex = 0;
  render();
  $("#begin").focus({ preventScroll: true });
}

$("#restart").addEventListener("click", reset);
$("#again").addEventListener("click", reset);
render();
