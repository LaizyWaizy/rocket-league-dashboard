const storageKey = "rocketLeagueManagerDashboard";

const defaultState = {
  roster: [],
  schedule: [],
  records: [],
  leagues: [],
  availability: {},
  standings: [],
};

let state = loadState();
let editingRosterId = null;

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);

  try {
    return normalizeImportedState(JSON.parse(saved));
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
    leagues: migrateLeagues(data),
    availability:
      data.availability && typeof data.availability === "object" ? data.availability : {},
    standings: Array.isArray(data.standings) ? data.standings : [],
  };
}

function emptyLeague(name) {
  return {
    id: uid(),
    name,
    seriesWins: 0,
    seriesLosses: 0,
    seriesTies: 0,
    gamesWon: 0,
    gamesLost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };
}

function migrateLeagues(data) {
  if (Array.isArray(data.leagues)) {
    return data.leagues.map((league) => ({
      ...emptyLeague(league.name || "League"),
      ...league,
      seriesWins: toNumber(league.seriesWins),
      seriesLosses: toNumber(league.seriesLosses),
      seriesTies: toNumber(league.seriesTies),
      gamesWon: toNumber(league.gamesWon),
      gamesLost: toNumber(league.gamesLost),
      goalsFor: toNumber(league.goalsFor),
      goalsAgainst: toNumber(league.goalsAgainst),
    }));
  }

  if (!Array.isArray(data.records) || data.records.length === 0) return [];

  return data.records.reduce((leagues, record) => {
    const league = ensureLeague(record.league || "Unassigned", leagues);
    applyRecordToLeague(league, record, 1);
    return leagues;
  }, []);
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

function ensureLeague(name, leagues = state.leagues) {
  const cleanName = (name || "Unassigned").trim() || "Unassigned";
  let league = leagues.find((item) => item.name.toLowerCase() === cleanName.toLowerCase());

  if (!league) {
    league = emptyLeague(cleanName);
    leagues.push(league);
  }

  return league;
}

function findLeague(name) {
  const cleanName = (name || "Unassigned").trim() || "Unassigned";
  return state.leagues.find((item) => item.name.toLowerCase() === cleanName.toLowerCase());
}

function adjustLeagueValue(league, field, amount) {
  league[field] = Math.max(0, league[field] + amount);
}

function applyRecordToLeague(league, record, direction) {
  const result = resultFor(record);

  if (result === "Win") adjustLeagueValue(league, "seriesWins", direction);
  if (result === "Loss") adjustLeagueValue(league, "seriesLosses", direction);
  if (result === "Tie") adjustLeagueValue(league, "seriesTies", direction);
  adjustLeagueValue(league, "gamesWon", record.ourGames * direction);
  adjustLeagueValue(league, "gamesLost", record.theirGames * direction);
  adjustLeagueValue(league, "goalsFor", record.ourGoals * direction);
  adjustLeagueValue(league, "goalsAgainst", record.theirGoals * direction);
}

function leagueTotals() {
  return state.leagues.reduce(
    (totals, league) => ({
      seriesWins: totals.seriesWins + league.seriesWins,
      seriesLosses: totals.seriesLosses + league.seriesLosses,
      seriesTies: totals.seriesTies + league.seriesTies,
      gamesWon: totals.gamesWon + league.gamesWon,
      gamesLost: totals.gamesLost + league.gamesLost,
      goalsFor: totals.goalsFor + league.goalsFor,
      goalsAgainst: totals.goalsAgainst + league.goalsAgainst,
    }),
    {
      seriesWins: 0,
      seriesLosses: 0,
      seriesTies: 0,
      gamesWon: 0,
      gamesLost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    },
  );
}

function pill(text) {
  const className = String(text).toLowerCase().replace(/\s+/g, "-");
  return `<span class="pill ${className}">${text}</span>`;
}

function optionList(options, current) {
  return options
    .map((option) => `<option ${option === current ? "selected" : ""}>${option}</option>`)
    .join("");
}

function escapeAttribute(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;");
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
  const totals = leagueTotals();
  const wins = totals.seriesWins;
  const losses = totals.seriesLosses;
  const ties = totals.seriesTies;
  const seriesTotal = wins + losses + ties;

  const ourGames = totals.gamesWon;
  const theirGames = totals.gamesLost;
  const gameTotal = ourGames + theirGames;

  const ourGoals = totals.goalsFor;
  const theirGoals = totals.goalsAgainst;

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

function counterCell(league, field) {
  return `
    <div class="counter-control">
      <strong>${league[field]}</strong>
      <span class="counter-buttons">
        <button class="counter-btn" data-league-adjust="${field}" data-id="${league.id}" data-amount="-1" type="button">-</button>
        <button class="counter-btn" data-league-adjust="${field}" data-id="${league.id}" data-amount="1" type="button">+</button>
      </span>
    </div>
  `;
}

function renderLeagueRecords() {
  const rows = state.leagues
    .map((league) => {
      const series =
        league.seriesTies > 0
          ? `${league.seriesWins}-${league.seriesLosses}-${league.seriesTies}`
          : `${league.seriesWins}-${league.seriesLosses}`;

      return `
        <tr>
          <td><strong>${league.name}</strong></td>
          <td>${counterCell(league, "seriesWins")}</td>
          <td>${counterCell(league, "seriesLosses")}</td>
          <td>${counterCell(league, "seriesTies")}</td>
          <td>${counterCell(league, "gamesWon")}</td>
          <td>${counterCell(league, "gamesLost")}</td>
          <td><strong>${series}</strong><br><span>${league.gamesWon}-${league.gamesLost} games</span></td>
          <td><button class="delete-btn" data-delete="leagues" data-id="${league.id}" type="button">Remove</button></td>
        </tr>
      `;
    })
    .join("");

  document.querySelector("#leagueRecordsTable").innerHTML =
    rows || emptyRow(8, "Add a league to start tracking records separately.");
}

function renderRoster() {
  const rows = state.roster
    .map(
      (player, index) => `
        <tr>
          <td><strong>${player.name}</strong></td>
          <td>
            <select class="inline-select" data-roster-field="role" data-id="${player.id}">
              ${optionList(["Starter", "Sub", "Coach", "Manager"], player.role)}
            </select>
          </td>
          <td>${player.platform || ""}</td>
          <td>${player.rank || ""}</td>
          <td>
            <select class="inline-select" data-roster-field="status" data-id="${player.id}">
              ${optionList(["Active", "Trial", "Benched", "Inactive"], player.status)}
            </select>
          </td>
          <td>${player.contact || ""}</td>
          <td>
            <div class="row-actions">
              <button class="row-btn" data-move-roster="up" data-id="${player.id}" type="button" title="Move up" ${index === 0 ? "disabled" : ""}>&uarr;</button>
              <button class="row-btn" data-move-roster="down" data-id="${player.id}" type="button" title="Move down" ${index === state.roster.length - 1 ? "disabled" : ""}>&darr;</button>
              <button class="row-btn" data-edit-roster="${player.id}" type="button">Edit</button>
              <button class="delete-btn" data-delete="roster" data-id="${player.id}" type="button">Remove</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  document.querySelector("#rosterTable").innerHTML =
    rows || emptyRow(7, "No players added yet.");
}

function defaultAvailability() {
  return {
    monday: "Available",
    mondayTime: "",
    tuesday: "Available",
    tuesdayTime: "",
    wednesday: "Available",
    wednesdayTime: "",
    thursday: "Available",
    thursdayTime: "",
    friday: "Available",
    fridayTime: "",
    saturday: "Available",
    saturdayTime: "",
    sunday: "Available",
    sundayTime: "",
    notes: "",
  };
}

function availabilityFor(playerId) {
  if (!state.availability[playerId]) {
    state.availability[playerId] = defaultAvailability();
  }

  return state.availability[playerId];
}

function renderAvailability() {
  const days = [
    ["monday", "Mon"],
    ["tuesday", "Tue"],
    ["wednesday", "Wed"],
    ["thursday", "Thu"],
    ["friday", "Fri"],
    ["saturday", "Sat"],
    ["sunday", "Sun"],
  ];
  const options = ["Available", "Tentative", "Unavailable"];
  const rows = state.roster
    .map((player) => {
      const availability = availabilityFor(player.id);
      const dayCells = days
        .map(
          ([day]) => `
            <td>
              <div class="availability-day">
                <select class="inline-select availability-select" data-availability-field="${day}" data-id="${player.id}">
                  ${optionList(options, availability[day] || "Available")}
                </select>
                <input class="availability-time" data-availability-field="${day}Time" data-id="${player.id}" value="${escapeAttribute(availability[`${day}Time`])}" placeholder="7-10 PM ET" />
              </div>
            </td>
          `,
        )
        .join("");

      return `
        <tr>
          <td><strong>${player.name}</strong><br><span>${player.role || ""}</span></td>
          ${dayCells}
          <td>
            <input class="availability-notes" data-availability-field="notes" data-id="${player.id}" value="${escapeAttribute(availability.notes)}" placeholder="Work, school, weekends only" />
          </td>
        </tr>
      `;
    })
    .join("");

  document.querySelector("#availabilityTable").innerHTML =
    rows || emptyRow(9, "Add roster players first, then set availability here.");
}

function setRosterEditing(player) {
  const form = document.querySelector("#rosterForm");

  editingRosterId = player.id;
  form.elements.name.value = player.name || "";
  form.elements.role.value = player.role || "Starter";
  form.elements.platform.value = player.platform || "";
  form.elements.rank.value = player.rank || "";
  form.elements.status.value = player.status || "Active";
  form.elements.contact.value = player.contact || "";
  document.querySelector("#rosterSubmitBtn").textContent = "Save player";
  document.querySelector("#cancelRosterEditBtn").classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearRosterEditing() {
  editingRosterId = null;
  document.querySelector("#rosterForm").reset();
  document.querySelector("#rosterSubmitBtn").textContent = "Add player";
  document.querySelector("#cancelRosterEditBtn").classList.add("hidden");
}

function moveRosterPlayer(id, direction) {
  const index = state.roster.findIndex((player) => player.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= state.roster.length) return;
  [state.roster[index], state.roster[targetIndex]] = [
    state.roster[targetIndex],
    state.roster[index],
  ];
  saveState();
  render();
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
  renderLeagueRecords();
  renderRoster();
  renderAvailability();
  renderSchedule();
  renderRecords();
  renderStandings();
}

function addSubmitHandlers() {
  document.querySelector("#rosterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const playerData = formData(event.currentTarget);

    if (editingRosterId) {
      state.roster = state.roster.map((player) =>
        player.id === editingRosterId ? { ...player, ...playerData } : player,
      );
      clearRosterEditing();
    } else {
      state.roster.push({ id: uid(), ...playerData });
      event.currentTarget.reset();
    }

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
    const record = {
      id: uid(),
      date: data.date,
      league: data.league,
      opponent: data.opponent,
      ourGames: toNumber(data.ourGames),
      theirGames: toNumber(data.theirGames),
      ourGoals: toNumber(data.ourGoals),
      theirGoals: toNumber(data.theirGoals),
      mvp: data.mvp,
    };
    state.records.push(record);
    applyRecordToLeague(ensureLeague(record.league), record, 1);
    event.currentTarget.reset();
    saveState();
    render();
  });

  document.querySelector("#leagueForm").addEventListener("submit", (event) => {
    event.preventDefault();
    ensureLeague(formData(event.currentTarget).name);
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
    if (collection === "records") {
      const record = state.records.find((item) => item.id === id);
      const league = record ? findLeague(record.league) : null;
      if (league) applyRecordToLeague(league, record, -1);
    }
    state[collection] = state[collection].filter((item) => item.id !== id);
    if (collection === "roster") {
      delete state.availability[id];
      if (editingRosterId === id) clearRosterEditing();
    }
    saveState();
    render();
  });
}

function addAvailabilityHandlers() {
  document.body.addEventListener("change", (event) => {
    const field = event.target.dataset.availabilityField;
    if (!field) return;

    availabilityFor(event.target.dataset.id)[field] = event.target.value;
    saveState();
  });

  document.body.addEventListener("input", (event) => {
    const field = event.target.dataset.availabilityField;
    if (!field) return;

    availabilityFor(event.target.dataset.id)[field] = event.target.value;
    saveState();
  });
}

function addLeagueRecordHandlers() {
  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("[data-league-adjust]");
    if (!button) return;

    const league = state.leagues.find((item) => item.id === button.dataset.id);
    if (!league) return;

    const field = button.dataset.leagueAdjust;
    const nextValue = league[field] + Number(button.dataset.amount);
    league[field] = Math.max(0, nextValue);
    saveState();
    render();
  });
}

function addRosterRowHandlers() {
  document.body.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-roster]");
    const moveButton = event.target.closest("[data-move-roster]");

    if (editButton) {
      const player = state.roster.find((item) => item.id === editButton.dataset.editRoster);
      if (player) setRosterEditing(player);
    }

    if (moveButton) {
      moveRosterPlayer(moveButton.dataset.id, moveButton.dataset.moveRoster);
    }
  });

  document.body.addEventListener("change", (event) => {
    const select = event.target.closest("[data-roster-field]");
    if (!select) return;

    const player = state.roster.find((item) => item.id === select.dataset.id);
    if (!player) return;

    player[select.dataset.rosterField] = select.value;
    saveState();
    render();
  });

  document.querySelector("#cancelRosterEditBtn").addEventListener("click", clearRosterEditing);
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
    leagues: [],
    availability: {},
    standings: [
      { id: uid(), team: "Your Team", wins: 1, losses: 1, ties: 0, gamesWon: 5, gamesLost: 4 },
      { id: uid(), team: "Velocity", wins: 2, losses: 0, ties: 0, gamesWon: 6, gamesLost: 2 },
      { id: uid(), team: "Boost Club", wins: 0, losses: 2, ties: 0, gamesWon: 2, gamesLost: 6 },
    ],
  };
  state.records.forEach((record) => {
    applyRecordToLeague(ensureLeague(record.league), record, 1);
  });
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
addRosterRowHandlers();
addLeagueRecordHandlers();
addAvailabilityHandlers();
render();
