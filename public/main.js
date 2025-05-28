// let container = document.getElementById('player-container');

// async function fetchPlaylist() {
//   const res = await fetch('/api/playlist');
//   return res.json();
// }

// async function playItems(items) {
//   for (const item of items) {
//     container.innerHTML = ''; // Clear previous
//     if (item.type === 'video') {
//       const video = document.createElement('video');
//       video.src = item.file;
//       video.autoplay = true;
//       video.controls = false;
//       video.onended = () => playItems(items); // Loop
//       container.appendChild(video);
//       await video.play();
//       return;
//     } else if (item.type === 'image') {
//       const img = document.createElement('img');
//       img.src = item.file;
//       container.appendChild(img);
//       await new Promise(r => setTimeout(r, (item.duration || 10) * 1000));
//     }
//   }
//   playItems(items); // Loop again
// }

// fetchPlaylist().then(playItems).catch(console.error);

let container = document.getElementById("player-container");

async function fetchPlaylist() {
  const res = await fetch("/api/playlist");
  return res.json();
}

function playItemsSequentially(items, index = 0) {
  if (items.length === 0) return;

  const item = items[index % items.length]; // Loop

  container.innerHTML = ""; // Clear previous content

  if (item.type === "video") {
    const video = document.createElement("video");
    video.src = item.file;
    video.autoplay = true;
    video.controls = false;
    video.style.width = "100vw";
    video.style.height = "100vh";
    container.appendChild(video);

    video.onended = () => {
      playItemsSequentially(items, index + 1);
    };

    video.onerror = () => {
      console.error("Failed to play video:", item.file);
      playItemsSequentially(items, index + 1); // Skip broken item
    };
  } else if (item.type === "image") {
    const img = document.createElement("img");
    img.src = item.file;
    img.style.width = "100vw";
    img.style.height = "100vh";
    container.appendChild(img);

    const duration = (item.duration || 10) * 1000;
    setTimeout(() => {
      playItemsSequentially(items, index + 1);
    }, duration);
  } else {
    console.warn("Unknown item type:", item);
    playItemsSequentially(items, index + 1);
  }
}

fetchPlaylist()
  .then((playlist) => {
    if (playlist && playlist.length > 0) {
      playItemsSequentially(playlist);
    } else {
      console.error("Empty playlist");
    }
  })
  .catch((err) => {
    console.error("Error loading playlist:", err);
  });
