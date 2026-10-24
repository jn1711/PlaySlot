import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// In this environment Nginx listens on 8080 and proxies to 3000
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/static', express.static(path.join(__dirname, 'public')));

// Template serving
function serveTemplate(templateName: string, res: express.Response) {
	const p = path.join(__dirname, 'templates', templateName);
	if (fs.existsSync(p)) {
		return res.sendFile(p);
	}
	res.sendFile(path.join(__dirname, 'templates', 'index.html'));
}

app.get('/', (_req, res) => serveTemplate('index.html', res));
app.get('/index', (_req, res) => serveTemplate('index.html', res));
app.get('/courts', (_req, res) => serveTemplate('courts.html', res));
app.get('/booking', (_req, res) => serveTemplate('booking.html', res));
app.get('/games', (_req, res) => serveTemplate('games.html', res));
app.get('/profile', (_req, res) => serveTemplate('profile.html', res));
app.get('/owner', (_req, res) => serveTemplate('owner.html', res));
app.get('/admin', (_req, res) => serveTemplate('admin.html', res));

app.use((_req, res) => {
	serveTemplate('index.html', res);
});

app.listen(PORT, '0.0.0.0', () => {
	console.log(`PlaySlot server running on http://0.0.0.0:${PORT}`);
});
