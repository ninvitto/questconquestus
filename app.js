(() => {
  "use strict";

  const STORAGE_KEY = "quest-conquestus-session-v1";
  const EXPORT_VERSION = 1;
  const PLAYER_LIMIT = 6;
  const PLAYER_COLORS = ["#b44635", "#2f7d58", "#4f6fd9", "#b67a22", "#7b55b2", "#007f8f"];



  const dom = {};
  let state = loadSession();

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheDom();
    populateStaticSelects();
    bindEvents();
    render();
  }

  function cacheDom() {
    [
      "session-summary",
      "save-status",
      "add-player-form",
      "player-name",
      "class-select",
      "active-player-select",
      "previous-turn-button",
      "next-turn-button",
      "player-list",
      "active-player-label",
      "map-board",
      "last-roll-label",
      "dice-display",
      "swim-result",
      "escape-result",
      "roll-d10-button",
      "swim-button",
      "escape-button",
      "add-item-form",
      "item-select",
      "add-effect-form",
      "effect-select",
      "effect-turns",
      "draw-card-form",
      "deck-select",
      "card-input",
      "manual-log-form",
      "manual-log-input",
      "event-log",
      "clear-log-button",
      "session-notes",
      "quick-rules",
      "new-session-button",
      "export-session-button",
      "import-session-button",
      "import-session-input",
      "export-log-button",
    ].forEach((id) => {
      dom[toCamel(id)] = document.getElementById(id);
    });
  }

  function bindEvents() {
    dom.addPlayerForm.addEventListener("submit", handleAddPlayer);
    dom.activePlayerSelect.addEventListener("change", handleActivePlayerChange);
    dom.previousTurnButton.addEventListener("click", () => changeTurn(-1));
    dom.nextTurnButton.addEventListener("click", () => changeTurn(1));
    dom.playerList.addEventListener("click", handlePlayerListClick);
    dom.playerList.addEventListener("change", handlePlayerListChange);
    dom.mapBoard.addEventListener("click", handleMapClick);
    dom.rollD10Button.addEventListener("click", rollMovement);
    dom.swimButton.addEventListener("click", calculateSwim);
    dom.escapeButton.addEventListener("click", rollEscape);
    dom.addItemForm.addEventListener("submit", handleAddItem);
    dom.addEffectForm.addEventListener("submit", handleAddEffect);
    dom.effectSelect.addEventListener("change", handleEffectSelectChange);
    dom.drawCardForm.addEventListener("submit", handleDrawCard);
    dom.manualLogForm.addEventListener("submit", handleManualLog);
    dom.clearLogButton.addEventListener("click", clearLog);
    dom.sessionNotes.addEventListener("input", handleNotesInput);
    dom.newSessionButton.addEventListener("click", resetSession);
    dom.exportSessionButton.addEventListener("click", exportSession);
    dom.importSessionButton.addEventListener("click", () => dom.importSessionInput.click());
    dom.importSessionInput.addEventListener("change", importSession);
    dom.exportLogButton.addEventListener("click", exportLogAndNotes);
  }

  function populateStaticSelects() {
    dom.classSelect.innerHTML = GAME_DATA.classes
      .map((klass) => `<option value="${escapeHtml(klass.id)}">${escapeHtml(klass.origin)} - ${escapeHtml(klass.name)}</option>`)
      .join("");

    dom.itemSelect.innerHTML = groupedOptions(GAME_DATA.items, "type", (item) => `${item.name} - ${item.summary}`);
    dom.effectSelect.innerHTML = GAME_DATA.effects
      .map((effect) => `<option value="${escapeHtml(effect.id)}">${escapeHtml(effect.name)}</option>`)
      .join("");
    dom.deckSelect.innerHTML = GAME_DATA.decks
      .map((deck) => `<option value="${escapeHtml(deck.id)}">${escapeHtml(deck.name)}</option>`)
      .join("");
  }

  function groupedOptions(items, key, labelFor) {
    const groups = [...new Set(items.map((item) => item[key]))];
    return groups
      .map((group) => {
        const options = items
          .filter((item) => item[key] === group)
          .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(labelFor(item))}</option>`)
          .join("");
        return `<optgroup label="${escapeHtml(group)}">${options}</optgroup>`;
      })
      .join("");
  }

  function render() {
    ensureActivePlayer();
    renderSummary();
    renderTurnSelect();
    renderPlayers();
    renderMap();
    renderTools();
    renderLog();
    renderRules();
    dom.sessionNotes.value = state.notes || "";
  }

  function renderSummary() {
    const playerCount = state.players.length;
    const active = getActivePlayer();
    const savedAt = state.updatedAt ? formatTime(state.updatedAt) : "-";
    const playerText = playerCount === 1 ? "1 giocatore" : `${playerCount} giocatori`;
    dom.sessionSummary.textContent = active
      ? `${playerText} - turno di ${active.name} - ultimo salvataggio ${savedAt}`
      : `${playerText} - aggiungi un giocatore per iniziare`;
    dom.saveStatus.textContent = `salvata ${savedAt}`;
  }

  function renderTurnSelect() {
    const disabled = state.players.length === 0;
    dom.activePlayerSelect.disabled = disabled;
    dom.previousTurnButton.disabled = disabled;
    dom.nextTurnButton.disabled = disabled;
    dom.activePlayerSelect.innerHTML = disabled
      ? `<option>Nessun giocatore</option>`
      : state.players
          .map((player) => `<option value="${escapeHtml(player.id)}">${escapeHtml(player.name)}</option>`)
          .join("");
    if (!disabled) {
      dom.activePlayerSelect.value = state.activePlayerId;
    }
  }

  function renderPlayers() {
    if (state.players.length === 0) {
      dom.playerList.innerHTML = `<div class="empty-state">Nessun giocatore in sessione.</div>`;
      return;
    }

    dom.playerList.innerHTML = state.players.map(renderPlayerCard).join("");
  }

  function renderPlayerCard(player) {
    const zone = getZone(player.zoneId);
    const hpPercent = player.maxHp > 0 ? clamp(Math.round((player.hp / player.maxHp) * 100), 0, 100) : 0;
    const inventory = player.inventory.length
      ? player.inventory.map((entry) => renderInventoryItem(player, entry)).join("")
      : `<li class="empty-state">Inventario vuoto</li>`;
    const effects = player.effects.length
      ? player.effects.map((effect) => renderEffectItem(player, effect)).join("")
      : `<li class="empty-state">Nessun effetto</li>`;

    return `
      <article class="player-card ${player.id === state.activePlayerId ? "is-active" : ""}" style="border-left-color: ${escapeHtml(player.color)}">
        <div class="player-head">
          <div>
            <div class="player-name">${escapeHtml(player.name)}</div>
            <div class="player-meta">${escapeHtml(player.className)} - ${escapeHtml(zone ? zone.name : "senza zona")}</div>
          </div>
          <div class="player-actions">
            <button class="mini-icon" type="button" data-action="set-active" data-player-id="${escapeHtml(player.id)}" title="Rendi attivo" aria-label="Rendi attivo ${escapeHtml(player.name)}">●</button>
            <button class="mini-icon danger-button" type="button" data-action="remove-player" data-player-id="${escapeHtml(player.id)}" title="Rimuovi" aria-label="Rimuovi ${escapeHtml(player.name)}">×</button>
          </div>
        </div>

        <div class="hp-row">
          <button class="mini-icon" type="button" data-action="hp-delta" data-player-id="${escapeHtml(player.id)}" data-delta="-1" aria-label="Riduci vita">−</button>
          <div class="hp-meter" aria-label="Vita ${player.hp} di ${player.maxHp}">
            <div class="hp-meter-fill" style="width: ${hpPercent}%"></div>
            <span>${player.hp}/${player.maxHp} vita</span>
          </div>
          <button class="mini-icon" type="button" data-action="hp-delta" data-player-id="${escapeHtml(player.id)}" data-delta="1" aria-label="Aumenta vita">+</button>
        </div>

        <div class="stat-grid">
          ${renderNumberField("Vita max", "maxHp", player.maxHp, player.id)}
          ${renderNumberField("Velocita", "velocita", player.stats.velocita, player.id)}
          ${renderNumberField("Forza", "forza", player.stats.forza, player.id)}
          ${renderNumberField("Intel.", "intelligenza", player.stats.intelligenza, player.id)}
          ${renderLocationField(player)}
        </div>

        <ul class="inventory-list" aria-label="Inventario di ${escapeHtml(player.name)}">${inventory}</ul>
        <ul class="effect-list" aria-label="Effetti di ${escapeHtml(player.name)}">${effects}</ul>
      </article>
    `;
  }

  function renderNumberField(label, field, value, playerId) {
    return `
      <label class="stat-field">
        <span>${escapeHtml(label)}</span>
        <input type="number" min="0" max="999" value="${Number(value)}" data-field="${escapeHtml(field)}" data-player-id="${escapeHtml(playerId)}">
      </label>
    `;
  }

  function renderLocationField(player) {
    const options = GAME_DATA.zones
      .map((zone) => `<option value="${escapeHtml(zone.id)}" ${zone.id === player.zoneId ? "selected" : ""}>${escapeHtml(zone.name)}</option>`)
      .join("");
    return `
      <label class="stat-field">
        <span>Zona</span>
        <select data-field="zoneId" data-player-id="${escapeHtml(player.id)}">${options}</select>
      </label>
    `;
  }

  function renderInventoryItem(player, entry) {
    const item = getItem(entry.itemId);
    const canUse = Boolean(item && item.apply);
    return `
      <li class="inventory-item">
        <span>${escapeHtml(entry.name)}</span>
        <button type="button" data-action="use-item" data-player-id="${escapeHtml(player.id)}" data-entry-id="${escapeHtml(entry.id)}" ${canUse ? "" : "disabled"}>Usa</button>
        <button type="button" data-action="remove-item" data-player-id="${escapeHtml(player.id)}" data-entry-id="${escapeHtml(entry.id)}" aria-label="Rimuovi ${escapeHtml(entry.name)}">×</button>
      </li>
    `;
  }

  function renderEffectItem(player, effect) {
    const turns = Number(effect.remainingTurns) > 0 ? `${effect.remainingTurns} turni` : "manuale";
    return `
      <li class="effect-item">
        <span>${escapeHtml(effect.name)} · ${escapeHtml(turns)}</span>
        <button type="button" data-action="tick-effect" data-player-id="${escapeHtml(player.id)}" data-effect-id="${escapeHtml(effect.id)}">-1</button>
        <button type="button" data-action="remove-effect" data-player-id="${escapeHtml(player.id)}" data-effect-id="${escapeHtml(effect.id)}" aria-label="Rimuovi ${escapeHtml(effect.name)}">×</button>
      </li>
    `;
  }

  function renderMap() {
    const active = getActivePlayer();
    dom.activePlayerLabel.textContent = active ? `attivo: ${active.name}` : "nessun giocatore";
    const rings = [1, 2, 3];
    dom.mapBoard.innerHTML = rings
      .map((ring) => {
        const zones = GAME_DATA.zones.filter((zone) => zone.ring === ring);
        const title = ring === 1 ? "Cerchio 1" : ring === 2 ? "Cerchio 2" : "Cerchio 3";
        const subtitle = ring === 1 ? "biomi iniziali" : ring === 2 ? "zone avanzate" : "citta finale";
        return `
          <section class="ring" aria-labelledby="ring-${ring}">
            <div class="ring-title">
              <h3 id="ring-${ring}">${title}</h3>
              <span>${subtitle}</span>
            </div>
            <div class="zone-grid">
              ${zones.map(renderZone).join("")}
            </div>
          </section>
        `;
      })
      .join("");
  }

  function renderZone(zone) {
    const tokens = state.players
      .filter((player) => player.zoneId === zone.id)
      .map((player) => `<span class="player-token" style="background: ${escapeHtml(player.color)}" title="${escapeHtml(player.name)}">${escapeHtml(initials(player.name))}</span>`)
      .join("");
    return `
      <button class="zone-card" type="button" data-zone-id="${escapeHtml(zone.id)}" data-biome="${escapeHtml(zone.biome)}">
        <span class="zone-name">${escapeHtml(zone.name)}</span>
        <span class="zone-type">${escapeHtml(zone.type)} · ${escapeHtml(zone.guardian)}</span>
        <span class="zone-detail">${escapeHtml(zone.detail)}</span>
        <span class="token-row">${tokens}</span>
      </button>
    `;
  }

  function renderTools() {
    const active = getActivePlayer();
    const disabled = !active;
    [dom.rollD10Button, dom.swimButton, dom.escapeButton, dom.itemSelect, dom.addItemForm.querySelector("button"), dom.effectSelect, dom.effectTurns, dom.addEffectForm.querySelector("button")].forEach((control) => {
      control.disabled = disabled;
    });
    dom.lastRollLabel.textContent = state.lastRoll ? `d10 ${state.lastRoll.value}` : "d10 -";
    dom.diceDisplay.textContent = state.lastRoll ? state.lastRoll.value : "-";
    if (!active) {
      dom.swimResult.textContent = "-";
      dom.escapeResult.textContent = "-";
      return;
    }
    if (state.lastRoll) {
      dom.swimResult.textContent = formatHalfMovement(state.lastRoll.value);
    }
    dom.escapeResult.textContent = `serve ${escapeTarget(active.stats.velocita)}`;
  }

  function renderLog() {
    if (state.log.length === 0) {
      dom.eventLog.innerHTML = `<li>Nessun evento registrato.</li>`;
      return;
    }
    dom.eventLog.innerHTML = [...state.log]
      .reverse()
      .slice(0, 80)
      .map((entry) => `<li><time datetime="${escapeHtml(entry.time)}">${escapeHtml(formatTime(entry.time))}</time>${escapeHtml(entry.message)}</li>`)
      .join("");
  }

  function renderRules() {
    dom.quickRules.innerHTML = GAME_DATA.quickRules
      .map((rule) => `<article class="rule-item"><strong>${escapeHtml(rule.title)}</strong><span>${escapeHtml(rule.body)}</span></article>`)
      .join("");
  }

  function handleAddPlayer(event) {
    event.preventDefault();
    if (state.players.length >= PLAYER_LIMIT) {
      window.alert(`Massimo ${PLAYER_LIMIT} giocatori in questa versione.`);
      return;
    }
    const name = dom.playerName.value.trim() || `Giocatore ${state.players.length + 1}`;
    const klass = getClass(dom.classSelect.value) || GAME_DATA.classes[0];
    const player = createPlayer(name, klass);
    state.players.push(player);
    state.activePlayerId = player.id;
    dom.playerName.value = "";
    addLog(`${player.name} entra in gioco come ${player.className}.`, "setup");
    persistAndRender();
  }

  function handleActivePlayerChange() {
    state.activePlayerId = dom.activePlayerSelect.value;
    const active = getActivePlayer();
    if (active) {
      addLog(`Turno assegnato a ${active.name}.`, "turn");
    }
    persistAndRender();
  }

  function handlePlayerListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const player = getPlayer(button.dataset.playerId);
    if (!player) return;

    switch (button.dataset.action) {
      case "set-active":
        state.activePlayerId = player.id;
        addLog(`Turno assegnato a ${player.name}.`, "turn");
        break;
      case "remove-player":
        removePlayer(player);
        break;
      case "hp-delta":
        player.hp = clamp(player.hp + Number(button.dataset.delta), 0, player.maxHp);
        addLog(`${player.name}: vita ${player.hp}/${player.maxHp}.`, "hp");
        break;
      case "use-item":
        useInventoryItem(player, button.dataset.entryId);
        break;
      case "remove-item":
        removeInventoryItem(player, button.dataset.entryId);
        break;
      case "tick-effect":
        tickEffect(player, button.dataset.effectId);
        break;
      case "remove-effect":
        removeEffect(player, button.dataset.effectId);
        break;
      default:
        return;
    }
    persistAndRender();
  }

  function handlePlayerListChange(event) {
    const control = event.target.closest("[data-field][data-player-id]");
    if (!control) return;
    const player = getPlayer(control.dataset.playerId);
    if (!player) return;
    const field = control.dataset.field;
    if (field === "zoneId") {
      movePlayer(player, control.value);
    } else if (field === "maxHp") {
      player.maxHp = clamp(Number(control.value), 1, 999);
      player.hp = clamp(player.hp, 0, player.maxHp);
      addLog(`${player.name}: vita massima ${player.maxHp}.`, "stats");
    } else if (["velocita", "forza", "intelligenza"].includes(field)) {
      player.stats[field] = clamp(Number(control.value), 0, 99);
      addLog(`${player.name}: ${field} ${player.stats[field]}.`, "stats");
    }
    persistAndRender();
  }

  function handleMapClick(event) {
    const zoneButton = event.target.closest(".zone-card[data-zone-id]");
    if (!zoneButton) return;
    const active = getActivePlayer();
    if (!active) {
      window.alert("Aggiungi o seleziona un giocatore prima di muovere una pedina.");
      return;
    }
    movePlayer(active, zoneButton.dataset.zoneId);
    persistAndRender();
  }

  function handleAddItem(event) {
    event.preventDefault();
    const active = getActivePlayer();
    const item = getItem(dom.itemSelect.value);
    if (!active || !item) return;
    active.inventory.push({
      id: createId("inv"),
      itemId: item.id,
      name: item.name,
      type: item.type,
      addedAt: new Date().toISOString(),
    });
    addLog(`${active.name} ottiene ${item.name}.`, "inventory");
    persistAndRender();
  }

  function handleAddEffect(event) {
    event.preventDefault();
    const active = getActivePlayer();
    const effect = getEffect(dom.effectSelect.value);
    if (!active || !effect) return;
    const turns = clamp(Number(dom.effectTurns.value), 0, 20);
    addEffect(active, effect, turns);
    addLog(`${active.name}: effetto ${effect.name} attivo${turns > 0 ? ` per ${turns} turni` : ""}.`, "effect");
    persistAndRender();
  }

  function handleEffectSelectChange() {
    const effect = getEffect(dom.effectSelect.value);
    if (effect) {
      dom.effectTurns.value = effect.turns;
    }
  }

  function handleDrawCard(event) {
    event.preventDefault();
    const deckId = dom.deckSelect.value;
    const cardName = dom.cardInput.value.trim();
    if (!cardName) return;
    
    const deck = GAME_DATA.decks.find((d) => d.id === deckId);
    const deckName = deck ? deck.name : "Cassa";
    const active = getActivePlayer();
    
    if (active) {
      addLog(`${active.name} pesca: ${cardName} da ${deckName}.`, "draw");
    } else {
      addLog(`Pescata: ${cardName} da ${deckName}.`, "draw");
    }
    
    dom.cardInput.value = "";
    persistAndRender();
  }

  function handleManualLog(event) {
    event.preventDefault();
    const message = dom.manualLogInput.value.trim();
    if (!message) return;
    addLog(message, "manual");
    dom.manualLogInput.value = "";
    persistAndRender();
  }

  function handleNotesInput() {
    state.notes = dom.sessionNotes.value;
    saveSession();
    renderSummary();
  }

  function clearLog() {
    if (state.log.length === 0) return;
    if (!window.confirm("Vuoi pulire il log della sessione?")) return;
    state.log = [];
    addLog("Log pulito.", "system");
    persistAndRender();
  }

  function resetSession() {
    if (state.players.length || state.log.length || state.notes) {
      const ok = window.confirm("Creare una nuova sessione e sostituire quella salvata?");
      if (!ok) return;
    }
    state = createEmptySession();
    addLog("Nuova sessione creata.", "system");
    persistAndRender();
  }

  function rollMovement() {
    const active = getActivePlayer();
    if (!active) return;
    const value = rollD10();
    state.lastRoll = { value, time: new Date().toISOString(), kind: "movement" };
    addLog(`${active.name} lancia d10 movimento: ${value}.`, "dice");
    persistAndRender();
  }

  function calculateSwim() {
    const active = getActivePlayer();
    if (!active) return;
    if (!state.lastRoll) {
      state.lastRoll = { value: rollD10(), time: new Date().toISOString(), kind: "swim" };
    }
    const movement = formatHalfMovement(state.lastRoll.value);
    addLog(`${active.name}: nuoto con d10 ${state.lastRoll.value} = ${movement}.`, "dice");
    persistAndRender();
  }

  function rollEscape() {
    const active = getActivePlayer();
    if (!active) return;
    const targetValue = 10 - Number(active.stats.velocita || 0);
    const target = escapeTarget(active.stats.velocita);
    if (targetValue <= 0) {
      addLog(`${active.name}: fuga automatica, velocita ${active.stats.velocita} e complemento ${target}.`, "dice");
      persistAndRender();
      return;
    }
    const value = rollD10();
    const success = value === targetValue;
    state.lastRoll = { value, time: new Date().toISOString(), kind: "escape" };
    addLog(`${active.name}: fuga, serve ${target}, d10 ${value} (${success ? "riuscita" : "fallita"}).`, "dice");
    persistAndRender();
  }

  function changeTurn(delta) {
    if (state.players.length === 0) return;
    const current = getActivePlayer();
    if (delta > 0 && current) {
      tickTurnEffects(current);
    }
    const currentIndex = Math.max(0, state.players.findIndex((player) => player.id === state.activePlayerId));
    const nextIndex = (currentIndex + delta + state.players.length) % state.players.length;
    state.activePlayerId = state.players[nextIndex].id;
    addLog(`Turno di ${state.players[nextIndex].name}.`, "turn");
    persistAndRender();
  }

  function movePlayer(player, zoneId) {
    const oldZone = getZone(player.zoneId);
    const zone = getZone(zoneId);
    if (!zone) return;
    player.zoneId = zone.id;
    if (!oldZone || oldZone.id !== zone.id) {
      addLog(`${player.name} si sposta: ${oldZone ? oldZone.name : "origine"} -> ${zone.name}.`, "move");
    }
  }

  function createPlayer(name, klass) {
    return {
      id: createId("player"),
      name,
      classId: klass.id,
      className: klass.name,
      origin: klass.origin,
      zoneId: klass.zoneId,
      color: PLAYER_COLORS[state.players.length % PLAYER_COLORS.length],
      hp: klass.stats.vita,
      maxHp: klass.stats.vita,
      baseStats: { ...klass.stats },
      stats: {
        velocita: klass.stats.velocita,
        forza: klass.stats.forza,
        intelligenza: klass.stats.intelligenza,
      },
      inventory: [],
      effects: [],
    };
  }

  function removePlayer(player) {
    const ok = window.confirm(`Rimuovere ${player.name} dalla sessione?`);
    if (!ok) return;
    state.players = state.players.filter((candidate) => candidate.id !== player.id);
    addLog(`${player.name} rimosso dalla sessione.`, "setup");
    ensureActivePlayer();
  }

  function useInventoryItem(player, entryId) {
    const entry = player.inventory.find((candidate) => candidate.id === entryId);
    if (!entry) return;
    const item = getItem(entry.itemId);
    if (!item || !item.apply) return;

    const apply = item.apply;
    if (apply.kind === "maxHp") {
      player.maxHp += apply.amount;
      player.hp += apply.amount;
      addLog(`${player.name} usa ${item.name}: vita massima +${apply.amount}.`, "inventory");
    }
    if (apply.kind === "stat") {
      player.stats[apply.stat] += apply.amount;
      addLog(`${player.name} usa ${item.name}: ${apply.stat} +${apply.amount}.`, "inventory");
    }
    if (apply.kind === "heal") {
      const oldHp = player.hp;
      player.hp = clamp(player.hp + apply.amount, 0, player.maxHp);
      addLog(`${player.name} usa ${item.name}: cura ${player.hp - oldHp}.`, "inventory");
    }
    if (apply.kind === "effect") {
      const effect = getEffect(apply.effectId);
      if (effect) {
        addEffect(player, effect, apply.turns);
        addLog(`${player.name} usa ${item.name}: effetto ${effect.name}.`, "inventory");
      }
    }
    player.inventory = player.inventory.filter((candidate) => candidate.id !== entryId);
  }

  function removeInventoryItem(player, entryId) {
    const entry = player.inventory.find((candidate) => candidate.id === entryId);
    if (!entry) return;
    player.inventory = player.inventory.filter((candidate) => candidate.id !== entryId);
    addLog(`${player.name} perde ${entry.name}.`, "inventory");
  }

  function addEffect(player, effect, turns) {
    const existing = player.effects.find((candidate) => candidate.sourceId === effect.id);
    if (existing) {
      existing.remainingTurns = turns;
      existing.detail = effect.detail;
      return;
    }
    player.effects.push({
      id: createId("effect"),
      sourceId: effect.id,
      name: effect.name,
      remainingTurns: turns,
      detail: effect.detail,
    });
  }

  function tickEffect(player, effectId) {
    const effect = player.effects.find((candidate) => candidate.id === effectId);
    if (!effect) return;
    if (Number(effect.remainingTurns) > 0) {
      effect.remainingTurns -= 1;
      addLog(`${player.name}: ${effect.name} passa a ${effect.remainingTurns} turni.`, "effect");
    }
    if (Number(effect.remainingTurns) <= 0) {
      removeEffect(player, effectId, true);
    }
  }

  function tickTurnEffects(player) {
    [...player.effects].forEach((effect) => {
      if (Number(effect.remainingTurns) > 0) {
        effect.remainingTurns -= 1;
        if (effect.remainingTurns <= 0) {
          removeEffect(player, effect.id, true);
        }
      }
    });
  }

  function removeEffect(player, effectId, expired = false) {
    const effect = player.effects.find((candidate) => candidate.id === effectId);
    if (!effect) return;
    player.effects = player.effects.filter((candidate) => candidate.id !== effectId);
    addLog(`${player.name}: effetto ${effect.name} ${expired ? "scaduto" : "rimosso"}.`, "effect");
  }

  function exportSession() {
    saveSession();
    const filename = `quest-conquestus-sessione-${dateSlug()}.json`;
    downloadBlob(filename, JSON.stringify(state, null, 2), "application/json");
  }

  function importSession(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        state = normalizeSession(parsed);
        addLog(`Sessione importata da ${file.name}.`, "system");
        persistAndRender();
      } catch (error) {
        window.alert(`Import non riuscito: ${error.message}`);
      } finally {
        dom.importSessionInput.value = "";
      }
    });
    reader.readAsText(file);
  }

  function exportLogAndNotes() {
    const lines = [
      "# Quest Conquestus - log playtest",
      "",
      `Esportato: ${new Date().toLocaleString("it-IT")}`,
      `Giocatori: ${state.players.map((player) => player.name).join(", ") || "nessuno"}`,
      "",
      "## Note",
      "",
      state.notes || "_Nessuna nota._",
      "",
      "## Eventi",
      "",
      ...state.log.map((entry) => `- ${formatTime(entry.time)} - ${entry.message}`),
      "",
    ];
    downloadBlob(`quest-conquestus-log-${dateSlug()}.md`, lines.join("\n"), "text/markdown");
  }

  function normalizeSession(candidate) {
    if (!candidate || typeof candidate !== "object") {
      throw new Error("file non valido");
    }
    if (candidate.version !== EXPORT_VERSION) {
      throw new Error(`versione sessione non supportata: ${candidate.version}`);
    }
    const clean = createEmptySession();
    clean.createdAt = candidate.createdAt || clean.createdAt;
    clean.updatedAt = new Date().toISOString();
    clean.notes = typeof candidate.notes === "string" ? candidate.notes : "";
    clean.lastRoll = candidate.lastRoll && Number(candidate.lastRoll.value) ? candidate.lastRoll : null;
    clean.players = Array.isArray(candidate.players)
      ? candidate.players.slice(0, PLAYER_LIMIT).map(normalizePlayer)
      : [];
    clean.activePlayerId = clean.players.some((player) => player.id === candidate.activePlayerId)
      ? candidate.activePlayerId
      : clean.players[0]?.id || null;
    clean.log = Array.isArray(candidate.log)
      ? candidate.log.slice(-300).map((entry) => ({
          id: entry.id || createId("log"),
          time: entry.time || new Date().toISOString(),
          type: entry.type || "import",
          message: String(entry.message || "").slice(0, 300),
        }))
      : [];
    return clean;
  }

  function normalizePlayer(player, index) {
    const klass = getClass(player.classId) || GAME_DATA.classes[0];
    const zone = getZone(player.zoneId) || getZone(klass.zoneId);
    const maxHp = clamp(Number(player.maxHp || klass.stats.vita), 1, 999);
    return {
      id: player.id || createId("player"),
      name: String(player.name || `Giocatore ${index + 1}`).slice(0, 28),
      classId: klass.id,
      className: player.className || klass.name,
      origin: player.origin || klass.origin,
      zoneId: zone.id,
      color: player.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
      hp: clamp(Number(player.hp || maxHp), 0, maxHp),
      maxHp,
      baseStats: player.baseStats || { ...klass.stats },
      stats: {
        velocita: clamp(Number(player.stats?.velocita ?? klass.stats.velocita), 0, 99),
        forza: clamp(Number(player.stats?.forza ?? klass.stats.forza), 0, 99),
        intelligenza: clamp(Number(player.stats?.intelligenza ?? klass.stats.intelligenza), 0, 99),
      },
      inventory: Array.isArray(player.inventory) ? player.inventory.map(normalizeInventoryEntry).filter(Boolean) : [],
      effects: Array.isArray(player.effects) ? player.effects.map(normalizeEffectEntry).filter(Boolean) : [],
    };
  }

  function normalizeInventoryEntry(entry) {
    const item = getItem(entry.itemId);
    if (!item) return null;
    return {
      id: entry.id || createId("inv"),
      itemId: item.id,
      name: item.name,
      type: item.type,
      addedAt: entry.addedAt || new Date().toISOString(),
    };
  }

  function normalizeEffectEntry(entry) {
    return {
      id: entry.id || createId("effect"),
      sourceId: entry.sourceId || entry.id || "manual",
      name: String(entry.name || "Effetto").slice(0, 40),
      remainingTurns: clamp(Number(entry.remainingTurns || 0), 0, 20),
      detail: String(entry.detail || "").slice(0, 160),
    };
  }

  function createEmptySession() {
    const now = new Date().toISOString();
    return {
      version: EXPORT_VERSION,
      createdAt: now,
      updatedAt: now,
      activePlayerId: null,
      players: [],
      lastRoll: null,
      log: [],
      notes: "",
    };
  }

  function loadSession() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptySession();
      return normalizeSession(JSON.parse(raw));
    } catch (error) {
      console.warn("Sessione locale ignorata", error);
      return createEmptySession();
    }
  }

  function saveSession() {
    state.updatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Salvataggio locale non disponibile", error);
    }
  }

  function persistAndRender() {
    saveSession();
    render();
  }

  function addLog(message, type) {
    state.log.push({
      id: createId("log"),
      time: new Date().toISOString(),
      type,
      message,
    });
    if (state.log.length > 300) {
      state.log = state.log.slice(-300);
    }
  }

  function ensureActivePlayer() {
    if (state.players.length === 0) {
      state.activePlayerId = null;
      return;
    }
    if (!state.players.some((player) => player.id === state.activePlayerId)) {
      state.activePlayerId = state.players[0].id;
    }
  }

  function getActivePlayer() {
    return getPlayer(state.activePlayerId);
  }

  function getPlayer(id) {
    return state.players.find((player) => player.id === id);
  }

  function getClass(id) {
    return GAME_DATA.classes.find((klass) => klass.id === id);
  }

  function getZone(id) {
    return GAME_DATA.zones.find((zone) => zone.id === id);
  }

  function getItem(id) {
    return GAME_DATA.items.find((item) => item.id === id);
  }

  function getEffect(id) {
    return GAME_DATA.effects.find((effect) => effect.id === id);
  }

  function rollD10() {
    return Math.floor(Math.random() * 10) + 1;
  }

  function formatHalfMovement(value) {
    const movement = Math.min(5, value / 2);
    return `${String(movement).replace(".", ",")} caselle`;
  }

  function escapeTarget(speed) {
    const target = 10 - Number(speed || 0);
    return target <= 0 ? "0 o meno" : String(target);
  }

  function initials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function clamp(value, min, max) {
    const safe = Number.isFinite(value) ? value : min;
    return Math.min(max, Math.max(min, safe));
  }

  function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function dateSlug() {
    return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  }

  function formatTime(value) {
    try {
      return new Intl.DateTimeFormat("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(value));
    } catch {
      return "-";
    }
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function toCamel(value) {
    return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
