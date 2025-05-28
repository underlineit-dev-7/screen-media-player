let container = document.getElementById("player-container");

async function fetchPlaylist() {
  const res = await fetch("/api/playlist");
  return res.json();
}

function playItem(item) {
  container.innerHTML = ""; // Clear previous content

  if (item.type === "video") {
    const video = document.createElement("video");
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.src = item.file;
    video.controls = false;
    video.style.width = "100vw";
    video.style.height = "100vh";
    container.appendChild(video);

    video.onended = () => startPlayback(); // Replay logic
    video.onerror = () => startPlayback(); // Skip broken
  } else if (item.type === "image") {
    const img = document.createElement("img");
    img.src = item.file;
    img.style.width = "100vw";
    img.style.height = "100vh";
    container.appendChild(img);

    const duration = (item.duration || 10) * 1000;
    setTimeout(() => startPlayback(), duration);
  } else {
    console.warn("Unknown item type:", item);
    startPlayback(); // Skip unknown
  }
}

function startPlayback() {
  fetchPlaylist()
    .then((playlist) => {
      if (!playlist || playlist.length === 0) {
        console.error("Empty playlist");
        return;
      }

      const now = moment().startOf("minute");

      const match = playlist.find((item) => {
        return item.playAt && moment(item.playAt).startOf("minute").isSame(now);
      });

      if (match) {
        console.log("Playing scheduled item:", match.title);
        playItem(match);
      } else {
        const randomItem = playlist[Math.floor(Math.random() * playlist.length)];
        console.log("No match. Playing random item:", randomItem.title);
        playItem(randomItem);
      }
    })
    .catch((err) => {
      console.error("Error loading playlist:", err);
    });
}

startPlayback();
