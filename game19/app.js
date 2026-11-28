import { CASES, makeCase, ask, accuse } from "./engine.js";

const $ = selector => document.querySelector(selector);
const question = $("#question");
const answer = $("#answer");
const accusation = $("#accusation");
const result = $("#end");
const help = $("#studio-help");
let caseIndex = 0;
let investigation;
let selected;

function selectSuspect(suspect) {
  selected = suspect;
  $("#speaker").textContent = suspect.name;
  $("#role").textContent = suspect.role;
  answer.textContent = investigation.log.find(row => row.suspect === suspect.name)?.answer || "";
  for (const button of $("#suspects").children) {
    button.setAttribute("aria-pressed", String(button.dataset.id === suspect.id));
  }
}

function updateQuestions() {
  const remaining = investigation.limit - investigation.questions;
  $("#left").textContent = remaining;
  question.disabled = $("#ask").disabled = !remaining;
}

function showBriefing() {
  investigation = makeCase(caseIndex + 1);
  const { title, scene, evidence, suspects } = investigation.scenario;
  $("#case-number").textContent = caseIndex + 1;
  $("#case-title").textContent = title;
  $("#scene").textContent = $("#notes-scene").textContent = scene;
  $("#evidence").textContent = $("#notes-evidence").textContent = evidence;
  $("#log").replaceChildren();
  $("#accuse").replaceChildren(new Option("Choose a suspect", ""), ...suspects.map(suspect => new Option(suspect.name, suspect.id)));
  $("#suspects").replaceChildren(...suspects.map((suspect, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(index + 1);
    button.title = suspect.name;
    button.setAttribute("aria-label", "Interview " + suspect.name);
    button.dataset.id = suspect.id;
    button.addEventListener("click", () => selectSuspect(suspect));
    return button;
  }));
  selectSuspect(suspects[0]);
  updateQuestions();
  question.value = "";
  $("#start").hidden = $("#begin").hidden = false;
  $("#work").hidden = $("#ask").hidden = $("#accuse-open").hidden = $("#suspects").hidden = $("#review").hidden = true;
}

$("#begin").addEventListener("click", () => {
  $("#start").hidden = $("#begin").hidden = true;
  $("#work").hidden = $("#ask").hidden = $("#accuse-open").hidden = $("#suspects").hidden = false;
  $("#suspects").firstElementChild.focus();
});

$("#work").addEventListener("submit", event => {
  event.preventDefault();
  let row;
  try {
    row = ask(investigation, { suspectId: selected.id, text: question.value });
  } catch (error) {
    answer.textContent = error.message;
    return;
  }
  answer.textContent = row.answer;
  question.value = "";
  const entry = document.createElement("li");
  const speaker = document.createElement("strong");
  speaker.textContent = row.suspect;
  const quotedQuestion = document.createElement("div");
  quotedQuestion.textContent = row.question;
  const reply = document.createElement("div");
  reply.textContent = row.answer;
  entry.append(speaker, quotedQuestion, reply);
  $("#log").prepend(entry);
  updateQuestions();
  (question.disabled ? $("#accuse-open") : question).focus({ preventScroll: true });
});

$("#accuse-form").addEventListener("submit", event => {
  event.preventDefault();
  const { correct, culprit } = accuse(investigation, $("#accuse").value);
  accusation.close();
  $("#work").hidden = $("#ask").hidden = $("#accuse-open").hidden = $("#suspects").hidden = true;
  $("#review").hidden = false;
  $("#end-title").textContent = correct ? "Case solved" : "Wrong suspect";
  $("#end-copy").textContent = `${culprit.name} was responsible. ${culprit.facts.object} ${culprit.facts.evidence}`;
  $("#review").focus();
  result.showModal();
});

for (const [opener, dialog] of [["#help-open", help], ["#notes-open", $("#notes")], ["#accuse-open", accusation], ["#review", result]]) {
  $(opener).addEventListener("click", () => dialog.showModal());
}

function nextCase() {
  caseIndex = (caseIndex + 1) % CASES.length;
  help.close();
  result.close();
  showBriefing();
  $("#begin").focus();
}

$("#new").addEventListener("click", nextCase);
$("#again").addEventListener("click", nextCase);
showBriefing();
