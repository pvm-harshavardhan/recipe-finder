// DummyJSON Recipes API endpoints
const BASE_URL = 'https://dummyjson.com/recipes';

const CATEGORIES = [
  { name: 'Breakfast', value: 'breakfast' },
  { name: 'Lunch', value: 'lunch' },
  { name: 'Dinner', value: 'dinner' },
  { name: 'Dessert', value: 'dessert' },
  { name: 'Appetizer', value: 'appetizer' },
  { name: 'Salad', value: 'salad' },
  { name: 'Main Course', value: 'main course' },
  { name: 'Beverage', value: 'beverage' },
  { name: 'Vegetarian', value: 'vegetarian' },
  { name: 'Vegan', value: 'vegan' },
];

let AREAS = [];
let INGREDIENTS = [];

let activeCategory = '';
let activeArea = '';
let activeIngredient = '';

const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const resultsDiv = document.getElementById('results');
const navCategories = document.getElementById('navCategories');
const categorySection = document.getElementById('categorySection');
const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');
const closeProfile = document.getElementById('closeProfile');
const likedRecipesDiv = document.getElementById('likedRecipes');
const detailsModal = document.getElementById('detailsModal');
const closeDetails = document.getElementById('closeDetails');
const detailsContent = document.getElementById('detailsContent');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const loadMoreBtn = document.getElementById('loadMoreBtn');

const searchFormMobile = document.getElementById('searchFormMobile');
const searchInputMobile = document.getElementById('searchInputMobile');

let currentQuery = '';
let currentType = '';
let loadedRecipes = [];
let allRecipes = [];
let currentOffset = 0;
const PAGE_SIZE = 12;

const vegOnlyBtn = document.getElementById('vegOnlyBtn');
let vegOnly = false;

// Fetch categories, areas, ingredients
async function fetchFilters() {
  // Areas
  const areaRes = await fetch(`https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&number=1&type=area`);
  const areaData = await areaRes.json();
  AREAS = areaData.results.map(a => a.title);
  // Ingredients
  const ingRes = await fetch(`https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&number=1&type=ingredient`);
  const ingData = await ingRes.json();
  INGREDIENTS = ingData.results.map(i => i.name);
}

// Filter categories to only those that return results
async function filterValidCategories() {
  const validCategories = [];
  for (const cat of CATEGORIES) {
    if (cat.value === 'vegetarian' || cat.value === 'vegan') {
      validCategories.push(cat);
      continue;
    }
    const res = await fetch(`${BASE_URL}/meal-type/${encodeURIComponent(cat.value)}`);
    const data = await res.json();
    if (data.recipes && data.recipes.length > 0) {
      validCategories.push(cat);
    }
  }
  return validCategories;
}

let filteredCategories = CATEGORIES;
async function renderCategories() {
  categorySection.innerHTML = '';
  filteredCategories.forEach(cat => {
    const secBtn = document.createElement('button');
    secBtn.textContent = cat.name;
    secBtn.className = `px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${activeCategory === cat.value ? 'category-btn-active scale-105 shadow' : 'bg-green-200 hover:bg-green-300 text-green-800'}`;
    secBtn.onclick = () => {
      activeCategory = cat.value;
      renderCategories();
      fetchAndDisplayRecipes({ type: cat.value });
    };
    categorySection.appendChild(secBtn);
  });
}

