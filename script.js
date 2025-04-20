const API_KEY = "f22df8ad";

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
const genreList = document.querySelectorAll("#genre-list li");
const genreButtons = document.querySelectorAll(".genre-btn");

// Extended genre mapping with multiple keywords
const GENRE_MAPPING = {
  action: ["action", "adventure", "superhero", "martial arts"],
  comedy: ["comedy", "funny", "humor", "satire"],
  drama: ["drama", "romance", "emotional", "period"],
  horror: ["horror", "scary", "thriller", "psychological"],
  "sci-fi": ["sci-fi", "science fiction", "space", "future", "dystopian"],
  animation: ["animation", "animated", "cartoon", "anime"]
};

// Caches
let genreCache = JSON.parse(localStorage.getItem("genreCache")) || {};
let searchCache = JSON.parse(localStorage.getItem("searchCache")) || {};
let bookmarkCache = JSON.parse(localStorage.getItem("bookmarks")) || [];

// Initialize the app
document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  setupEventListeners();
  clearStaleCache();
  
  // Check if user is already logged in
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    loginSection.style.display = "none";
    appSection.style.display = "block";
    userDisplay.textContent = loggedInUser;
    loadBookmarks();
  }
}

function setupEventListeners() {
  // Login
  loginForm.addEventListener("submit", handleLogin);
  
  // Logout
  logoutBtn.addEventListener("click", handleLogout);
  
  // Search
  searchBtn.addEventListener("click", searchMovies);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchMovies();
  });
  
  // Genre navigation
  genreList.forEach(item => {
    item.addEventListener("click", () => loadGenreMovies(item.dataset.genre));
  });
  
  // Genre quick filters
  genreButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // Highlight active genre
      genreButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadGenreMovies(btn.dataset.genre);
    });
  });
  
  // Modal
  closeModal.addEventListener("click", () => movieModal.style.display = "none");
  window.addEventListener("click", (e) => {
    if (e.target === movieModal) movieModal.style.display = "none";
  });

// Bookmark Sidebar Button
document.getElementById('bookmarks-nav-btn').addEventListener('click', () => {
  document.getElementById('bookmarks').scrollIntoView({
    behavior: 'smooth'
  });
});

}

// Authentication Functions
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (username === "bob" && password === "bobpass") {
    loginSection.style.display = "none";
    appSection.style.display = "block";
    userDisplay.textContent = username;
    localStorage.setItem("loggedInUser", username);
    loadBookmarks();
    showToast("Login successful!", "success");
  } else {
    showToast("Invalid credentials! Use: bob/bobpass", "error");
  }
}

function handleLogout() {
  loginSection.style.display = "block";
  appSection.style.display = "none";
  loginForm.reset();
  localStorage.removeItem("loggedInUser");
  showToast("Logged out successfully", "success");
}

// Movie Search Functions
async function searchMovies() {
  const query = searchInput.value.trim();
  if (!query) {
    showToast("Please enter a search term", "warning");
    return;
  }

  // Check cache first
  if (searchCache[query]) {
    displayMovies(searchCache[query]);
    showToast(`Showing cached results for "${query}"`, "info");
    return;
  }

  showToast(`Searching for "${query}"...`, "info");
  resultsDiv.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const response = await fetch(`https://www.omdbapi.com/?s=${query}&apikey=${API_KEY}`);
    const data = await response.json();

    if (data.Response === "True") {
      // Get detailed info for each movie
      const detailedMovies = await getDetailedMovies(data.Search);
      
      // Cache results
      searchCache[query] = detailedMovies;
      localStorage.setItem("searchCache", JSON.stringify(searchCache));
      
      displayMovies(detailedMovies);
      showToast(`Found ${detailedMovies.length} movies for "${query}"`, "success");
    } else {
      resultsDiv.innerHTML = `<p class="error-message">No results for "${query}"</p>`;
      showToast(`No movies found for "${query}"`, "warning");
    }
  } catch (error) {
    console.error("Search error:", error);
    resultsDiv.innerHTML = `<p class="error-message">Search failed. Please try again.</p>`;
    showToast("Search failed. Please try again.", "error");
  }
}

