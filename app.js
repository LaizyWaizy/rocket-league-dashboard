const storageKey = "rocketLeagueManagerDashboard";

const defaultState = {
  roster: [],
  schedule: [],
  records: [],
  standings: [],
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function saveBackupFile() {
  const backup = {
    app: "Rocket League Team Manager",
    exportedAt: new Date().toISOString(),
    data: state,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `rocket-league-dashboard-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeImportedState(imported) {
  const data = imported.data || imported;

  return {
    roster: Array.isArray(data.roster) ? data.roster : [],
    schedule: Array.isArray(data.schedule) ? data.schedule : [],
    records: Array.isArray(data.records) ? data.records : [],
    standings: Array.isArray(data.standings) ? data.standings : [],
  };
}

function importBackupFile(file) {
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      state = normalizeImportedState(JSON.parse(reader.result));
      saveState();
      render();
      alert("Backup imported and saved in this browser.");
    } catch {
      alert("That backup file could not be imported.");
    }
  });

  reader.readAsText(file);
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function toNumber(value) {
  return Number.parseInt(value || "0", 10);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "";
  const [hourValue, minute] = value.split(":");
  const date = new Date();
  date.setHours(Number(hourValue), Number(minute));
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function resultFor(record) {
  if (record.ourGames > record.theirGames) return "Win";
  if (record.ourGames < record.theirGames) return "Loss";
  return "Tie";
}

function pill(text) {
  const className = String(text).toLowerCase().replace(/\s+/g, "-");
  return `<span class="pill ${className}">${text}</span>`;
}

function emptyRow(colspan, message) {
  return `<tr><td class="empty-row" colspan="${colspan}">${message}</td></tr>`;
}

function sortedSchedule() {
  return [...state.schedule].sort((a, b) => {
    const aDate = `${a.date || "9999-12-31"}T${a.time || "23:59"}`;
    const bDate = `${b.date || "9999-12-31"}T${b.time || "23:59"}`;
    return aDate.localeCompare(bDate);
  });
}

function renderMetrics() {
  const wins = state.records.filter((record) => resultFor(record) === "Win").length;
  const losses = state.records.filter((record) => resultFor(record) === "Loss").length;
  const ties = state.records.filter((record) => resultFor(record) === "Tie").length;
  const seriesTotal = wins + losses + ties;

  const ourGames = state.records.reduce((total, record) => total + record.ourGames, 0);
  const theirGames = state.records.reduce((total, record) => total + record.theirGames, 0);
  const gameTotal = ourGames + theirGames;

  const ourGoals = state.records.reduce((total, record) => total + record.ourGoals, 0);
  const theirGoals = state.records.reduce((total, record) => total + record.theirGoals, 0);

  document.querySelector("#seriesRecord").textContent =
    ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
  document.querySelector("#seriesWinRate").textContent =
    `${seriesTotal ? Math.round((wins / seriesTotal) * 100) : 0}% series win rate`;
  document.querySelector("#gameRecord").textContent = `${ourGames}-${theirGames}`;
  document.querySelector("#gameWinRate").textContent =
    `${gameTotal ? Math.round((ourGames / gameTotal) * 100) : 0}% game win rate`;
  document.querySelector("#goalDiff").textContent =
    ourGoals - theirGoals > 0 ? `+${ourGoals - theirGoals}` : `${ourGoals - theirGoals}`;
  document.querySelector("#goalsTotal").textContent = `${ourGoals} for / ${theirGoals} against`;

  const active = state.roster.filter((player) => player.status === "Active").length;
  document.querySelector("#activePlayers").textContent = active;
  document.querySelector("#rosterCount").textContent = `${state.roster.length} total rostered`;
}

function renderRoster() {
  const rows = state.roster
    .map(
      (player) => `
        <tr>
          <td><strong>${player.name}</strong></td>
          <td>${player.role}</td>
          <td>${player.platform || ""}</td>
          <td>${player.rank || ""}</td>
          <td>${pill(player.status)}</td>
          <td>${player.contact || ""}</td>
          <td><button class="delete-btn" data-delete="roster" data-id="${player.id}" type="button">Remove</button></td>
        </tr>
      `,
    )
    .join("");

  document.querySelector("#rosterTable").innerHTML =
    rows || emptyRow(7, "No players added yet.");
}

function renderSchedule() {
  const rows = sortedSchedule()
    .map(
      (event) => `
        <tr>
          <td>${formatDate(event.date)}</td>
          <td>${formatTime(event.time)}</td>
          <td>${event.type}</td>
          <td><strong>${event.opponent}</strong></td>
          <td>${event.league || ""}</td>
          <td>${event.lineup || ""}</td>
          <td>${pill(event.status)}</td>
          <td><button class="delete-btn" data-delete="schedule" data-id="${event.id}" type="button">Remove</button></td>
        </tr>
      `,
    )
    .join("");

  document.querySelector("#scheduleTable").innerHTML =
    rows || emptyRow(8, "No schedule events added yet.");

  const upcoming = sortedSchedule().filter((event) => event.status === "Scheduled").slice(0, 5);
  document.querySelector("#upcomingTable").innerHTML =
    upcoming
      .map(
        (event) => `
          <tr>
            <td>${formatDate(event.date)} ${formatTime(event.time)}</td>
            <td>${event.type}</td>
            <td><strong>${event.opponent}</strong><br>${event.league || ""}</td>
            <td>${event.lineup || ""}</td>
            <td>${pill(event.status)}</td>
          </tr>
        `,
      )
      .join("") || emptyRow(5, "No upcoming events.");

  const next = upcoming[0];
  document.querySelector("#nextMatchMini").textContent = next
    ? `${formatDate(next.date)} ${formatTime(next.time)} vs ${next.opponent}`
    : "No match scheduled";
}

function renderRecords() {
  const sorted = [...state.records].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const rows = sorted
    .map((record) => {
      const result = resultFor(record);
      return `
        <tr>
          <td>${formatDate(record.date)}</td>
          <td>${record.league || ""}</td>
          <td><strong>${record.opponent}</strong></td>
          <td>${record.ourGames}-${record.theirGames}</td>
          <td>${pill(result)}</td>
          <td>${record.ourGoals}-${record.theirGoals}</td>
          <td>${record.mvp || ""}</td>
          <td><button class="delete-btn" data-delete="records" data-id="${record.id}" type="button">Remove</button></td>
        </tr>
      `;
    })
    .join("");

  document.querySelector("#recordsTable").innerHTML =
    rows || emptyRow(8, "No match results added yet.");

  document.querySelector("#recentResults").innerHTML =
    sorted
      .slice(0, 5)
      .map((record) => {
        const result = resultFor(record);
        return `
          <div class="result-item">
            <div>
              <strong>${record.opponent}</strong>
              <span>${formatDate(record.date)} - ${record.ourGames}-${record.theirGames}</span>
            </div>
            ${pill(result)}
          </div>
        `;
      })
      .join("") || `<p class="empty-row">No results yet.</p>`;
}

function renderStandings() {
  const rows = [...state.standings]
    .sort((a, b) => b.wins * 3 + b.ties - (a.wins * 3 + a.ties))
    .map((team) => {
      const played = team.wins + team.losses + team.ties;
      const gameDiff = team.gamesWon - team.gamesLost;
      const points = team.wins * 3 + team.ties;

      return `
        <tr>
          <td><strong>${team.team}</strong></td>
          <td>${played}</td>
          <td>${team.wins}</td>
          <td>${team.losses}</td>
          <td>${team.ties}</td>
          <td>${gameDiff > 0 ? `+${gameDiff}` : gameDiff}</td>
          <td><strong>${points}</strong></td>
          <td><button class="delete-btn" data-delete="standings" data-id="${team.id}" type="button">Remove</button></td>
        </tr>
      `;
    })
    .join("");

  document.querySelector("#standingsTable").innerHTML =
    rows || emptyRow(8, "No league standings added yet.");
}

function render() {
  renderMetrics();
  renderRoster();
  renderSchedule();
  renderRecords();
  renderStandings();
}

function addSubmitHandlers() {
  document.querySelector("#rosterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.roster.push({ id: uid(), ...formData(event.currentTarget) });
    event.currentTarget.reset();
    saveState();
    render();
  });

  document.querySelector("#scheduleForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.schedule.push({ id: uid(), ...formData(event.currentTarget) });
    event.currentTarget.reset();
    saveState();
    render();
  });

  document.querySelector("#recordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    state.records.push({
      id: uid(),
      date: data.date,
      league: data.league,
      opponent: data.opponent,
      ourGames: toNumber(data.ourGames),
      theirGames: toNumber(data.theirGames),
      ourGoals: toNumber(data.ourGoals),
      theirGoals: toNumber(data.theirGoals),
      mvp: data.mvp,
    });
    event.currentTarget.reset();
    saveState();
    render();
  });

  document.querySelector("#standingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    state.standings.push({
      id: uid(),
      team: data.team,
      wins: toNumber(data.wins),
      losses: toNumber(data.losses),
      ties: toNumber(data.ties),
      gamesWon: toNumber(data.gamesWon),
      gamesLost: toNumber(data.gamesLost),
    });
    event.currentTarget.reset();
    saveState();
    render();
  });
}

function addNavHandlers() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".section").forEach((section) => section.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`#${button.dataset.target}`).classList.add("active");
    });
  });
}

