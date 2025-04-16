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
      <div class="movie-card">
        <img src="${movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/200x300?text=No+Poster"}" alt="${movie.Title}">
        <h3>${movie.Title}</h3>
        <p>Year: ${movie.Year}</p>
        <button class="bookmark-btn" data-id="${movie.imdbID}">Bookmark</button>
      </div>
    `
    )
    .join("");

  // Add bookmark event listeners
  document.querySelectorAll(".bookmark-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const movieId = e.target.getAttribute("data-id");
      const movie = movies.find((m) => m.imdbID === movieId);
      addBookmark(movie);
    });
  });
}

// Bookmark Functions
function addBookmark(movie) {
  let bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || [];
  if (!bookmarks.some((m) => m.imdbID === movie.imdbID)) {
    bookmarks.push(movie);
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
    loadBookmarks();
  }
}

function loadBookmarks() {
  const bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || [];
  bookmarksList.innerHTML = bookmarks
    .map(
      (movie) => `
      <div class="movie-card">
        <img src="${movie.Poster}" alt="${movie.Title}">
        <h3>${movie.Title}</h3>
        <p>Year: ${movie.Year}</p>
      </div>
    `
    )
    .join("");
}