// Fetch recipes (search, filter, or all)
async function fetchAndDisplayRecipes({ query = '', type = '', append = false } = {}) {
  if (!append) {
    resultsDiv.innerHTML = '<div class="flex flex-col items-center justify-center py-12"><img src="https://cdn-icons-png.flaticon.com/512/1046/1046857.png" class="w-16 h-16 mb-4 opacity-60 animate-bounce" alt="Loading"><div class="text-gray-500 text-lg">Loading recipes...</div></div>';
    loadedRecipes = [];
    currentOffset = 0;
  }
  let url = BASE_URL;
  let params = [];
  let isMainEndpoint = false;
  if (query) {
    url += `/search?q=${encodeURIComponent(query)}`;
  } else if (type && type !== 'vegetarian' && type !== 'vegan') {
    url += `/meal-type/${encodeURIComponent(type)}`;
  } else {
    isMainEndpoint = true;
  }
  if (isMainEndpoint) {
    params.push(`limit=${PAGE_SIZE}`);
    params.push(`skip=${currentOffset}`);
  }
  try {
    const res = await fetch(params.length ? `${url}?${params.join('&')}` : url);
    const data = await res.json();
    let recipes = data.recipes || data.results || [];
    // Client-side veg/vegan filter
    if (vegOnly) {
      recipes = recipes.filter(r => r.tags && r.tags.some(tag => tag.toLowerCase().includes('vegetarian')));
    }
    if (type === 'vegan') {
      recipes = recipes.filter(r => r.tags && r.tags.some(tag => tag.toLowerCase().includes('vegan')));
    }
    // For search and meal-type, paginate client-side if needed
    if (!isMainEndpoint) {
      if (!append) {
        loadedRecipes = recipes.slice(0, PAGE_SIZE);
        currentOffset = PAGE_SIZE;
      } else {
        loadedRecipes = loadedRecipes.concat(recipes.slice(currentOffset, currentOffset + PAGE_SIZE));
        currentOffset += PAGE_SIZE;
      }
    } else {
      if (!append) {
        loadedRecipes = recipes;
        currentOffset = PAGE_SIZE;
      } else {
        loadedRecipes = loadedRecipes.concat(recipes);
        currentOffset += PAGE_SIZE;
      }
    }
    if (loadedRecipes.length > 0) {
      resultsDiv.innerHTML = loadedRecipes.map(recipe => renderRecipeCard(recipe)).join('');
      resultsDiv.className = 'w-full max-w-7xl grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 md:mx-10 xl:grid-cols-4';
      attachLikeHandlers();
      if (!isMainEndpoint) {
        if (currentOffset >= recipes.length) {
          loadMoreBtn.classList.add('hidden');
        } else {
          loadMoreBtn.classList.remove('hidden');
        }
      } else {
        if (recipes.length < PAGE_SIZE) {
          loadMoreBtn.classList.add('hidden');
        } else {
          loadMoreBtn.classList.remove('hidden');
        }
      }
    } else {
      resultsDiv.innerHTML = `<div class='flex flex-col items-center justify-center py-12'>
        <img src='https://cdn-icons-png.flaticon.com/512/4072/4072301.png' class='w-24 h-24 mb-4 opacity-60' alt='No recipes'>
        <div class='text-red-400 text-lg font-semibold'>No recipes found.</div>
      </div>`;
      resultsDiv.className = 'w-full max-w-5xl grid gap-8';
      loadMoreBtn.classList.add('hidden');
    }
  } catch (err) {
    resultsDiv.innerHTML = `<div class='flex flex-col items-center justify-center py-12'>
      <img src='https://cdn-icons-png.flaticon.com/512/564/564619.png' class='w-20 h-20 mb-4 opacity-60' alt='Error'>
      <div class='text-red-500 text-lg font-semibold'>Error fetching recipes. Please try again later.</div>
    </div>`;
    resultsDiv.className = 'w-full max-w-5xl grid gap-8';
    loadMoreBtn.classList.add('hidden');
  }
}

function renderRecipeCard(recipe) {
  const liked = isRecipeLiked(recipe.id);
  const recipeName = recipe.name || 'No Name';
  return `
    <div class="bg-white glass rounded-2xl shadow-xl p-5 flex flex-col items-center relative group">
      <img src="${recipe.image}" alt="${recipeName}" class="w-56 h-56 object-cover rounded-xl mb-3 shadow-md border-4 border-white group-hover:border-green-200 transition-all duration-200">
      <h2 class="text-lg font-bold mb-2 text-center text-green-800 group-hover:text-green-600 transition-colors">${recipeName}</h2>
      <div class="flex items-center gap-3 mt-2">
        <button class="view-btn text-white bg-gradient-to-r from-green-400 to-blue-400 px-8 py-3 rounded-lg font-semibold shadow hover:from-green-500 hover:to-blue-500 transition-all duration-200 text-lg" data-id="${recipe.id}">View Recipe</button>
        <button class="like-btn text-5xl focus:outline-none" data-id="${recipe.id}" data-title="${encodeURIComponent(recipeName)}" data-image="${encodeURIComponent(recipe.image)}">
          <span class="${liked ? 'text-red-500' : 'text-gray-300'}">${liked ? '♥' : '♡'}</span>
        </button>
      </div>
    </div>
  `;
}