function addDeleteHandler() {
  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;

    const collection = button.dataset.delete;
    const id = button.dataset.id;
    state[collection] = state[collection].filter((item) => item.id !== id);
    saveState();
    render();
  });
}

function seedDemo() {
  state = {
    roster: [
      { id: uid(), name: "Player 1", role: "Starter", platform: "PC", rank: "GC1", status: "Active", contact: "@player1" },
      { id: uid(), name: "Player 2", role: "Starter", platform: "Xbox", rank: "C3", status: "Active", contact: "@player2" },
      { id: uid(), name: "Player 3", role: "Starter", platform: "PlayStation", rank: "GC1", status: "Active", contact: "@player3" },
      { id: uid(), name: "Player 4", role: "Sub", platform: "PC", rank: "C3", status: "Trial", contact: "@player4" },
    ],
    schedule: [
      { id: uid(), date: "2026-05-01", time: "19:30", type: "League Match", opponent: "Velocity", league: "Spring League", lineup: "Player 1, Player 2, Player 3", status: "Scheduled" },
      { id: uid(), date: "2026-05-03", time: "20:00", type: "Practice", opponent: "Rotation review", league: "", lineup: "Full roster", status: "Scheduled" },
      { id: uid(), date: "2026-05-05", time: "18:45", type: "Scrim", opponent: "Apex", league: "", lineup: "Player 1, Player 3, Player 4", status: "Scheduled" },
    ],
    records: [
      { id: uid(), date: "2026-04-22", league: "Spring League", opponent: "Boost Club", ourGames: 3, theirGames: 1, ourGoals: 12, theirGoals: 8, mvp: "Player 2" },
      { id: uid(), date: "2026-04-24", league: "Spring League", opponent: "Orange Line", ourGames: 2, theirGames: 3, ourGoals: 10, theirGoals: 11, mvp: "Player 1" },
    ],
    standings: [
      { id: uid(), team: "Your Team", wins: 1, losses: 1, ties: 0, gamesWon: 5, gamesLost: 4 },
      { id: uid(), team: "Velocity", wins: 2, losses: 0, ties: 0, gamesWon: 6, gamesLost: 2 },
      { id: uid(), team: "Boost Club", wins: 0, losses: 2, ties: 0, gamesWon: 2, gamesLost: 6 },
    ],
  };
  saveState();
  render();
}

document.querySelector("#seedDemoBtn").addEventListener("click", seedDemo);
document.querySelector("#exportBtn").addEventListener("click", saveBackupFile);
document.querySelector("#importFile").addEventListener("change", (event) => {
  const [file] = event.currentTarget.files;
  if (file) importBackupFile(file);
  event.currentTarget.value = "";
});
document.querySelector("#resetBtn").addEventListener("click", () => {
  if (!confirm("Reset all dashboard data?")) return;
  state = structuredClone(defaultState);
  saveState();
  render();
});

addNavHandlers();
addSubmitHandlers();
addDeleteHandler();
render();
