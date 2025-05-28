const express = require('express');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = 3000;
const PLAYLIST_PATH = path.join(__dirname, 'playlist.json');
const MEDIA_DIR = path.join(__dirname, 'media');

// Serve frontend
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/media', express.static(MEDIA_DIR));

// Return current playlist
app.get('/api/playlist', (req, res) => {
  if (fs.existsSync(PLAYLIST_PATH)) {
    const data = fs.readFileSync(PLAYLIST_PATH, 'utf-8');
    res.json(JSON.parse(data));
  } else {
    res.status(404).json({ error: 'Playlist not found' });
  }
});

// Optional: Check server for updates every hour
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Checking for playlist updates...');
  try {
    const response = await axios.post('https://yourserver.com/d9/mp5_multi_check.php', {
      id: 'MP001',
    });
    const playlist = response.data?.playlist;
    if (playlist) {
      fs.writeFileSync(PLAYLIST_PATH, JSON.stringify(playlist, null, 2));
      console.log('[UPDATE] Playlist updated from server.');
    } else {
      console.log('[UPDATE] No new playlist.');
    }
  } catch (err) {
    console.error('[ERROR] Failed to update playlist:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`SCMP Media Player running at http://localhost:${PORT}`);
});