function attachLikeHandlers() {
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const title = decodeURIComponent(btn.getAttribute('data-title'));
      const image = decodeURIComponent(btn.getAttribute('data-image'));
      const wasLiked = isRecipeLiked(id);
      toggleLikeRecipe({ id, name: title, image });
      btn.querySelector('span').className = (isRecipeLiked(id) ? 'text-red-500' : 'text-gray-300');
      btn.querySelector('span').textContent = isRecipeLiked(id) ? '♥' : '♡';
      if (!wasLiked) showToast('Added to favourites!');
    };
  });
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      showRecipeDetails(id);
    };
  });
}

function getLikedRecipes() {
  return JSON.parse(localStorage.getItem('likedRecipes') || '[]');
}

function isRecipeLiked(id) {
  return getLikedRecipes().some(r => r.id == id);
}

function toggleLikeRecipe(recipe) {
  let liked = getLikedRecipes();
  if (liked.some(r => r.id == recipe.id)) {
    liked = liked.filter(r => r.id != recipe.id);
  } else {
    liked.push(recipe);
  }
  localStorage.setItem('likedRecipes', JSON.stringify(liked));
}

profileBtn.onclick = () => {
  showLikedRecipes();
  profileModal.classList.remove('hidden');
};
closeProfile.onclick = () => profileModal.classList.add('hidden');
profileModal.onclick = (e) => { if (e.target === profileModal) profileModal.classList.add('hidden'); };

function showLikedRecipes() {
  const liked = getLikedRecipes();
  if (liked.length === 0) {
    likedRecipesDiv.innerHTML = `<div class='flex flex-col items-center justify-center py-8'>
      <img src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png' class='w-14 h-14 mb-3 opacity-60' alt='No liked'>
      <div class='text-gray-500'>No liked recipes yet.</div>
    </div>`;
    return;
  }
  likedRecipesDiv.innerHTML = liked.map(recipe => {
    const recipeName = recipe.name || recipe.title || 'No Name';
    return `
      <div class="bg-white glass rounded-xl shadow p-4 flex flex-col items-center relative">
        <img src="${recipe.image}" alt="${recipeName}" class="w-28 h-28 object-cover rounded mb-3 border-2 border-green-100">
        <h2 class="text-md font-semibold mb-2 text-center text-green-800">${recipeName}</h2>
        <div class="flex gap-2 mt-2">
          <button class="view-btn text-white bg-gradient-to-r from-green-400 to-blue-400 px-3 py-1 rounded font-semibold shadow hover:from-green-500 hover:to-blue-500 transition-all duration-200" data-id="${recipe.id}">View Recipe</button>
          <button class="delete-liked-btn text-red-500 hover:text-red-700 text-xl font-bold" data-id="${recipe.id}">✕</button>
        </div>
      </div>
    `;
  }).join('');
  attachLikeHandlers();
  document.querySelectorAll('.delete-liked-btn').forEach(btn => {
    btn.onclick = (e) => {
      const id = btn.getAttribute('data-id');
      let liked = getLikedRecipes();
      liked = liked.filter(r => r.id != id);
      localStorage.setItem('likedRecipes', JSON.stringify(liked));
      showToast('Removed from favourites!');
      showLikedRecipes();
    };
  });
  likedRecipesDiv.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      profileModal.classList.add('hidden');
      showRecipeDetails(id);
    };
  });
}

function showToast(message) {
  toastMsg.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 1800);
}

