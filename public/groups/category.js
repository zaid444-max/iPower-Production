const addBrandButt = document.querySelector('.add-item-div3');
const tableTbody = document.querySelector('.table-tbody');
const brandList = [];
const searchInp = document.querySelector('.search-inp3');
const tableDiv = document.querySelector('.table-div');
const cleanInpIcon = document.querySelector('.fa-times-circle');

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
window.location.reload();
  }
});

addBrandButt.addEventListener('click', async () => {
  const response = await fetch(`${serverIP}/category-get`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      category: 'Category'
    })
  })
  const addResp = await response.json();
  const categories = addResp.categories;
  fetchQualities(categories);
})

function useLoadingIcon() {
 tableTbody.innerHTML = `
  <div class="spinner-container">
    <div class="spinner category-spinner"></div>
  </div>
  `
}

async function fetchcategoriesOnce() {
  useLoadingIcon();
  const response = await fetch(`${serverIP}/category`);
  const categories = await response.json();
  fetchQualities(categories);
}

fetchcategoriesOnce();

async function fetchQualities(categories) {
  brandList.length = 0;
  const scrollPosition = tableDiv.scrollTop;
  tableTbody.innerHTML = '';
  categories.sort((a, b) => b.id - a.id)
  for(const [index, brand] of categories.entries()) {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
    <td class="index-td">${index + 1}</td>
    <td class="brand-id-td" style="display: none;">${brand.id}</td>
    <td class="brand-name-td" onclick="editBrand(event)">
    <span class="brand-name-span">${brand.name}</span>
    <div><i class="fas fa-circle" onclick="showColorPicker(event)"></i> <i class="fas fa-trash delete-icon" onclick="deleteBrand(event)"></i></div> 
    </td>
    `
    tableTbody.appendChild(newRow);
    brandList.push(newRow);
    newRow.querySelector('.brand-name-td').querySelector('.fa-circle').style.color = `${brand.circle_ball}`;
  }
  applyCombinedFilters();
  tableDiv.scrollTop = scrollPosition;
}

async function deleteBrand(event) {
  const id = parseInt(event.target.closest('tr').querySelector('.brand-id-td').innerHTML);
  const response = await fetch(`${serverIP}/category-get/${id}`, {method: 'DELETE'});
  const delResp = await response.json();
  if (delResp.category === 'exists')
    return Toastify({
      text: `You can't delete this category, because it's used.`,
      duration: 2000,
      gravity: 'top', // or 'top'
      position: 'center', // or 'right', 'center'
      style: {
        background: 'rgb(154, 59, 59)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();

  else if (id === 0)
    return Toastify({
      text: `You can't delete this category, because it's a default category.`,
      duration: 2000,
      gravity: 'top', // or 'top'
      position: 'center', // or 'right', 'center'
      style: {
      background: 'rgb(154, 59, 59)',
      borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();

  Toastify({
    text: `Successfully deleted!`,
    duration: 2000,
    gravity: 'top', // or 'top'
    position: 'center', // or 'right', 'center'
    style: {
      background: 'rgb(59, 154, 130)',
      borderRadius: '10px',
    },
    stopOnFocus: true,
  }).showToast();
  const categories = delResp.categories;
  fetchQualities(categories);
}

function editBrand(event) {
  if (event.target.classList.contains('delete-icon')) {return}
  if (event.target.closest('tr').querySelector('span').querySelector('input')) {return};
  if (event.target.matches('.fa-circle')) return
  const newInp = document.createElement('input');
  newInp.className = 'newInp';
  const brandSpan = event.target.closest('tr').querySelector('span');
  const oldValue = brandSpan.innerHTML;
  brandSpan.innerHTML ='';
  newInp.value = oldValue;
  brandSpan.appendChild(newInp);
  newInp.focus();
  newInp.select();

  newInp.addEventListener('blur', async () => {
    if (oldValue === newInp.value.trim()) {return brandSpan.innerHTML = newInp.value.trim() || oldValue;};
    const newName = newInp.value.trim().toLocaleLowerCase();
    const id = event.target.closest('tr').querySelector('.brand-id-td').innerHTML;
    const response = await fetch(`${serverIP}/category-check/${id}?newName=${newName}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name: newInp.value.trim()
      })
    })
    const updatResp = await response.json();
    if (updatResp.category === 'exists') {
      brandSpan.innerHTML = oldValue;
      Toastify({
        text: `Not updated because it already exists!`,
        duration: 4000,
        gravity: 'top', // or 'top'
        position: 'center', // or 'right', 'center'
        style: {
          background: 'rgb(154, 62, 59)',
          borderRadius: '10px',
        },
        stopOnFocus: true,
      }).showToast();
      return;
    }
    brandSpan.innerHTML = newInp.value.trim() || oldValue;
    Toastify({
      text: `Successfully updated!`,
      duration: 1500,
      gravity: 'top', // or 'top'
      position: 'center', // or 'right', 'center'
      style: {
        background: 'rgb(59, 154, 119)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
  })

  newInp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {newInp.blur();}
  })
}

