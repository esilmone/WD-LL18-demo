// --- DOM elements ---
const randomBtn = document.getElementById("random-btn");
const recipeDisplay = document.getElementById("recipe-display");
const savedRecipesContainer = document.getElementById("saved-recipes-container");
const savedRecipesList = document.getElementById("saved-recipes-list");

// This function creates a list of ingredients for the recipe from the API data
// It loops through the ingredients and measures, up to 20, and returns an HTML string
// that can be used to display them in a list format
// If an ingredient is empty or just whitespace, it skips that item 
function getIngredientsHtml(recipe) {
  let html = "";
  for (let i = 1; i <= 20; i++) {
    const ing = recipe[`strIngredient${i}`];
    const meas = recipe[`strMeasure${i}`];
    if (ing && ing.trim()) html += `<li>${meas ? `${meas} ` : ""}${ing}</li>`;
  }
  return html;
}

// This function displays the recipe on the page
function renderRecipe(recipe) {
  recipeDisplay.innerHTML = `
    <div class="recipe-title-row">
      <h2>${recipe.strMeal}</h2>
    </div>
    <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
    <h3>Ingredients:</h3>
    <ul>${getIngredientsHtml(recipe)}</ul>
    <h3>Instructions:</h3>
    <p>${recipe.strInstructions.replace(/\r?\n/g, "<br>")}</p>
    <button class="accent-btn save-inline-btn" onclick="saveRecipe('${recipe.strMeal}')">
      <span class="material-symbols-outlined icon-btn">bookmark</span>
      Save Recipe
    </button>
  `;
}

// Save a recipe name to local storage
function saveRecipe(recipeName) {
  let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
  if (!savedRecipes.includes(recipeName)) {
    savedRecipes.push(recipeName);
    localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
    loadSavedRecipes(); // Refresh the displayed list
  }
}

// Delete a recipe from local storage
function deleteRecipe(recipeName) {
  let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
  savedRecipes = savedRecipes.filter(name => name !== recipeName);
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  loadSavedRecipes(); // Refresh the displayed list
}

// This function fetches a recipe by name from MealDB
async function fetchRecipeByName(recipeName) {
  recipeDisplay.innerHTML = "<p>Loading...</p>";
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(recipeName)}`);
    const data = await res.json();
    if (data.meals && data.meals[0]) {
      window.lastRecipe = data.meals[0]; // Save for remixing
      renderRecipe(data.meals[0]);
    } else {
      recipeDisplay.innerHTML = "<p>Sorry, couldn't find that recipe.</p>";
    }
  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load the recipe.</p>";
  }
}

// Load and display saved recipes
function loadSavedRecipes() {
  const savedRecipes = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
  
  if (savedRecipes.length > 0) {
    savedRecipesContainer.style.display = 'block';
    savedRecipesList.innerHTML = savedRecipes.map(name => `
      <li class="saved-recipe-item">
        <span onclick="fetchRecipeByName('${name}')" role="button" tabindex="0">${name}</span>
        <button class="delete-btn" onclick="deleteRecipe('${name}')">Delete</button>
      </li>
    `).join('');
  } else {
    savedRecipesContainer.style.display = 'none';
  }
}

// This function gets a random recipe from the API and shows it
async function fetchAndDisplayRandomRecipe() {
  recipeDisplay.innerHTML = "<p>Loading...</p>"; // Show loading message
  try {
    // Fetch a random recipe from the MealDB API
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php'); // Replace with the actual API URL
    const data = await res.json(); // Parse the JSON response
    const recipe = data.meals[0]; // Get the first recipe from the response
    window.lastRecipe = recipe; // Save the recipe for remixing
    renderRecipe(recipe); // Render the recipe on the page

  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load a recipe.</p>";
  }
}


// --- Remix feature ---

// Get DOM elements for remix controls
const remixBtn = document.getElementById("remix-btn");
const remixThemeSelect = document.getElementById("remix-theme");
const remixOutput = document.getElementById("remix-output");

// This function sends the recipe and remix theme to OpenAI and shows the remix
async function remixRecipeWithAI(recipe, theme) {
  // Show a fun, friendly loading message while waiting for the AI
  remixOutput.textContent = "🪄 Chef is cooking up your remix... hang tight for a tasty twist!";

  // Build the prompt for the AI
  const prompt = `
You are a creative chef. Remix this recipe for "${recipe.strMeal}" with the theme: "${theme}".
Give a short, fun, and doable version. Highlight any changed ingredients or instructions.
Recipe JSON:
${JSON.stringify(recipe, null, 2)}
`;

  try {
    // Send the prompt to OpenAI's chat completions API
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Get your OpenAI API key from secrets.js
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1", // Use the gpt-4.1 model
        messages: [
          { role: "system", content: "You are a creative chef remixing recipes for beginners." },
          { role: "user", content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.9
      })
    });

    const data = await res.json(); // Parse the JSON response

    // Show the AI's remix in the output box
    remixOutput.textContent = data.choices && data.choices[0] && data.choices[0].message.content
      ? data.choices[0].message.content
      : "Oops! Chef couldn't remix your recipe this time. Please try again in a moment.";

  } catch (error) {
    // Friendly error message if something goes wrong
    remixOutput.textContent = "Oops! Something went wrong while remixing. Please try again!";
  }
}


// --- Event listeners ---

// When the button is clicked, get and show a new random recipe
randomBtn.addEventListener("click", fetchAndDisplayRandomRecipe);


// When the page loads, show saved recipes and a random recipe
document.addEventListener("DOMContentLoaded", () => {
  loadSavedRecipes();
  fetchAndDisplayRandomRecipe();
});

// When the Remix button is clicked, send the recipe and theme to OpenAI
remixBtn.addEventListener("click", async () => {
  // Get the currently displayed recipe from the page
  // We need to fetch a fresh recipe from the API, or store the last one shown
  // For simplicity, let's store the last recipe in a variable
  if (window.lastRecipe) {
    const theme = remixThemeSelect.value;
    await remixRecipeWithAI(window.lastRecipe, theme);
  } else {
    remixOutput.textContent = "Please load a recipe first!";
  }
});