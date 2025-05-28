const express = require("express");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const axios = require("axios");
const moment = require("moment");

const app = express();
const PORT = 3000;
const PLAYLIST_PATH = path.join(__dirname, "playlist.json");
const MEDIA_DIR = path.join(__dirname, "media");

app.use("/", express.static(path.join(__dirname, "public")));
app.use("/media", express.static(MEDIA_DIR));

function getMimeTypeFromExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext))
    return "image";
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) return "video";
  return "unknown";
}

async function fetchMediaFilesFromGitHub() {
  try {
    const githubApiUrl =
      "https://api.github.com/repos/underlineit-dev-7/screen-media-player/contents/media";
    const response = await axios.get(githubApiUrl);

    const files = response.data
      .filter((item) => item.type === "file")
      .map((file) => ({
        name: file.name,
        url: file.download_url,
        playAt: moment().toISOString(), // Default: now
      }));

    return files;
  } catch (error) {
    console.error("Error fetching media files from GitHub:", error.message);
    return [];
  }
}

function buildPlaylist(files) {
  const now = moment(); // System timezone

  return files
    .map((file, index) => {
      const type = getMimeTypeFromExtension(file.name);
      const playAt = file.playAt ? moment(file.playAt) : now;

      return {
        id: index + 1,
        title: file.name,
        file: file.url,
        type,
        playAt: playAt.toISOString(),
      };
    })
    .filter((item) => moment(item.playAt).isSameOrBefore(now));
}

app.get("/api/playlist", async (req, res) => {
  if (fs.existsSync(PLAYLIST_PATH)) {
    const data = fs.readFileSync(PLAYLIST_PATH, "utf-8");
    return res.json(JSON.parse(data));
  }

  const files = await fetchMediaFilesFromGitHub();
  if (files.length === 0) {
    return res.status(404).json({ error: "No media files found" });
  }

  const playlist = buildPlaylist(files);
  res.json(playlist);
});

cron.schedule("0 * * * *", async () => {
  console.log("[CRON] Checking for playlist updates from GitHub...");
  const files = await fetchMediaFilesFromGitHub();
  console.log(`[CRON] Found ${files.length} media files on GitHub.`);
  if (files.length > 0) {
    const playlist = buildPlaylist(files);
    fs.writeFileSync(PLAYLIST_PATH, JSON.stringify(playlist, null, 2));
    console.log("[UPDATE] Playlist updated and saved to local file.");
  } else {
    console.log("[UPDATE] No media files found to update playlist.");
  }
});

app.listen(PORT, () => {
  console.log(`SCMP Media Player running at http://localhost:${PORT}`);
});