// Genre Functions
async function loadGenreMovies(genre) {
  showToast(`Loading ${genre} movies...`, "info");
  resultsDiv.innerHTML = '<div class="loading-spinner"></div>';

  try {
    // 1. Fetch multiple pages to get enough results
    const searchTerms = {
      action: "action",
      comedy: "comedy",
      drama: "drama",
      horror: "horror",
      "sci-fi": "sci-fi",
      animation: "animated"
    };
    
    const query = searchTerms[genre] || genre;
    const movies = await getMoreMovies(query);

    // 2. Get detailed info (parallel requests)
    const detailedMovies = await getDetailedMovies(movies);
    
    // 3. Filter with lenient fallback
    let filteredMovies = detailedMovies.filter(movie => {
      if (!movie.Genre) return true; // Keep if no genre data
      return movie.Genre.toLowerCase().includes(genre);
    });
    
    // 4. Ensure exactly 12 results
    if (filteredMovies.length < 12) {
      const needed = 12 - filteredMovies.length;
      const fallbackMovies = detailedMovies
        .filter(m => !filteredMovies.includes(m))
        .slice(0, needed);
      filteredMovies = [...filteredMovies, ...fallbackMovies];
    } else {
      filteredMovies = filteredMovies.slice(0, 12);
    }

    displayMovies(filteredMovies);
    showToast(`Showing 12 ${genre} movies`, "success");
    
  } catch (error) {
    console.error("Error:", error);
    resultsDiv.innerHTML = `<p class="error-message">Failed to load movies</p>`;
    showToast("Network error", "error");
  }
}

// Helper function to get enough movies
async function getMoreMovies(query) {
  const responses = await Promise.all([
    fetch(`https://www.omdbapi.com/?s=${query}&type=movie&page=1&apikey=${API_KEY}`),
    fetch(`https://www.omdbapi.com/?s=${query}&type=movie&page=2&apikey=${API_KEY}`)
  ]);
  
  const data = await Promise.all(responses.map(r => r.json()));
  const allMovies = data.flatMap(d => d.Search || []);
  
  // Remove duplicates and return 12
  return [...new Map(
    allMovies.map(movie => [movie.imdbID, movie])
  ).values()].slice(0, 12);
}

// Helper Functions
async function getDetailedMovies(movies) {
  const detailedRequests = movies.map(movie => 
    fetch(`https://www.omdbapi.com/?i=${movie.imdbID}&apikey=${API_KEY}`)
      .then(res => res.json())
      .catch(() => null) // Handle individual failures
  );
  
  const detailedResults = await Promise.all(detailedRequests);
  return detailedResults.filter(movie => movie && movie.Response === "True");
}

function clearStaleCache() {
  const today = new Date().toDateString();
  const lastCleared = localStorage.getItem("lastCacheClear");
  
  if (lastCleared !== today) {
    localStorage.removeItem("genreCache");
    localStorage.removeItem("searchCache");
    localStorage.setItem("lastCacheClear", today);
    genreCache = {};
    searchCache = {};
  }
}

// Display Functions
function displayMovies(movies) {
  if (!movies || movies.length === 0) {
    resultsDiv.innerHTML = `<p class="error-message">No movies found</p>`;
    return;
  }

  resultsDiv.innerHTML = movies.map(movie => `
    <div class="movie-card" data-id="${movie.imdbID}">
      <img src="${movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/200x300?text=No+Poster"}" 
           alt="${movie.Title}"
           onerror="this.src='https://via.placeholder.com/200x300?text=No+Poster'">
      <div class="movie-info">
        <h3>${movie.Title}</h3>
        <p>${movie.Year} • ${movie.Runtime || "N/A"}</p>
        ${movie.imdbRating ? `<p><span class="rating">⭐ ${movie.imdbRating}</span></p>` : ""}
        <button class="bookmark-btn" data-id="${movie.imdbID}">
          ${isBookmarked(movie.imdbID) ? "★ Bookmarked" : "☆ Bookmark"}
        </button>
      </div>
    </div>
  `).join("");

  // Add event listeners
  document.querySelectorAll(".movie-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("bookmark-btn")) {
        showMovieDetails(card.dataset.id);
      }
    });
  });

  document.querySelectorAll(".bookmark-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const movieId = e.target.dataset.id;
      const movie = movies.find(m => m.imdbID === movieId);
      
      if (isBookmarked(movieId)) {
        removeBookmark(movieId);
      } else {
        addBookmark(movie);
      }
    });
  });
}

