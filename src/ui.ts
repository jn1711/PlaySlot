export function renderHtmlDashboard(endpoints: string[]): string {
  return `<!DOCTYPE html>
<html lang="kk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlaySlot - Спорт алаңын оңай тап және бронда</title>
  <meta name="description" content="PlaySlot - Спорт алаңдарын табу және брондау жүйесі">
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --card-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #10b981;
      --accent-hover: #059669;
      --primary: #3b82f6;
      --code-bg: #0b1120;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo-badge {
      background: var(--accent);
      color: #000;
      font-weight: 800;
      font-size: 20px;
      padding: 6px 12px;
      border-radius: 8px;
    }
    h1 { font-size: 24px; font-weight: 700; }
    p.subtitle { color: var(--text-muted); font-size: 14px; }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.1);
      color: var(--accent);
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
    }
    .card h2 {
      font-size: 18px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .accounts-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
    }
    .account-item {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .account-info { font-size: 13px; }
    .account-role {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .role-admin { background: #ef4444; color: #fff; }
    .role-owner { background: #f59e0b; color: #000; }
    .role-player { background: #3b82f6; color: #fff; }
    .btn {
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-accent { background: var(--accent); color: #000; }
    .endpoints-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 280px;
      overflow-y: auto;
    }
    .endpoint-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--code-bg);
      padding: 8px 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 13px;
    }
    .console-section {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      margin-top: 24px;
    }
    .console-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .quick-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 13px;
      max-height: 400px;
      color: #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="logo-badge">PS</div>
        <div>
          <h1>PlaySlot Backend API</h1>
          <p class="subtitle">Спорт алаңын оңай тап және бронда • Port 3000 Node.js Express</p>
        </div>
      </div>
      <div class="status-badge">
        <span class="status-dot"></span>
        API Сервер Белсенді (0.0.0.0:3000)
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <h2>⚽ Жүйелік Деректер мен Тіркелгілер</h2>
        <p style="font-size: 13px; color: var(--text-muted);">Тестілеуге дайын алдын ала конфигурацияланған есептік жазбалар:</p>
        <div class="accounts-list">
          <div class="account-item">
            <div class="account-info">
              <div><strong>Әкімші (Admin)</strong></div>
              <div style="color: var(--text-muted);">admin@playslot.kz • admin1234</div>
            </div>
            <button class="btn" onclick="loginAs('admin@playslot.kz', 'admin1234')">Кіру</button>
          </div>
          <div class="account-item">
            <div class="account-info">
              <div><strong>Алаң Иесі (Owner)</strong></div>
              <div style="color: var(--text-muted);">owner@playslot.kz • owner1234</div>
            </div>
            <button class="btn" onclick="loginAs('owner@playslot.kz', 'owner1234')">Кіру</button>
          </div>
          <div class="account-item">
            <div class="account-info">
              <div><strong>Ойыншы (Player)</strong></div>
              <div style="color: var(--text-muted);">player@playslot.kz • player1234</div>
            </div>
            <button class="btn" onclick="loginAs('player@playslot.kz', 'player1234')">Кіру</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>🚀 API Эндпойнттар</h2>
        <div class="endpoints-list">
          ${endpoints
            .map(
              (ep) => `
            <div class="endpoint-item">
              <span>${ep}</span>
              <button class="btn" style="padding: 3px 10px; font-size: 11px;" onclick="fetchEndpoint('${ep}')">Тексеру</button>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </div>

    <div class="console-section">
      <div class="console-header">
        <div>
          <h2>Тестілеу Консолі (Interactive Tester)</h2>
          <span id="authStatus" style="font-size: 13px; color: var(--text-muted);">Ағымдағы сессия: Қонақ</span>
        </div>
        <div class="quick-actions">
          <button class="btn btn-accent" onclick="fetchEndpoint('/api/home')">/api/home</button>
          <button class="btn btn-accent" onclick="fetchEndpoint('/api/courts')">/api/courts</button>
          <button class="btn btn-accent" onclick="fetchEndpoint('/api/games')">/api/games</button>
          <button class="btn btn-accent" onclick="fetchEndpoint('/api/teams')">/api/teams</button>
          <button class="btn btn-accent" onclick="fetchEndpoint('/api/health/database')">/api/health/database</button>
        </div>
      </div>
      <pre id="output">Жүйелік деректерді көру үшін жоғарыдағы батырмаларды басыңыз...</pre>
    </div>
  </div>

  <script>
    let authToken = '';

    async function loginAs(email, password) {
      const output = document.getElementById('output');
      const authStatus = document.getElementById('authStatus');
      output.textContent = 'Кіру сұранысы орындалуда...';
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
          authToken = data.token;
          authStatus.textContent = 'Ағымдағы сессия: ' + data.fullName + ' (' + data.role + ')';
          authStatus.style.color = '#10b981';
        }
        output.textContent = '// Status: ' + res.status + '\\n' + JSON.stringify(data, null, 2);
      } catch (err) {
        output.textContent = 'Қате: ' + err.message;
      }
    }

    async function fetchEndpoint(url) {
      const output = document.getElementById('output');
      output.textContent = 'Сұраныс жіберілуде: GET ' + url + '...';
      try {
        const headers = { 'Accept': 'application/json' };
        if (authToken) {
          headers['Authorization'] = 'Bearer ' + authToken;
        }
        const res = await fetch(url, { headers });
        const data = await res.json();
        output.textContent = '// GET ' + url + '\\n// Status: ' + res.status + '\\n' + JSON.stringify(data, null, 2);
      } catch (err) {
        output.textContent = 'Қате: ' + err.message;
      }
    }

    // Initial load
    fetchEndpoint('/api/home');
  </script>
</body>
</html>`;
}
