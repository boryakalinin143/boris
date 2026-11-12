// Минимальный клиент Google Calendar + Google Tasks через REST и OAuth refresh token.
// Секреты берутся только из окружения сервера: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.

export const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/tasks'];

export class GoogleClient {
  constructor({
    clientId, clientSecret, refreshToken,
    calendarIds = ['primary'],
    tokenUrl = 'https://oauth2.googleapis.com/token',
    calendarApi = 'https://www.googleapis.com/calendar/v3',
    tasksApi = 'https://tasks.googleapis.com/tasks/v1',
    fetchImpl = fetch,
  }) {
    Object.assign(this, { clientId, clientSecret, refreshToken, calendarIds, tokenUrl, calendarApi, tasksApi, fetchImpl });
    this.token = null;
    this.lastSuccess = null;
    this.lastError = null;
  }

  get configured() {
    return Boolean(this.clientId && this.clientSecret && this.refreshToken);
  }

  async accessToken() {
    if (this.token && this.token.expires > Date.now() + 60_000) return this.token.value;
    // Параллельные запросы ждут один и тот же обмен токена.
    this.pendingToken ??= this.refreshAccessToken().finally(() => { this.pendingToken = null; });
    return this.pendingToken;
  }

  async refreshAccessToken() {
    const res = await this.fetchImpl(this.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: this.clientId, client_secret: this.clientSecret, refresh_token: this.refreshToken, grant_type: 'refresh_token' }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Google OAuth: ${json.error || res.status}`);
    this.token = { value: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return this.token.value;
  }

  async call(url, { method = 'GET', body } = {}) {
    try {
      const res = await this.fetchImpl(url, {
        method,
        headers: { authorization: `Bearer ${await this.accessToken()}`, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
      if (res.status === 204) { this.lastSuccess = new Date(); return null; }
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(`Google API ${res.status}: ${json?.error?.message || ''}`.trim());
      this.lastSuccess = new Date();
      this.lastError = null;
      return json;
    } catch (e) {
      this.lastError = e.message;
      throw e;
    }
  }

  async listEvents(from, to) {
    const out = [];
    for (const cal of this.calendarIds) {
      let pageToken;
      do {
        const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
        if (pageToken) q.set('pageToken', pageToken);
        const page = await this.call(`${this.calendarApi}/calendars/${encodeURIComponent(cal)}/events?${q}`);
        out.push(...(page.items || []).map((e) => ({ ...e, calendarId: cal })));
        pageToken = page.nextPageToken;
      } while (pageToken);
    }
    return out;
  }

  insertEvent({ title, start, end, description }, calendarId = this.calendarIds[0]) {
    return this.call(`${this.calendarApi}/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      body: { summary: title, description, start: { dateTime: start }, end: { dateTime: end } },
    });
  }

  deleteEvent(eventId, calendarId = this.calendarIds[0]) {
    return this.call(`${this.calendarApi}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
  }

  async listTasks() {
    const lists = (await this.call(`${this.tasksApi}/users/@me/lists?maxResults=100`)).items || [];
    const out = [];
    for (const list of lists) {
      let pageToken;
      do {
        const q = new URLSearchParams({ showCompleted: 'true', showHidden: 'true', maxResults: '100' });
        if (pageToken) q.set('pageToken', pageToken);
        const page = await this.call(`${this.tasksApi}/lists/${encodeURIComponent(list.id)}/tasks?${q}`);
        out.push(...(page.items || []).map((t) => ({ ...t, listId: list.id, listTitle: list.title })));
        pageToken = page.nextPageToken;
      } while (pageToken);
    }
    return out;
  }

  insertTask({ title, due, notes }, listId = '@default') {
    return this.call(`${this.tasksApi}/lists/${encodeURIComponent(listId)}/tasks`, {
      method: 'POST',
      body: { title, notes, ...(due ? { due: `${due.slice(0, 10)}T00:00:00.000Z` } : {}) },
    });
  }

  completeTask(taskId, listId = '@default') {
    return this.call(`${this.tasksApi}/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, { method: 'PATCH', body: { status: 'completed' } });
  }

  deleteTask(taskId, listId = '@default') {
    return this.call(`${this.tasksApi}/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
  }
}
