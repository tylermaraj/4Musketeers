const API_KEY = "f22df8ad"; // Integrated OMDB API key

// DOM Elements
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const resultsDiv = document.getElementById("results");
const bookmarksList = document.getElementById("bookmarks-list");
const userDisplay = document.getElementById("user-display");
const movieModal = document.getElementById("movie-modal");
const modalDetails = document.getElementById("modal-movie-details");
const closeModal = document.querySelector(".close-modal");

// Function to show movie details
async function showMovieDetails(imdbID) {
  try {
    const response = await fetch(`https://www.omdbapi.com/?i=${imdbID}&apikey=${API_KEY}`);
    const movie = await response.json();
    
    modalDetails.innerHTML = `
      <div class="movie-details">
        <img src="${movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/300x450?text=No+Poster"}" alt="${movie.Title}">
        <div>
          <h2>${movie.Title} (${movie.Year})</h2>
          <p><strong>Director:</strong> ${movie.Director}</p>
          <p><strong>Actors:</strong> ${movie.Actors}</p>
          <p><strong>Plot:</strong> ${movie.Plot}</p>
          <p><strong>Rating:</strong> ${movie.imdbRating}/10 (${movie.imdbVotes} votes)</p>
        </div>
      </div>
    `;
    
    movieModal.style.display = "block";
  } catch (error) {
    console.error("Error fetching movie details:", error);
    modalDetails.innerHTML = "<p>Failed to load movie details.</p>";
  }
}

// Login Event Listener
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (username === "bob" && password === "bobpass") {
    loginSection.style.display = "none";
    appSection.style.display = "block";
    userDisplay.textContent = username;
    loadBookmarks();
  } else {
    alert("Invalid credentials! Use username: bob, password: bobpass");
  }
});

// Logout Functionality
logoutBtn.addEventListener("click", () => {
  loginSection.style.display = "block";
  appSection.style.display = "none";
  loginForm.reset();
});

// Search Movies Function
searchBtn.addEventListener("click", searchMovies);

async function searchMovies() {
  const query = searchInput.value.trim();
  if (!query) return;

  try {
    const response = await fetch(
      `https://www.omdbapi.com/?s=${query}&apikey=${API_KEY}`
    );
    const data = await response.json();

    if (data.Response === "True") {
      displayMovies(data.Search);
    } else {
      resultsDiv.innerHTML = `<p>No movies found for "${query}"</p>`;
    }
  } catch (error) {
    console.error("Error fetching movies:", error);
    resultsDiv.innerHTML = `<p>Error loading movies. Please try again.</p>`;
  }
}

// Display Movies Function
function displayMovies(movies) {
  resultsDiv.innerHTML = movies
    .map(
      (movie) => `
      <div class="movie-card" data-id="${movie.imdbID}">
        <img src="${movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/200x300?text=No+Poster"}" alt="${movie.Title}">
        <h3>${movie.Title}</h3>
        <p>Year: ${movie.Year}</p>
        <button class="bookmark-btn" data-id="${movie.imdbID}">Bookmark</button>
      </div>
    `
    )
    .join("");

  // Make movie cards clickable (NEW)
  document.querySelectorAll(".movie-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("bookmark-btn")) {
        const imdbID = card.getAttribute("data-id");
        showMovieDetails(imdbID);
      }
    });
  });

  // Add bookmark event listeners
  document.querySelectorAll(".bookmark-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const movieId = e.target.getAttribute("data-id");
      const movie = movies.find(m => m.imdbID === movieId);
      addBookmark(movie);
    });
  });
}

// Bookmark Functions
function addBookmark(movie) {
  let bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || [];
  if (!bookmarks.some(m => m.imdbID === movie.imdbID)) {
    movie.justAdded = true; // Flag for animation
    bookmarks.push(movie);
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
    showToast(`✓ ${movie.Title} bookmarked!`, 'success');
    loadBookmarks();
  } else {
    showToast(`⚠ Already bookmarked!`, 'warning');
  }
}

function loadBookmarks() {
  const bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || [];
  
  bookmarksList.innerHTML = bookmarks
    .map(movie => `
      <div class="movie-card ${movie.justAdded ? 'new-bookmark' : ''}" data-id="${movie.imdbID}">
        <img src="${movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/200x300?text=No+Poster"}" alt="${movie.Title}">
        <h3>${movie.Title}</h3>
        <p>Year: ${movie.Year}</p>
        <button class="remove-btn" data-id="${movie.imdbID}">Remove</button>
      </div>
    `)
    .join('');

  // Remove animation class after it plays
  setTimeout(() => {
    document.querySelectorAll('.new-bookmark').forEach(el => {
      el.classList.remove('new-bookmark');
    });
    
    // Clear the justAdded flags
    const updatedBookmarks = bookmarks.map(m => ({ ...m, justAdded: false }));
    localStorage.setItem("bookmarks", JSON.stringify(updatedBookmarks));
  }, 500);

  // Make bookmarked movies clickable
  document.querySelectorAll("#bookmarks-list .movie-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("remove-btn")) {
        const imdbID = card.getAttribute("data-id");
        showMovieDetails(imdbID);
      }
    });
  });

  // Add event listeners to remove buttons
  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const imdbID = e.target.getAttribute("data-id");
      removeBookmark(imdbID);
    });
  });
}

// Remove Bookmark Function
function removeBookmark(imdbID) {
  let bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || [];
  const movie = bookmarks.find(m => m.imdbID === imdbID);
  bookmarks = bookmarks.filter(m => m.imdbID !== imdbID);
  localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
  showToast(`🗑 ${movie.Title} removed`, 'error');
  loadBookmarks();
}

// Close modal when clicking X
closeModal.addEventListener("click", () => {
  movieModal.style.display = "none";
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === movieModal) {
    movieModal.style.display = "none";
  }
});

// Toast notification function
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000); // Auto-hide after 3 seconds
}