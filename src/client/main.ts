// Séance web client shell (Wave 1).
// Connects to the gateway over WebSocket; the gateway owns the IRC session.
// Demo mode: if the gateway is unreachable, show a friendly offline room.

interface ChatMessage {
  from: string;
  text: string;
  bot?: boolean;
  time: string;
}

const messagesEl = document.getElementById("messages") as HTMLDivElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const memberListEl = document.getElementById("member-list") as HTMLUListElement;
const form = document.getElementById("composer") as HTMLFormElement;
const input = document.getElementById("input") as HTMLInputElement;

function addMessage(m: ChatMessage) {
  const div = document.createElement("div");
  div.className = "message" + (m.bot ? " bot" : "");
  const time = document.createElement("span");
  time.className = "time";
  time.textContent = m.time;
  const who = document.createElement("strong");
  who.textContent = m.bot ? `👻 ${m.from}` : m.from;
  const body = document.createElement("span");
  body.textContent = m.text;
  div.append(time, who, body);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setMembers(nicks: string[]) {
  memberListEl.innerHTML = "";
  for (const nick of nicks) {
    const li = document.createElement("li");
    li.textContent = nick;
    memberListEl.appendChild(li);
  }
}

function connect() {
  const ws = new WebSocket(`ws://${location.host}/ws`);
  ws.addEventListener("open", () => {
    statusEl.textContent = "Connected";
    statusEl.classList.add("ok");
  });
  ws.addEventListener("message", (ev) => {
    try {
      const data = JSON.parse(ev.data as string) as
        | { kind: "message"; from: string; text: string; bot?: boolean }
        | { kind: "members"; nicks: string[] }
        | { kind: "status"; text: string };
      if (data.kind === "message") {
        addMessage({
          from: data.from,
          text: data.text,
          bot: data.bot,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      } else if (data.kind === "members") {
        setMembers(data.nicks);
      } else {
        statusEl.textContent = data.text;
      }
    } catch {
      // Ignore malformed frames; the gateway never sends them in practice.
    }
  });
  ws.addEventListener("close", () => {
    statusEl.textContent = "Reconnecting…";
    statusEl.classList.remove("ok");
    setTimeout(connect, 3000);
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ kind: "send", text }));
    input.value = "";
  };
}

connect();
