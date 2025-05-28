// const express = require("express");
// const path = require("path");
// const fs = require("fs");
// const cron = require("node-cron");
// const axios = require("axios");

// const app = express();
// const PORT = 3000;
// const PLAYLIST_PATH = path.join(__dirname, "playlist.json");
// const MEDIA_DIR = path.join(__dirname, "media");

// // Serve frontend
// app.use("/", express.static(path.join(__dirname, "public")));
// app.use("/media", express.static(MEDIA_DIR));

// // Return current playlist
// app.get("/api/playlist", (req, res) => {
//   if (fs.existsSync(PLAYLIST_PATH)) {
//     const data = fs.readFileSync(PLAYLIST_PATH, "utf-8");
//     res.json(JSON.parse(data));
//   } else {
//     res.status(404).json({ error: "Playlist not found" });
//   }
// });

// // Optional: Check server for updates every hour
// cron.schedule("* * * * *", async () => {
//   console.log("heyyyy");
//   console.log("[CRON] Checking for playlist updates...");
//   try {
//     // const response = await axios.post(
//     //   "https://github.com/domfeik/SCMPServer/blob/develop/d9/mp5_multi_check.php",
//     //   {
//     //     id: "MP001",
//     //   }
//     // );

//     const response = await axios.post("https://github.com/underlineit-dev-7/screen-media-player/tree/main/media", {
//       id: "MP001",
//     });
//     console.log("checkkkk", response.data);
//     const playlist = response.data?.playlist;
//     if (playlist) {
//       fs.writeFileSync(PLAYLIST_PATH, JSON.stringify(playlist, null, 2));
//       console.log("[UPDATE] Playlist updated from server.");
//     } else {
//       console.log("[UPDATE] No new playlist.");
//     }
//   } catch (err) {
//     console.error("[ERROR] Failed to update playlist:", err.message);
//   }
// });

// app.listen(PORT, () => {
//   console.log(`SCMP Media Player running at http://localhost:${PORT}`);
// });


const express = require("express");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const axios = require("axios");

const app = express();
const PORT = 3000;
const PLAYLIST_PATH = path.join(__dirname, "playlist.json");
const MEDIA_DIR = path.join(__dirname, "media");

// Serve frontend static files (your player UI etc)
app.use("/", express.static(path.join(__dirname, "public")));

// Serve local media folder (optional, if you have local files)
app.use("/media", express.static(MEDIA_DIR));

// Helper function: fetch media files list from GitHub API
async function fetchMediaFilesFromGitHub() {
  try {
    const githubApiUrl = 
      "https://api.github.com/repos/underlineit-dev-7/screen-media-player/contents/media";

    const response = await axios.get(githubApiUrl);
    // Filter only files, map name and raw download url
    const files = response.data
      .filter(item => item.type === "file")
      .map(file => ({
        name: file.name,
        url: file.download_url
      }));

    return files;
  } catch (error) {
    console.error("Error fetching media files from GitHub:", error.message);
    return [];
  }
}

// Endpoint to get playlist.json (dynamically generated)
app.get("/api/playlist", async (req, res) => {
  // Option 1: Read cached playlist.json if exists
  if (fs.existsSync(PLAYLIST_PATH)) {
    const data = fs.readFileSync(PLAYLIST_PATH, "utf-8");
    return res.json(JSON.parse(data));
  }

  // Option 2: Or fetch fresh from GitHub and respond directly
  const files = await fetchMediaFilesFromGitHub();
  if (files.length === 0) {
    return res.status(404).json({ error: "No media files found" });
  }

  // Create playlist structure your player expects
  const playlist = files.map((file, index) => ({
    id: index + 1,
    title: file.name,
    src: file.url,
    type: "video/mp4" // or "image/jpeg" depending on your media type
  }));

  res.json(playlist);
});

// Optional: Periodic cron job to update local playlist.json file every hour
cron.schedule("* * * * *", async () => {
  console.log("[CRON] Checking for playlist updates from GitHub...");
  const files = await fetchMediaFilesFromGitHub();
  if (files.length > 0) {
    const playlist = files.map((file, index) => ({
      id: index + 1,
      title: file.name,
      src: file.url,
      type: "video/mp4"
    }));

    fs.writeFileSync(PLAYLIST_PATH, JSON.stringify(playlist, null, 2));
    console.log("[UPDATE] Playlist updated and saved to local file.");
  } else {
    console.log("[UPDATE] No media files found to update playlist.");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`SCMP Media Player running at http://localhost:${PORT}`);
});
