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

async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function syncMediaFiles() {
  const files = await fetchMediaFilesFromGitHub();

  if (files.length === 0) {
    console.log("[SYNC] No media files found on GitHub.");
    return;
  }

  // Make sure media directory exists
  if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR);
  }

  // Get current local files
  const localFiles = fs.existsSync(MEDIA_DIR) ? fs.readdirSync(MEDIA_DIR) : [];

  // Files from GitHub
  const githubFileNames = files.map((f) => f.name);

  // Download new or updated files from GitHub
  for (const file of files) {
    const localPath = path.join(MEDIA_DIR, file.name);
    // Download if file does not exist locally
    if (!localFiles.includes(file.name)) {
      console.log(`[SYNC] Downloading new file: ${file.name}`);
      await downloadFile(file.url, localPath);
    }
  }

  // Delete unused local files (those not in GitHub list)
  for (const localFile of localFiles) {
    if (!githubFileNames.includes(localFile)) {
      const filePath = path.join(MEDIA_DIR, localFile);
      fs.unlinkSync(filePath);
      console.log(`[SYNC] Deleted unused file: ${localFile}`);
    }
  }

  // Build and save updated playlist
  const playlist = buildPlaylist(files);
  fs.writeFileSync(PLAYLIST_PATH, JSON.stringify(playlist, null, 2));
  console.log("[SYNC] Playlist updated and saved.");
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
        file: `/media/${file.name}`, // Serve from local media folder
        type,
        playAt: playAt.toISOString(),
      };
    })
    .filter((item) => moment(item.playAt).isSameOrBefore(now));
}

app.get("/api/playlist", (req, res) => {
  if (fs.existsSync(PLAYLIST_PATH)) {
    const data = fs.readFileSync(PLAYLIST_PATH, "utf-8");
    return res.json(JSON.parse(data));
  }
  res.status(404).json({ error: "Playlist not found" });
});

// Schedule sync every hour
cron.schedule("* * * * *", async () => {
  console.log("[CRON] Syncing media files with GitHub...");
  await syncMediaFiles();
});

// Initial sync on startup
(async () => {
  await syncMediaFiles();

  app.listen(PORT, () => {
    console.log(`SCMP Media Player running at http://localhost:${PORT}`);
  });
})();