document.querySelector('h2').addEventListener('click', (e) => {
  if (e.target.classList.contains('brand-span3')) {
    document.body.classList.add('animate-out');
    setTimeout(() => {
      window.location.href = 'brand.html';
    }, 200)
  }
  else if (e.target.classList.contains('model-span3')) {
    document.body.classList.add('animate-out');
    setTimeout(() => {
      window.location.href = 'model.html';
    }, 200)
  }
  else if (e.target.classList.contains('category-span3')) {
    document.body.classList.add('animate-out');
    setTimeout(() => {
      window.location.href = 'category.html';
    }, 200)
  }
  else if (e.target.classList.contains('quality-span3')) {
    document.body.classList.add('animate-out');
    setTimeout(() => {
      window.location.href = 'quality.html';
    }, 200)
  }
})

function applyCombinedFilters() {
  const searchVal = searchInp.value.trim().toLowerCase();
  const filteredArray = brandList.filter(row => {
    const brandNameSpan = row.querySelector('.brand-name-td').querySelector('.brand-name-span').innerHTML.toLowerCase();
    return brandNameSpan.includes(searchVal)
  })
  tableTbody.innerHTML = '';
  filteredArray.forEach((row, index) => {
    tableTbody.appendChild(row);
    row.querySelector('.index-td').innerHTML = index + 1;
  });
}

searchInp.focus();

searchInp.addEventListener('input', function() {
  applyCombinedFilters();
  cleanInpIcon.style.display = searchInp.value !== '' ? 'block' : 'none';
})

cleanInpIcon.addEventListener('click', function() {
  this.style.display = 'none';
  searchInp.value = '';
  applyCombinedFilters();
})

const canvas = document.getElementById('colorCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const selector = document.getElementById('selector');
const colorArea = document.getElementById('colorArea');
const pickedColor = document.getElementById('pickedColor');
const rgbCode = document.getElementById('rgbCode');

// Draw the gradient on canvas
function drawGradient() {
  const gradientH = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradientH.addColorStop(0, 'red');
  gradientH.addColorStop(0.17, 'orange');
  gradientH.addColorStop(0.34, 'yellow');
  gradientH.addColorStop(0.51, 'green');
  gradientH.addColorStop(0.68, 'cyan');
  gradientH.addColorStop(0.85, 'blue');
  gradientH.addColorStop(1, 'magenta');
  ctx.fillStyle = gradientH;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradientV = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradientV.addColorStop(0, 'rgba(255,255,255,1)');
  gradientV.addColorStop(0.5, 'rgba(255,255,255,0)');
  gradientV.addColorStop(0.5, 'rgba(0,0,0,0)');
  gradientV.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = gradientV;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

drawGradient();

let isDragging = false;

function pickColor(x, y) {
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  const rgb = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  selector.style.left = `${x}px`;
  selector.style.top = `${y}px`;

  pickedColor.style.backgroundColor = rgb;
  rgbCode.textContent = rgb;
}

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  handleMove(e);
});

canvas.addEventListener('mousemove', (e) => {
  if (isDragging) handleMove(e);
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

function handleMove(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(e.clientX - rect.left, canvas.width - 1));
  const y = Math.max(0, Math.min(e.clientY - rect.top, canvas.height - 1));
  pickColor(x, y);
}

const colorPickerContainer = document.querySelector('.color-picker-container');
const saveColorButt = colorPickerContainer.querySelector('.save-color-butt');
let categoryId = null;
let oldRGBColor;
function showColorPicker(event) {
  colorPickerContainer.style.display = 'block';
  categoryId = Number(event.target.closest('tr').querySelector('.brand-id-td').innerHTML);
  const currentColor = window.getComputedStyle(event.target).color;
  // Try to match that color on canvas
  setPickerFromColor(currentColor);
  oldRGBColor = rgbCode.innerHTML;
}

saveColorButt.addEventListener('click', async function(e) {
  colorPickerContainer.style.display = 'none';
  const rgbInp = rgbCode.querySelector('.rgb-inp');
  const response = await fetch(`${serverIP}/category-check-color/${categoryId}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      circle_ball: !rgbInp ? rgbCode.innerHTML : rgbInp.value === '' ? oldRGBColor : !rgbInp.value.includes('rgb') ? oldRGBColor : rgbInp.value
    })
  })
  const updColResp = await response.json();
  const categories = updColResp.categories;
  fetchQualities(categories);
})

let mouseDownInside = false;
// Detect where the mouse was pressed
document.addEventListener('mousedown', function(e) {
  mouseDownInside = !!e.target.closest('.color-picker-container2');
})

// Handle release — hide only if both down & up were outside
document.addEventListener('mouseup', function(e) {
  const mouseUpInside = !!e.target.closest('.color-picker-container2');
  if (!mouseDownInside && !mouseUpInside) {
    colorPickerContainer.style.display = 'none';
  }
});

function setPickerFromColor(targetRgb) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const rgb = `rgb(${r}, ${g}, ${b})`;

      if (rgb === targetRgb) {
        pickColor(x, y);
        return;
      }
    }
  }
}

rgbCode.addEventListener('click', function() {
  const rgbInp = document.createElement('input');
  this.innerHTML = '';
  this.appendChild(rgbInp);
  rgbInp.focus();
  rgbInp.className = 'rgb-inp';
})