async function showRecipeDetails(recipeId) {
  detailsContent.innerHTML = '<div class="flex flex-col items-center py-8"><img src="https://cdn-icons-png.flaticon.com/512/1046/1046857.png" class="w-12 h-12 mb-3 opacity-60 animate-bounce" alt="Loading"><div class="text-gray-500">Loading details...</div></div>';
  detailsModal.classList.remove('hidden');
  try {
    const res = await fetch(`${BASE_URL}/${recipeId}`);
    const data = await res.json();
    const liked = isRecipeLiked(data.id);
    detailsContent.innerHTML = `
      <div class="flex flex-col items-center gap-6">
        <div class="relative w-full flex justify-center">
          <img src="${data.image}" alt="${data.name}" class="w-full max-w-xl h-80 object-cover rounded-2xl shadow border-4 border-white mb-4">
          <button class="like-btn-modal absolute top-4 right-8 text-5xl focus:outline-none z-10" data-id="${data.id}" data-title="${encodeURIComponent(data.name)}" data-image="${encodeURIComponent(data.image)}">
            <span class="${liked ? 'text-red-500' : 'text-gray-300'}">${liked ? '♥' : '♡'}</span>
          </button>
        </div>
        <h2 class="text-3xl font-extrabold text-green-700 mb-2 text-center">${data.name}</h2>
        <div class="mb-2 text-gray-600 text-sm text-center">${data.cuisine ? data.cuisine : ''} ${data.mealType ? '| ' + data.mealType : ''}</div>
        <div class="mb-4 text-gray-700 text-center">${data.instructions ? data.instructions : ''}</div>
        <h3 class="font-bold text-green-600 mb-1 self-start">Ingredients:</h3>
        <ul class="list-disc list-inside mb-4 text-gray-800 self-start">${data.ingredients.map(ing => `<li>${ing}</li>`).join('')}</ul>
      </div>
    `;
    // Like button in modal
    const likeBtnModal = detailsContent.querySelector('.like-btn-modal');
    likeBtnModal.onclick = (e) => {
      e.stopPropagation();
      const id = likeBtnModal.getAttribute('data-id');
      const title = decodeURIComponent(likeBtnModal.getAttribute('data-title'));
      const image = decodeURIComponent(likeBtnModal.getAttribute('data-image'));
      const wasLiked = isRecipeLiked(id);
      toggleLikeRecipe({ id, name: title, image });
      likeBtnModal.querySelector('span').className = (isRecipeLiked(id) ? 'text-red-500' : 'text-gray-300');
      likeBtnModal.querySelector('span').textContent = isRecipeLiked(id) ? '♥' : '♡';
      if (!wasLiked) showToast('Added to favourites!');
    };
  } catch (err) {
    detailsContent.innerHTML = '<div class="text-red-500">Error loading recipe details.</div>';
  }
}

closeDetails.onclick = () => detailsModal.classList.add('hidden');
detailsModal.onclick = (e) => { if (e.target === detailsModal) detailsModal.classList.add('hidden'); };

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;
  activeCategory = '';
  renderCategories();
  currentQuery = query;
  fetchAndDisplayRecipes({ query });
});

if (searchFormMobile) {
  searchFormMobile.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInputMobile.value.trim();
    if (!query) return;
    activeCategory = '';
    renderCategories();
    currentQuery = query;
    fetchAndDisplayRecipes({ query });
  });
}

if (vegOnlyBtn) {
  vegOnlyBtn.onclick = () => {
    vegOnly = !vegOnly;
    vegOnlyBtn.classList.toggle('bg-green-400', vegOnly);
    vegOnlyBtn.classList.toggle('text-white', vegOnly);
    vegOnlyBtn.textContent = vegOnly ? 'Vegetarian Only: ON' : 'Vegetarian Only';
    renderCategories();
    fetchAndDisplayRecipes({ type: activeCategory });
  };
}

window.addEventListener('DOMContentLoaded', async () => {
  filteredCategories = await filterValidCategories();
  renderCategories();
  fetchAndDisplayRecipes();
});

loadMoreBtn.onclick = () => {
  fetchAndDisplayRecipes({ type: activeCategory, append: true });
}; 