// Bookmark Functions
function addBookmark(movie) {
  if (!movie) return;
  
  if (!isBookmarked(movie.imdbID)) {
    bookmarkCache.push(movie);
    localStorage.setItem("bookmarks", JSON.stringify(bookmarkCache));
    showToast(`"${movie.Title}" bookmarked`, "success");
    loadBookmarks();
    
    // Update bookmark button state
    const btn = document.querySelector(`.bookmark-btn[data-id="${movie.imdbID}"]`);
    if (btn) btn.textContent = "★ Bookmarked";
  }
}

function removeBookmark(imdbID) {
  const movie = bookmarkCache.find(m => m.imdbID === imdbID);
  if (movie) {
    bookmarkCache = bookmarkCache.filter(m => m.imdbID !== imdbID);
    localStorage.setItem("bookmarks", JSON.stringify(bookmarkCache));
    showToast(`"${movie.Title}" removed`, "error");
    loadBookmarks();
    
    // Update bookmark button state
    const btn = document.querySelector(`.bookmark-btn[data-id="${imdbID}"]`);
    if (btn) btn.textContent = "☆ Bookmark";
  }
}

function loadBookmarks() {
  bookmarkCache = JSON.parse(localStorage.getItem("bookmarks")) || [];
  
  if (bookmarkCache.length === 0) {
    bookmarksList.innerHTML = `<p class="empty-message">No bookmarks yet</p>`;
    return;
  }

  bookmarksList.innerHTML = bookmarkCache.map(movie => `
    <div class="movie-card" data-id="${movie.imdbID}">
      <img src="${movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/200x300?text=No+Poster"}" 
           alt="${movie.Title}"
           onerror="this.src='https://via.placeholder.com/200x300?text=No+Poster'">
      <div class="movie-info">
        <h3>${movie.Title}</h3>
        <p>${movie.Year}</p>
        <button class="remove-btn" data-id="${movie.imdbID}">Remove</button>
      </div>
    </div>
  `).join("");

  // Add event listeners
  document.querySelectorAll("#bookmarks-list .movie-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("remove-btn")) {
        showMovieDetails(card.dataset.id);
      }
    });
  });

  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeBookmark(btn.dataset.id);
    });
  });
}

function isBookmarked(imdbID) {
  return bookmarkCache.some(movie => movie.imdbID === imdbID);
}

// Movie Details Modal
async function showMovieDetails(imdbID) {
  try {
    const movie = await fetch(`https://www.omdbapi.com/?i=${imdbID}&apikey=${API_KEY}`)
      .then(res => res.json());
    
    if (movie.Response !== "True") throw new Error("No movie data");

    modalDetails.innerHTML = `
      <div class="movie-details">
        <img src="${movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/300x450?text=No+Poster"}" 
             alt="${movie.Title}"
             onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'">
        <div>
          <h2>${movie.Title} (${movie.Year})</h2>
          <p><strong>Genre:</strong> ${movie.Genre || "N/A"}</p>
          <p><strong>Director:</strong> ${movie.Director || "N/A"}</p>
          <p><strong>Actors:</strong> ${movie.Actors || "N/A"}</p>
          <p><strong>Plot:</strong> ${movie.Plot || "N/A"}</p>
          <p><strong>Rating:</strong> ${movie.imdbRating || "N/A"}/10 (${movie.imdbVotes || "N/A"} votes)</p>
          <button class="bookmark-btn" data-id="${movie.imdbID}">
            ${isBookmarked(movie.imdbID) ? "★ Remove Bookmark" : "☆ Add Bookmark"}
          </button>
        </div>
      </div>
    `;

    // Add bookmark button in modal
    modalDetails.querySelector(".bookmark-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      if (isBookmarked(movie.imdbID)) {
        removeBookmark(movie.imdbID);
      } else {
        addBookmark(movie);
      }
      movieModal.style.display = "none"; // Close modal after action
    });

    movieModal.style.display = "block";
  } catch (error) {
    console.error("Error showing details:", error);
    showToast("Failed to load movie details", "error");
  }
}

// Toast Notification
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  // Clear previous timeout if exists
  if (toast.timeoutId) clearTimeout(toast.timeoutId);
  
  toast.timeoutId = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}