import { indicateProfit } from './itemFunctions.js';

const tableTBody = document.querySelector('.table').getElementsByTagName('tbody')[1];
const addItemButt = document.querySelector('.add-item-butt');
const searchInp = document.querySelector('.search-inp');
searchInp.focus();
const initialTableTbodyArrey = [];
const inpValResetterIcon = document.querySelector('.fa-times-circle');
const tableContainer = document.querySelector('.table-div'); // Find the scrollable container
const pageInp = document.querySelector('.page-inp');
const disablingIcon = document.querySelector('.disabling-icon');
const excelPrintIcon = document.querySelector('.print-container-div');
let isPendingDone = false;
let isPriceIconClicked = false;
const priceSelect = document.querySelector('#priceSelect');

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
  window.location.reload();
  }
});

function useLoadingIcon() {
 tableTBody.innerHTML = `
  <div class="spinner-container">
    <div class="spinner"></div>
  </div>
  `
}

const brandDiv = document.querySelector('.brand-div');
const categoryDiv = document.querySelector(`.category-div`);
function getItemQueries(notSpin) {
  !notSpin ? useLoadingIcon() : '';
  const limit = `limit=${pageInp.value}`;
  const search = `search=${searchInp.value.trim().toLowerCase()}`;
  const brand = `brandDivVal=${brandDiv.innerHTML.trim()}`;
  const category = `categoryDivVal=${categoryDiv.innerHTML.trim().replace(/\+/g, 'plus')}`;
  const isPending = `isPending=${isPendingDone}`;

  return `${limit}&${search}&${brand}&${category}&${isPending}`;
}

let profits;
let initialStockInvs;
async function fetchItemsOnce() {
  const response = await fetch(`${serverIP}/itemsFilter-andStock?${getItemQueries()}`);
  const itemResp = await response.json();
  const filtItems = itemResp.filtItems;
  const stockInvs = itemResp.stockInvs;
  profits = itemResp.profits;
  initialStockInvs = stockInvs;
  fetchItems(filtItems, '', '', stockInvs);
  isQntClicked = 'normal';
}

fetchItemsOnce();

pageInp.value = 50;
let latestFetchId = 0;
function fetchItems(items, scrollPostion, addedId, stockInvs) {
  const thisFetchId = ++latestFetchId; // Increment global fetch ID
  initialTableTbodyArrey.length = 0;
  tableTBody.innerHTML = '';
  if (thisFetchId !== latestFetchId) return;
  items.forEach((item, index) => {
    let totalPendQnt = 0;
    const id = item.id;
    if (!stockInvs) stockInvs = initialStockInvs;
    const mappedArrey = stockInvs.map(stockInv => {
      return stockInv.items.filter(item => item.itemId === id)[0]
    }).filter(item => item !== undefined)
    mappedArrey.forEach(item => {
      totalPendQnt += item.quantity
    })
    const newRow = document.createElement('tr');
    newRow.setAttribute("data-id", item.id); // Add this line
    newRow.setAttribute('draggable', 'true'); // Make row draggable
    newRow.addEventListener("dragstart", handleDragStart);
    newRow.addEventListener("dragover", handleDragOver);
    newRow.addEventListener("drop", handleDrop);
    newRow.classList.add('draggable-row'); // Add a class for styling;
    newRow.innerHTML = `
    <td class="order-num-td">${index + 1}</td>
    <td class="disable-td"><label class="custom-checkbox"><input class="disable-checkbox-inp" type="checkbox" ${item.disable === 'checked' ? 'checked': ''} onchange="checkBox(event, 'disable')"><span class="checkmark"></span></label></td>
    <td class="noExcel-td"><label class="custom-checkbox"><input class="no-excel-checkbox-inp" type="checkbox" ${item.noExcel === 'checked' ? 'checked': ''} onchange="checkBox(event, 'noExcel')"><span class="checkmark noExcel-checkmar"></span></label></td>
    <td class="id-td">${item.id}</td>
      <td class="dis-or-td">${item.display_order}</td>
      <td class="changing-id-td">${item.changingId === null ? '0':item.changingId}</td>
      <td class="sku-td" onclick="editSKU(event, 'SKU')">${item.SKU === null ? '': item.SKU}</td>
      <td class="box-id-td" onclick="editSKU(event, 'boxId')">${item.boxId === null ? '': item.boxId}</td>
      <td class="brand-td">${item.brand_name}</td>
      <td class="model-td">${item.model_name}</td>
      <td class="category-td">${item.category_name}</td>
      <td class="quality-td">${item.quality_name}</td>
      <td class="quantity-td">${item.quantity}${totalPendQnt !== 0 ? (' + ' + totalPendQnt) : ''}</td>
      <td class="buyPrice-td">${Number(item.buyPrice)}</td>
      <td class="priceOne-td">${Number(item.priceOne)}</td>
      <td class="priceOne0-td" ${Number(item.priceOne0) !== 0 ? 'default-val="1"' : ''}>${Number(item.priceOne0)}</td>
      <td class="priceTwo-td" ${Number(item.priceTwo) !== 0 ? 'default-val="1"' : ''}>${Number(item.priceTwo)}</td>
      <td class="priceThree-td" ${Number(item.priceThree) !== 0 ? 'default-val="1"' : ''}>${Number(item.priceThree)}</td>
      <td class="priceFive-td" ${Number(item.priceFive) !== 0 ? 'default-val="1"' : ''}>${Number(item.priceFive)}</td>
      <td class="priceSix-td" ${Number(item.priceSix) !== 0 ? 'default-val="1"' : ''}>${Number(item.priceSix)}</td>
      <td class="priceSevin-td" ${Number(item.priceSevin) !== 0 ? 'default-val="1"' : ''}>${Number(item.priceSevin)}</td>
      <td class="edit-td" onclick="addDiscription(event)"><i class="fas fa-edit edit-icon"></i></td>
      <td class="delete-td"><i class="fas fa-trash delete-icon"></i></td>
      <td class="discription-td" style="display: none;">${item.discription}</td>
    `;
    initialTableTbodyArrey.push(newRow);
  });
  applyCombinedFilters();
  tableContainer.scrollTop = scrollPostion;
  [...tableTBody.querySelectorAll('tr')].forEach(row => {
    if ((Number(row.getAttribute('data-id'))) === Number(addedId)) row.style.backgroundColor = 'rgb(22, 22, 22)';
  });
  [...document.querySelectorAll('.head-tr th')].forEach(th => th.style.background = ''); // This removes the background color of the ths.
  priceSelect.value = '';
}

async function applyCombinedFilters() {
  const hiddingIcon = document.querySelector('.hidding-icon');
  const disablingIcon = document.querySelector('.disabling-icon');
  const excelPrintIcon = document.querySelector('.print-container-div')

  const filteredRows = initialTableTbodyArrey.filter(tr => {
    const disablingMatch = disablingIcon.classList.contains('fa-toggle-on') || !tr.querySelector('.disable-checkbox-inp').checked;
    const excelMatch = excelPrintIcon.classList.contains('active') || !tr.querySelector('.no-excel-checkbox-inp').checked;
    return disablingMatch && excelMatch;
  })
  tableTBody.innerHTML = '';
  const thClasses = ['.disable-th', '.noExcel-th', '.changing-id-th', '.sku-th', '.box-id-th', '.edit-th', '.delete-th'];
  const tdClasses = ['.disable-td', '.noExcel-td', '.changing-id-td', '.sku-td', '.box-id-td', '.edit-td', '.delete-td'];
  const priceThClasses = ['.buyPrice-th', '.price-one-th', '.price-two-th', '.price-three-th', '.price-four-th', '.price-five-th', 
  '.price-six-th', '.price-sevin-th'];
  const pticeTdClasses = ['.buyPrice-td', '.priceOne0-td', '.priceTwo-td', '.priceThree-td', '.priceOne-td', '.priceFive-td', 
  '.priceSix-td', '.priceSevin-td'];
  const thelements = thClasses.map(clas => document.querySelector(clas));
  const eyeSlash = hiddingIcon.classList.contains('fa-eye-slash');
  thelements.forEach(thElement => thElement.style.display = eyeSlash ? 'none': '');
  const priceThelements = priceThClasses.map(clas => document.querySelector(clas));
  priceThelements.forEach(thElement => thElement.style.display = !isPriceIconClicked ? 'none' : '');

  filteredRows.forEach((tr, index) => {
    tableTBody.appendChild(tr); tr.querySelector('.order-num-td').innerHTML = index + 1;
  });
  const priceTdelements = pticeTdClasses.map(clas => document.querySelectorAll(clas));
  priceTdelements.forEach(tdElements => tdElements.forEach(tdElement => tdElement.style.display = !isPriceIconClicked ? 'none' : ''));
  const tdelements = tdClasses.map(clas => document.querySelectorAll(clas));
  tdelements.forEach(tdElements => tdElements.forEach(tdElement => tdElement.style.display = eyeSlash ? 'none': ''));
  updateTotal();
}

searchInp.addEventListener('input', async () => {
  fetchItemsOnce();
  inpValResetterIcon.style.display = 'block';
  if (searchInp.value === '') inpValResetterIcon.style.display = 'none';
});

pageInp.addEventListener('keydown', async function(e) {
  if (e.key === 'Enter') fetchItemsOnce();
})

addItemButt.setAttribute('draggable', 'true');
addItemButt.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('itemIdd', 'addItemButt')
})

// Add a new item by dragging
tableTBody.addEventListener('drop', async (e) => {
  e.preventDefault();
  if (!disablingIcon.classList.contains('fa-toggle-on') || !excelPrintIcon.classList.contains('active')) return
  const draggedItem = e.dataTransfer.getData('itemIdd');
  const targetId = Number(e.target.closest('tr').getAttribute('data-id'));
  if (draggedItem === 'addItemButt') {
    const scrollPostion = tableContainer.scrollTop;
    const response = await fetch(`${serverIP}/items-filterToo?tarId=${targetId}&${getItemQueries()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const addResp = await response.json();
    const updatedFiltItems = addResp.filtItems;
    fetchItems(updatedFiltItems, scrollPostion); // Refresh the table after adding
  }
});

// Add a new item by clicking
addItemButt.addEventListener('click', async (e) => {
  const isHighlighted = [...tableTBody.querySelectorAll('tr')].some(row => row.style.backgroundColor === 'rgb(22, 22, 22)');
  const scrollPostion = tableContainer.scrollTop;
  if (!isHighlighted) {
    const response = await fetch(`${serverIP}/items-filterToo?${getItemQueries()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify()
    });
    const filtItems = (await response.json()).filtItems;
    fetchItems(filtItems, scrollPostion); // Refresh the table after adding
  } else {
    const targetRow = [...tableTBody.querySelectorAll('tr')].find(row => row.style.backgroundColor === 'rgb(22, 22, 22)');
    const targetId = targetRow.querySelector('.id-td').innerHTML;
    addItemByHighlighting(targetId, scrollPostion)
  }
});

async function addItemByHighlighting(targetId, scrollPostion) {
  const response = await fetch(`${serverIP}/items-filterToo?tarId=${targetId}&isAddByHighl=${true}&${getItemQueries()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const awaResp = await response.json();
  const filtItems = awaResp.filtItems;
  const addedId = awaResp.addedId;
  fetchItems(filtItems, scrollPostion, addedId); // Refresh the table after adding
}

tableTBody.addEventListener('click', function(e) {
  if (!e.target.matches('.order-num-td')) return;
  if (!disablingIcon.classList.contains('fa-toggle-on') || !excelPrintIcon.classList.contains('active')) {
    return Toastify({
      text: `You must active disable and not printed items before you order them`,
      duration: 2500,
      gravity: 'top', // or 'top'
      position: 'center', // or 'right', 'center'
      style: {
        background: 'rgb(154, 59, 59)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
  }
  [...tableTBody.querySelectorAll('tr')].forEach(row => row.style.backgroundColor = '');
  const targRow = e.target.closest('tr');
  targRow.style.background = 'rgb(22, 22, 22)';
})

// checkbox
async function checkBox(event, updatedField) {
  const idTdHTML = event.target.closest('tr').querySelector('.id-td').innerHTML;
  await fetch(`${serverIP}/items-andChecktheBox/${idTdHTML}?updatedField=${updatedField}`);
}

let draggedRow = null;
let orderNum;

function handleDragStart(event) {
  draggedRow = event.target;
  orderNum = Number(event.target.closest('tr').querySelector('.order-num-td').innerHTML);
  event.dataTransfer.effectAllowed = "move";
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleDrop(event) {
  event.preventDefault();
  if (
    !disablingIcon.classList.contains('fa-toggle-on') ||
    !excelPrintIcon.classList.contains('active') || searchInp.value.trim() !== ''
  ) {
    return Toastify({
      text: `You must active disable and not printed items before you order them`,
      duration: 2500,
      gravity: 'top', // or 'top'
      position: 'center', // or 'right', 'center'
      style: {
        background: 'rgb(154, 59, 59)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
  }

  if (draggedRow && draggedRow !== event.target.closest("tr")) {
    const targetRow = event.target.closest("tr");
    const orderNum2 = Number(targetRow.querySelector('.order-num-td').innerHTML);
    // Dragging dwon
    if (orderNum < orderNum2) {
      tableTBody.insertBefore(draggedRow, targetRow.nextSibling);
    }
    // Dragging up
    else {
      tableTBody.insertBefore(draggedRow, targetRow);
    }
    const targRowId = targetRow.getAttribute('data-id');
    const transfereditemId = draggedRow.getAttribute('data-id');
    saveNewOrder((orderNum < orderNum2) ? toLower = true : false, targRowId, transfereditemId); // Save order after drop
  }
  draggedRow = null;
  Array.from(tableTBody.children).forEach((tr, index) => {
    tr.querySelector('.order-num-td').innerHTML = index + 1
  })
}

async function saveNewOrder(toLower, targRowId, transfereditemId) {
  await fetch(`${serverIP}/update-orderMine?targRowId=${targRowId}&transfereditemId=${transfereditemId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toLower })
  })
}

// Upadate an item sku and box Id
async function editSKU(event, updatedField) {
  if (event.target.querySelector('input')) return
  const newInp = document.createElement('input');
  newInp.className = 'sku-inp';
  const oldVal = event.target.innerHTML;
  event.target.innerHTML = '';
  event.target.appendChild(newInp);
  newInp.value = oldVal;
  newInp.focus();
  newInp.select();
  const td = event.target;

  newInp.addEventListener('blur', async () => {
    td.innerHTML = newInp.value.trim() === oldVal ? oldVal: newInp.value.trim();
    if (newInp.value.trim() === oldVal) return;

    const idTdHTML = event.target.closest('tr').querySelector('.id-td').innerHTML;
    await fetch(`${serverIP}/items/${idTdHTML}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        [updatedField]: newInp.value.trim() // Update only the specific field (brand, model, etc.)
      })
    });
  })

  newInp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      newInp.blur();
    }
  })
}

tableTBody.addEventListener('click', (e) => {
  if (e.target.closest('.brand-td')) {addEventListenerTo('brand', e);} 
  else if (e.target.closest('.model-td')) {addEventListenerTo('model', e);}
  else if (e.target.closest('.category-td')) {addEventListenerTo('category', e);}
  else if (e.target.closest('.quality-td')) {addEventListenerTo('quality', e);}
  //else if (e.target.closest('.buyPrice-td')) {addEventListenerTo('buyPrice', e, 'number', (event) => event.key !== '-');}
  //else if (e.target.closest('.priceOne-td')) {addEventListenerTo('priceOne', e, 'number', (event) => event.key !== '-');}
})

// Upadate an item
let latestmodelId = 0;
async function addEventListenerTo(brand, e, inputType, notInclude) {
   if (e.target.style.color === 'green') return;
  const Td = e.target.closest(`.${brand}-td`);
  const customDropdwonContainer = document.createElement('div');
  customDropdwonContainer.className = 'input-container-div';
  document.body.appendChild(customDropdwonContainer)
  const newInp = document.createElement('input');
  newInp.className = 'new-inp';
  newInp.spellcheck = false;
  newInp.placeholder = { brand: 'Brand', model: 'Model', category: 'Category', quality: 'Quality' }[brand] || '';
  const customDropdwon = document.createElement('div');
  customDropdwon.className = 'costum-dropdwon';

  customDropdwonContainer.appendChild(newInp)
  customDropdwonContainer.appendChild(customDropdwon)

  const idTdHTML = parseInt(e.target.closest('tr').querySelector('.id-td').innerHTML);
  if (e.target.closest(`.${brand}-td`)) {
    Td.style.color = 'green';
    customDropdwonContainer.style.display = 'flex';
    customDropdwonContainer.style.position = 'absolute';
    customDropdwonContainer.style.width = `${Td.offsetWidth + 0.2}px`
    newInp.style.width = `${Td.offsetWidth - 20}px`;

    // Function to update dropdown position dynamically
    function updateDropdownPosition() {
      if (!Td) return;
      const rect = Td.getBoundingClientRect(); // relative to viewport

      const dropdownHeight = customDropdwonContainer.offsetHeight || 100; // fallback height
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      const offsetX = rect.left + window.scrollX + 3;
      const offsetYDown = rect.top + window.scrollY + 40;
      const offsetYUp = rect.top + window.scrollY - dropdownHeight - 10;

      customDropdwonContainer.style.left = `${offsetX}px`;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        // Not enough space below but enough above → show upward
        customDropdwonContainer.style.top = `${offsetYUp}px`;
        newInp.style.top = `${offsetYUp + 8}px`;
      } else {
        // Enough space → show downward as usual
        customDropdwonContainer.style.top = `${offsetYDown}px`;
        newInp.style.top = `${offsetYDown + 8}px`;
      }
    }

    // Update dropdown position initially
    updateDropdownPosition();

    // Listen for scrolling and update position dynamically
    window.addEventListener("scroll", updateDropdownPosition);
    
      const response = await fetch(`${serverIP}/${brand}?limit=10`);
      const brands = await response.json();
      for(const brand2 of brands) {
        const span = document.createElement('span');
        span.className = `${brand}-span`
        if (brand2.name === 'Brand' || brand2.name === 'Model' || brand2.name === 'Category' || brand2.name === 'Quality') continue;
        span.innerHTML = brand2.name
        span.setAttribute('data-id', brand2.id);
        customDropdwon.appendChild(span);
    }
    const brandArray = Array.from(customDropdwon.children).map(span => {
      return { id: span.getAttribute('data-id'), spInn: span.innerHTML }
    });
    let index = -1;
    newInp.addEventListener('input', async () => {
      index = -1;
      customDropdwon.innerHTML = '';
      const updatedInpVal = newInp.value.toLocaleLowerCase();
      if (brand !== 'model') {
        const lastArray = brandArray.filter(brand => brand.spInn.toLocaleLowerCase().includes(updatedInpVal.toLocaleLowerCase()));
        lastArray.forEach(brand => {
          const span = document.createElement('span');
          span.className = `brand-span`
          span.innerHTML = brand.spInn;
          span.setAttribute('data-id', brand.id)
          customDropdwon.appendChild(span);
        });
      } else if (brand === 'model') {
        const thisFetchId = ++latestmodelId;
        const response = await fetch(`${serverIP}/model?search=${updatedInpVal.toLocaleLowerCase()}&limit=300`);
        console.log(`${serverIP}/model?search=${updatedInpVal.toLocaleLowerCase()}&limit=10`)
        const models = await response.json();
        const lastArray = models.filter(brand => brand.name.toLocaleLowerCase().includes(updatedInpVal));
        sortItem(updatedInpVal, lastArray, 'name');
        if (thisFetchId !== latestmodelId) return;
        lastArray.forEach(brand => {
          const span = document.createElement('span');
          span.className = `brand-span`
          span.innerHTML = brand.name;
          span.setAttribute('data-id', brand.id)
          customDropdwon.appendChild(span);
        });
      }
    })
    newInp.addEventListener('keydown', (e) => {
      const brandArray2 = Array.from(customDropdwon.children);
      if (!brandArray2.length) return; // Exit if no items
    
      // Remove previous highlight
      if (index >= 0) brandArray2[index].style.backgroundColor = '';
    
      if (e.key === 'ArrowDown') {
        index = Math.min(index + 1, brandArray2.length - 1); // Ensure it doesn't go beyond the last item
      } else if (e.key === 'ArrowUp') {
        index = Math.max(index - 1, -1); // Ensure it doesn't go below -1
      } else if (e.key === 'Enter') {
        newInp.value = Array.from(customDropdwon.children)[index].innerHTML;
        const targId = Array.from(customDropdwon.children)[index].getAttribute('data-id');
        editItem(targId, newInp, brand, Td, idTdHTML, customDropdwonContainer);
      }
      // Apply new highlight
      if (index >= 0) {
        brandArray2[index].style.backgroundColor = 'grey';

        // Check if the selected option is out of view and scroll to it
        const option = brandArray2[index];
        const dropdown = customDropdwon; // Dropdown container
        
        // Check if the selected option is out of the visible area
        if (option.offsetTop + option.offsetHeight > dropdown.scrollTop + dropdown.clientHeight) {
          dropdown.scrollTop = option.offsetTop + option.offsetHeight - dropdown.clientHeight; // Scroll down
        } else if (option.offsetTop < dropdown.scrollTop) {
          dropdown.scrollTop = option.offsetTop; // Scroll up
        }
      }
    });
    newInp.type = `${inputType}`;
    newInp.keydown = `${notInclude}` 
    newInp.focus();

    customDropdwon.addEventListener('click', async (e) => {
      newInp.value = e.target.innerHTML.trim();
      const targId = e.target.getAttribute('data-id');
      editItem(targId, newInp, brand, Td, idTdHTML, customDropdwonContainer);
    })

    let tdColor = 'green';
    document.addEventListener('click', (event) => {
      if ((!event.target.closest('costum-dropdwon') && !event.target.closest('.new-inp')))  {
        customDropdwonContainer.remove();
      }
      if (tdColor === 'green' && !event.target.closest('.new-inp')) {
        Td.style.color = '';
        tdColor = 'notGreen'
      }
    })

    newInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        newInp.blur();
      }
    });

    // Prevent entering invalid characters (optional)
    if (notInclude) {
      newInp.addEventListener('keydown', (event) => {
        if (!notInclude(event)) {
          event.preventDefault();
        }
      });
    }
  }
}

async function editItem(targetId, newInp, brand, Td, idTdHTML, customDropdwonContainer) {
  let NewInpId = newInp.value.trim();
  Td.style.color = '';
  const newId = targetId;
  NewInpId = newId;
  customDropdwonContainer.style.display = 'none';
  Td.innerHTML = newInp.value.trim();

  // Send the updated data to the backend
  await fetch(`${serverIP}/items/${idTdHTML}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      [brand]: NewInpId // Update only the specific field (brand, model, etc.)
    })
  });
  Td.style.color = '';
}

tableTBody.addEventListener('click', (e) => {
  editPrice(e, 'buyPrice', 'buyPrice');
  editPrice(e, 'priceOne0','priceOne0');
  editPrice(e, 'priceTwo','priceTwo');
  editPrice(e, 'priceThree','priceThree');
  editPrice(e, 'priceOne','priceOne');
  editPrice(e, 'priceFive','priceFive');
  editPrice(e, 'priceSix','priceSix');
  editPrice(e, 'priceSevin','priceSevin');
  editPrice(e, 'changing-id', 'changingId')
})

// Update an item price
async function editPrice(e, price, updatedField) {
  if (document.querySelector('.price-inp')) return;
  if (e.target.closest(`.${price}-td`)) {
    const td = e.target.closest(`.${price}-td`);
    const priceInp = document.createElement('input');
    priceInp.className = 'price-inp';
    priceInp.type = 'number';
    priceInp.value = td.innerHTML;
    priceInp.select();
    priceInp.addEventListener("keydown", (event) => {
      if (['-', 'ArrowUp', 'ArrowDown', 'e', 'E'].includes(event.key)) {
        event.preventDefault(); // Prevent the '-' character from being typed
      }
      if (event.key === 'Enter') {priceInp.blur()};
    });
    const oldValue = td.innerHTML;
    td.innerHTML = '';
    td.appendChild(priceInp)
    priceInp.focus();
    const idTdHTML = parseInt(e.target.closest('tr').querySelector('.id-td').innerHTML);
    priceInp.addEventListener('blur', async () => {
      td.innerHTML = priceInp.value.trim() === '' ? oldValue: updatedField === 'changingId' ? priceInp.value.trim() : updatedField === 'changingId' && priceInp.value.trim() === '0' ? oldValue: parseFloat(priceInp.value.trim());
      if (td.innerHTML !== '0') td.setAttribute('default-val', 1)
        else td.removeAttribute('default-val');
      priceInp.remove();
      const updatedChangingIdVal = priceInp.value.trim() === '' ? oldValue: updatedField === 'changingId' && priceInp.value.trim() === '0' ? null : priceInp.value.trim();
      const updatedPrice = priceInp.value.trim() === '' ? oldValue: priceInp.value.trim();
        const itemChanging = e.target.closest('tr').querySelector('.changing-id-td').innerHTML;
        if (oldValue === updatedPrice) return;
      const response = await fetch(`${serverIP}/items-changingId/${idTdHTML}?updatedField=${updatedField}&price=${price}&updatedChangingIdVal=${updatedChangingIdVal}&updatedprice=${updatedPrice}&itemChanging=${itemChanging}`);
      const updatResp = await response.json();
      if (updatedField === 'changingId') {
        if (updatResp.updatPrice) {
          e.target.closest('tr').querySelector(`.priceOne0-td`).innerHTML = Number(updatResp.updatPrice[0]);
          e.target.closest('tr').querySelector(`.priceTwo-td`).innerHTML = Number(updatResp.updatPrice[1]);
          e.target.closest('tr').querySelector(`.priceThree-td`).innerHTML = Number(updatResp.updatPrice[2]);
          e.target.closest('tr').querySelector(`.priceOne-td`).innerHTML = Number(updatResp.updatPrice[3]);
          e.target.closest('tr').querySelector(`.priceFive-td`).innerHTML = Number(updatResp.updatPrice[4]);
          e.target.closest('tr').querySelector(`.priceSix-td`).innerHTML = Number(updatResp.updatPrice[5]);
          e.target.closest('tr').querySelector(`.priceSevin-td`).innerHTML = Number(updatResp.updatPrice[6]);
        }
      } else if (updatedField !== 'buyPrice') {
        Array.from(tableTBody.children).forEach(tr => {
          if (itemChanging === tr.querySelector('.changing-id-td')?.innerHTML) {
            if (itemChanging === '0') return
            tr.querySelector(`.${price}-td`).innerHTML = priceInp.value.trim() === '' ? oldValue: priceInp.value.trim();
          }
        })
      }
      updateTotal();
    })
  }
}

// Delete an item
tableTBody.addEventListener('click', async (e) => {
  const scrollPostion = tableContainer.scrollTop;
  if (e.target.classList.contains('delete-icon')) {
    const itemId = e.target.closest('tr').querySelector('.id-td').innerHTML;
    const response = await fetch(`${serverIP}/items-delAndGet/${itemId}?${getItemQueries(true)}`, { method: 'DELETE' });
    const delResp = await response.json();
    if (delResp.item === 'exists') {
      return Toastify({
        text: `You can't delete this item, because it's used`,
        duration: 4000,
        gravity: 'top', // or 'top'
        position: 'center', // or 'right', 'center'
        style: {
          background: 'rgb(154, 59, 59)',
          borderRadius: '10px',
        },
        stopOnFocus: true,
      }).showToast();
    }
    Toastify({
      text: `Successfully deleted!`,
      duration: 1500,
      gravity: 'top', // or 'top'
      position: 'center', // or 'right', 'center'
      style: {
      background: 'rgb(59, 154, 109)',
      borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
    const filtItems = delResp.filtItems;
    fetchItems(filtItems, scrollPostion);
  }
});

// (select brand..) filter
const customDropdwonContainer = document.querySelector('.brand-input-container-div');
const categoryCustomDropdwonContainer = document.querySelector('.category-input-container-div');
const brandNewInp = document.querySelector('.brand-new-inp');
const categoryNewInp = document.querySelector('.category-new-inp');
let isBrandfetched;
let isCategoryfetched;
document.body.addEventListener('click', (e) => {
  const customDropdwon = customDropdwonContainer.querySelector('.brand-costum-dropdwon');
  if (e.target.classList.contains('brand-div') || e.target.classList.contains('brand-new-inp')) {
    if (!isBrandfetched) fetchBrands('brand', 'brand', '');
    isBrandfetched = true;
    customDropdwonContainer.style.display = '';
    brandNewInp.focus();
    customDropdwon?.scrollTo(0, 0); // ✅ This is OK because it's a method call
  } else {
    customDropdwonContainer.style.display = 'none';
    brandNewInp.value = '';
  }
  const categoryCustomDropdwon = categoryCustomDropdwonContainer.querySelector('.category-costum-dropdwon');
  if (e.target.classList.contains('category-div') || e.target.classList.contains('category-new-inp')) {
    if (!isCategoryfetched)  fetchBrands('category', 'category', '-category');
    isCategoryfetched = true;
    categoryCustomDropdwonContainer.style.display = '';
    categoryNewInp.focus();
    categoryCustomDropdwon?.scrollTo(0, 0);
  } else {
    categoryCustomDropdwonContainer.style.display = 'none';
    categoryNewInp.value = '';
  }
})

// fetching brands to filter
async function fetchBrands(brand, className, arrowIcon) {
  const customDropdwonContainer = document.querySelector(`.${brand}-input-container-div`);
  const brandDiv = document.querySelector(`.${brand}-div`);
  const input = document.querySelector(`.${brand}-new-inp`);

  const brandDivArrowIcon = document.querySelector(`.fa-caret-down${arrowIcon}`);
  const customDropdwon = document.createElement('div');
  customDropdwon.className = `${brand}-costum-dropdwon`;
  customDropdwonContainer.appendChild(customDropdwon)

  const response = await fetch(`${serverIP}/${brand}`);
  const brands = await response.json();
  brands.forEach(brand => {
    if (brand.name === 'Brand' || brand.name === 'Category') return
    const span = document.createElement('span');
    span.className = `${className}-list-span`;
    span.innerHTML = brand.name;
    span.setAttribute('data-id', brand.id);
    customDropdwon.appendChild(span);
    
    span.addEventListener('click', (e) => {
      clickSpan(brandDiv, e.target, brandDivArrowIcon, className === 'brand' ? '': className === 'category' ? 'fa-times-category':'');
    })
  })

  const initialArray = Array.from(customDropdwon.children);
  let index = -1;
  // search for the (select brand..) filter
  input.addEventListener('input', () => {
    const brandArray2 = Array.from(customDropdwon.children);
    brandArray2.forEach(span => {if (brandArray2[index]) {brandArray2[index].style.backgroundColor = '';}}
    )
    index = -1;
    customDropdwon.innerHTML = '';
    const updatedVal = input.value;
    const filteredArrey = initialArray.filter(span => span.innerHTML.toLocaleLowerCase().includes(updatedVal.toLocaleLowerCase()));
    filteredArrey.forEach(span => customDropdwon.appendChild(span))
  })

  // Heilight arrow
  input.addEventListener('keydown', (e) => {
    const brandArray2 = Array.from(customDropdwon.children);
    if (!brandArray2.length) return; // Exit if no items
  
    // Remove previous highlight
    if (index >= 0) brandArray2[index].style.backgroundColor = '';
  
    if (e.key === 'ArrowDown') {
      index = Math.min(index + 1, brandArray2.length - 1); // Ensure it doesn't go beyond the last item
    } else if (e.key === 'ArrowUp') {
      index = Math.max(index - 1, -1); // Ensure it doesn't go below -1
    } else if (e.key === 'Enter') {
      clickSpan(brandDiv, brandArray2[index], brandDivArrowIcon,  className === 'brand' ? '': className === 'category' ? 'fa-times-category':'');
      customDropdwonContainer.style.display = 'none';
      index = -1;
    }
    // Apply new highlight
    if (index >= 0) {
      brandArray2[index].style.backgroundColor = 'grey';

      // Check if the selected option is out of view and scroll to it
      const option = brandArray2[index];
      const dropdown = customDropdwon; // Dropdown container
      
      // Check if the selected option is out of the visible area
      if (option.offsetTop + option.offsetHeight > dropdown.scrollTop + dropdown.clientHeight) {
        dropdown.scrollTop = option.offsetTop + option.offsetHeight - dropdown.clientHeight; // Scroll down
      } else if (option.offsetTop < dropdown.scrollTop) {
        dropdown.scrollTop = option.offsetTop; // Scroll up
      }
    }
  });
}

function clickSpan(brandDiv, eTarget, brandDivArroWIcon, faTimes) {
  brandDiv.innerHTML = eTarget.innerHTML;
  brandDiv.style.color = 'white';
  brandDivArroWIcon.style.display = 'none';
  fetchItemsOnce();
  const removeIcon = document.createElement('i');
  if (faTimes === '') {if (document.querySelector('.select-brand-icon-div').querySelector('.fa-times')) return}
  if (faTimes === 'fa-times-category') {if (document.querySelector('.select-category-icon-div').querySelector('.fa-times-category')) return}
  
  removeIcon.innerHTML = `<i class="fas fa-times ${faTimes}"></i>`
  brandDiv.parentElement.appendChild(removeIcon);
  removeIcon.addEventListener('click', () => {
  brandDivArroWIcon.style.display = '';
  removeIcon.remove();
  if (faTimes === '') {brandDiv.innerHTML = 'Select brand..';}
  if (faTimes === 'fa-times-category') {brandDiv.innerHTML = 'Select category..';}
  brandDiv.style.color = 'rgb(185, 183, 183)';
  fetchItemsOnce();
  })
  customDropdwonContainer.style.display = 'none';
  //customDropdwon.remove();
}

// Eyelash icon
document.querySelector('.fa-eye-slash').addEventListener('click', function () {
  this.classList.toggle('fa-eye-slash'); // Hide icon
  this.classList.toggle('fa-eye'); // Show icon

  const disableTh = document.querySelector('.disable-th');
  const noExcelTh = document.querySelector('.noExcel-th');
  const changingIdTh = document.querySelector('.changing-id-th');
  const skuTh = document.querySelector('.sku-th');
  const boxIdTh = document.querySelector('.box-id-th');
  const editTh = document.querySelector('.edit-th');
  const deleteTh = document.querySelector('.delete-th');
  
  const disableTds = document.querySelectorAll('.disable-td');
  const noExcelTds = document.querySelectorAll('.noExcel-td');
  const changingIdTds = document.querySelectorAll('.changing-id-td');
  const skuTds = document.querySelectorAll('.sku-td');
  const boxIdTds = document.querySelectorAll('.box-id-td');
  const editTds = document.querySelectorAll('.edit-td');
  const deleteTds = document.querySelectorAll('.delete-td');
  disableTh.style.display = (disableTh.style.display === 'none') ? 'table-cell': 'none';
  noExcelTh.style.display = (noExcelTh.style.display === 'none') ? 'table-cell': 'none';
  changingIdTh.style.display = (changingIdTh.style.display === 'none') ? 'table-cell': 'none';
  skuTh.style.display = (skuTh.style.display === 'none') ? 'table-cell': 'none';
  boxIdTh.style.display = (boxIdTh.style.display === 'none') ? 'table-cell': 'none';
  editTh.style.display = (editTh.style.display === 'none') ? 'table-cell': 'none';
  deleteTh.style.display = (deleteTh.style.display === 'none') ? 'table-cell': 'none';
  disableTds.forEach(td => {td.style.display = (td.style.display === 'none') ? 'table-cell': 'none';});
  noExcelTds.forEach(td => {td.style.display = (td.style.display === 'none') ? 'table-cell': 'none';});
  changingIdTds.forEach(td => {td.style.display = (td.style.display === 'none') ? 'table-cell': 'none';});
  skuTds.forEach(td => {td.style.display = (td.style.display === 'none') ? 'table-cell': 'none';});
  boxIdTds.forEach(td => {td.style.display = (td.style.display === 'none') ? 'table-cell': 'none';});
  editTds.forEach(td => {td.style.display = (td.style.display === 'none') ? 'table-cell': 'none';});
  deleteTds.forEach(td => {td.style.display = (td.style.display === 'none') ? 'table-cell': 'none';});
})

//Price icon
document.querySelector('.fa-dollar-sign').addEventListener('click', function() {
  const [
  buyPriceTh,
  priceOne0Th, 
  priceTwoTh, 
  priceThreeTh, 
  priceOneTh, 
  priceFiveTh, 
  priceSixTh, 
  priceSevinTh,
  buyPriceTds,
  priceOne0Tds, 
  priceTwoTds, 
  priceThreeTds, 
  priceOneTds, 
  priceFiveTds, 
  priceSixTds, 
  priceSevinTds,
  ] = [
  document.querySelector('.buyPrice-th'),
  document.querySelector('.price-one-th'),
  document.querySelector('.price-two-th'),
  document.querySelector('.price-three-th'),
  document.querySelector('.price-four-th'),
  document.querySelector('.price-five-th'),
  document.querySelector('.price-six-th'),
  document.querySelector('.price-sevin-th'),
  document.querySelectorAll('.buyPrice-td'),
  document.querySelectorAll('.priceOne0-td'),
  document.querySelectorAll('.priceTwo-td'),
  document.querySelectorAll('.priceThree-td'),
  document.querySelectorAll('.priceOne-td'),
  document.querySelectorAll('.priceFive-td'),
  document.querySelectorAll('.priceSix-td'),
  document.querySelectorAll('.priceSevin-td'),
  ]
  const thVariables = [buyPriceTh, priceOne0Th, priceTwoTh, priceThreeTh, priceOneTh, priceFiveTh, priceSixTh, priceSevinTh];
  const tdVariables = [buyPriceTds, priceOne0Tds, priceTwoTds, priceThreeTds, priceOneTds, priceFiveTds, priceSixTds, priceSevinTds];
  if (!isPriceIconClicked) {
    const userInput = prompt('Enter password:');
    //const userInput = '0.0.0.';
    if (userInput !== '0.0.0.') return alert('Please use a correct password');
  }
  this.style.color = !isPriceIconClicked ? 'rgba(55, 186, 101, 1)' : '';
  thVariables.forEach(vari => vari.style.display = isPriceIconClicked ? 'none': '');
  tdVariables.forEach(tds => {
    tds.forEach(td => td.style.display = isPriceIconClicked ? 'none': '')
  });
  isPriceIconClicked = isPriceIconClicked ? false : true;
})

// Disable icon
document.querySelector('.fa-toggle-off').addEventListener('click', function () {
  this.classList.toggle('fa-toggle-off');
  this.classList.toggle('fa-toggle-on');
  applyCombinedFilters()
})

// Excel icon
function toggleSlash() {
  const printContainerDiv = document.querySelector('.print-container-div');
  printContainerDiv.classList.toggle('active');
  applyCombinedFilters();
}

// Export to excel
const excelSelect = document.querySelector('.excel-select');
async function exportToExcel() {
  const rows = [...tableTBody.querySelectorAll('tr')].filter(row => row.style.display !== 'none').map(row => {
    return {
      id: row.getAttribute('data-id'),
      sku: row.querySelector('.sku-td').innerHTML,
      boxId: row.querySelector('.box-id-td').innerHTML,
      brand: row.querySelector('.brand-td').innerHTML,
      model: row.querySelector('.model-td').innerHTML,
      category: row.querySelector('.category-td').innerHTML,
      quality: row.querySelector('.quality-td').innerHTML,
      quantity: row.querySelector('.quantity-td').innerHTML,
      buyPrice: row.querySelector('.buyPrice-td').innerHTML,
      priceOne: row.querySelector('.priceOne0-td').innerHTML,
      priceTwo: row.querySelector('.priceTwo-td').innerHTML,
      priceThree: row.querySelector('.priceThree-td').innerHTML,
      priceFour: row.querySelector('.priceOne-td').innerHTML,
      priceFive: row.querySelector('.priceFive-td').innerHTML,
      priceSix: row.querySelector('.priceSix-td').innerHTML,
      priceSevin: row.querySelector('.priceSevin-td').innerHTML,
      discription: row.querySelector('.discription-td').innerHTML,
    }
  })
  const selVal = excelSelect.value;
  // Now send the data to the server for export
  const response = await fetch(`${serverIP}/export-excel?hiddingBuyPrice=${isPriceIconClicked}&excSelectVal=${selVal}&priceVal=${priceSelect.value}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ rows }), // Send the table data
  });
  // Download the file
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "items.xlsx";
  link.click();
}

// Update an item discription
const discountTextarea = document.querySelector('.discount-textarea');
const modalContainerDiv = document.querySelector('.modal-container-div');
const applyDiscountButt = document.querySelector('.apply-discount-butt');
async function addDiscription(event) {
  const itemId = event.target.closest('tr').querySelector('.id-td').innerHTML;
  const response = await fetch(`${serverIP}/items/${itemId}`);
  const item = await response.json();
  discountTextarea.value = item.discription;
  modalContainerDiv.classList.remove('hidden');
  modalContainerDiv.classList.add('show');
  setTimeout(() => {
    discountTextarea.focus();
  }, 100);

  discountTextarea.addEventListener('keydown', handleKeydown);
  applyDiscountButt.addEventListener('click', applyDiscription);

  function handleKeydown(e) {
    if (e.key === 'Enter' && e.shiftKey) {
      return
    } else if (e.key === 'Enter') {
      if (modalContainerDiv.classList.contains('show')) {
        e.preventDefault();
        updateDiscription();
        //modalContainerDiv.style.display = 'none';
        modalContainerDiv.classList.remove('show');
        modalContainerDiv.classList.add('hidden');
      }
    }
  }
  
  function applyDiscription() {
    updateDiscription();
    modalContainerDiv.classList.remove('show');
    modalContainerDiv.classList.add('hidden');
  }

  async function updateDiscription() {
    discountTextarea.removeEventListener('keydown', handleKeydown);
    applyDiscountButt.removeEventListener('click', applyDiscription);
    await fetch(`${serverIP}/items/${itemId}`, {
      method: 'PUT', 
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        discription: discountTextarea.value.trim()
      })
    });
  }
  modalContainerDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-container-div') || (e.target.classList.contains('close-sign-span'))) {
      //modalContainerDiv.style.display = 'none';
      modalContainerDiv.classList.remove('show');
      modalContainerDiv.classList.add('hidden');
      discountTextarea.removeEventListener('keydown', handleKeydown);
      applyDiscountButt.removeEventListener('click', applyDiscription);
    }
  })
}

const totalBuySpan = document.querySelector('.total-buy-span');
function updateTotal() {
  let total = 0;
  const rowArray = Array.from(tableTBody.children);
  rowArray.forEach(tr => {
    const splittedQnt = tr.querySelector('.quantity-td').innerHTML.split('+');
    const realQnt = splittedQnt[0];
    const eachItemTotal = Number(realQnt) * Number(tr.querySelector('.buyPrice-td').innerHTML);
    total += eachItemTotal;
    totalBuySpan.innerHTML = Number(Number(total).toFixed(3)).toLocaleString();
  })
}

inpValResetterIcon.addEventListener('click', function() {
  searchInp.value = '';
  this.style.display = 'none';
  fetchItemsOnce();
  searchInp.focus();
})

// Createing the excel
document.querySelector('.excel-file-inp').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  
  reader.onload = async function(e) {
    // 1. Get the file data as array buffer
    const data = new Uint8Array(e.target.result);
    
    // 2. Parse the Excel file
    const workbook = XLSX.read(data, { type: 'array' });
    
    // 3. Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    
    // 4. Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
    for(const item of jsonData) {
      const id = Number(item.Id);
      const buyPrice = Number(item.buyPrice)
      await fetch(`${serverIP}/items/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          buyPrice: buyPrice
        })
      })
    }
    };
  reader.readAsArrayBuffer(file);
});

async function resetItemQuantities(update) {
  const resp = await fetch(`${serverIP}/check-item-qnt?update=${update}`);
  const getResp = await resp.json();
  const missiQntItmes = getResp.missiQntItmes;
  console.log(missiQntItmes)
}

searchInp.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'Enter') resetItemQuantities()
    else if (e.ctrlKey && e.key === 'Alt') resetItemQuantities(true);
})

const changingIdTh = document.querySelector('.changing-id-th');
changingIdTh.addEventListener('click', async function() {
  const response = await fetch(`${serverIP}/items`);
  const items = await response.json();
  const biggestChangingId = Math.max(...items.map(item => item.changingId)) + 1;
  alert(biggestChangingId)
})

async function orderByPrice(event) {
  const th = event.target;
  const color = th.style.backgroundColor;
  const blue = color === 'rgb(8, 29, 78)';
  const green = color === 'rgb(12, 100, 60)';
  const zero = blue ? 'blue' : green ? 'green' : false;
  const priceType = th.getAttribute('db-column')
  const response = await fetch(`${serverIP}/itemsFilter-andStock?${getItemQueries()}&priceType=${priceType}&zero=${zero}`);
  const itemResp = await response.json();
  const filtItems = itemResp.filtItems;
  fetchItems(filtItems);
  th.style.backgroundColor = zero === false ? 'rgba(8, 29, 78, 1)' : blue ? 'rgba(12, 100, 60, 1)' : '';
}

let isQntClicked = 'normal';
function orderByQnt(e) {
  const norm = isQntClicked === 'normal';
  const zero = isQntClicked === 'zero';
  const onWay = isQntClicked === 'onWay';
  const qntTds = [...document.querySelectorAll('.quantity-td')];
  const zeroQntRows = qntTds.filter(td => {
    const tdHtm = td.innerHTML;
    const thHtmSpl = tdHtm.split('+');
    const match = norm ? tdHtm === '0' : zero ? thHtmSpl[0].trim() === '0' : true;
    return match;
  });
  zeroQntRows.forEach(td => { let rowDisSty = td.closest('tr').style; const disp = rowDisSty.display; rowDisSty.display = onWay ? '' : 'none'});
  const style = e.target.style;
  style.backgroundColor = norm ? 'rgba(38, 87, 172, 1)' : zero ? 'rgba(38, 172, 101, 1)' : '';
  isQntClicked = norm ? isQntClicked = 'zero' : zero ? 'onWay' : 'normal';
}

priceSelect.addEventListener('change', function() {
  const priVals = ['priceOne0', 'priceTwo', 'priceThree', 'priceOne', 'priceFive', 'priceSix', 'priceSevin'];
  const priVal = this.value;
  const priVal2 = 
  priVal === 'Price One' ? priVals[0] :
  priVal === 'Price Two' ? priVals[1] :
  priVal === 'Price Three' ? priVals[2] :
  priVal === 'Price Four' ? priVals[3] :
  priVal === 'Price Five' ? priVals[4] :
  priVal === 'Price Six' ? priVals[5] :
  priVal === 'Price Sevin' ? priVals[6] :
  priVal === 'All' ? 'All' : '';
  if (priVal === 'Price Four') return;
  [...tableTBody.querySelectorAll('tr')].forEach(tr => {
    const buyPrice = Number(tr.querySelector('.buyPrice-td').innerHTML);
    const realPrice = Number(tr.querySelector('.priceOne-td').innerHTML);
    const targPricTd = tr.querySelector(`.${priVal2}-td`);
    if (targPricTd?.innerHTML === '0' && priVal2 !== 'All') targPricTd.innerHTML = indicateProfit(buyPrice, realPrice, priVal, profits);

    const prOnetd = tr.querySelector('.priceOne0-td');
    const prTwotd = tr.querySelector('.priceTwo-td');
    const prThreetd = tr.querySelector('.priceThree-td');
    const prFivetd = tr.querySelector('.priceFive-td');
    const prSixtd = tr.querySelector('.priceSix-td');
    const prSevtd = tr.querySelector('.priceSevin-td');
    
    if (priVal === 'All') {
      if (prOnetd.innerHTML === '0') prOnetd.innerHTML = indicateProfit(buyPrice, realPrice, 'Price One', profits)
      if (prTwotd.innerHTML === '0') prTwotd.innerHTML = indicateProfit(buyPrice, realPrice, 'Price Two', profits)
      if (prThreetd.innerHTML === '0') prThreetd.innerHTML = indicateProfit(buyPrice, realPrice, 'Price Three', profits)
      if (prFivetd.innerHTML === '0') prFivetd.innerHTML = indicateProfit(buyPrice, realPrice, 'Price Five', profits)
      if (prSixtd.innerHTML === '0') prSixtd.innerHTML = indicateProfit(buyPrice, realPrice, 'Price Six', profits)
      if (prSevtd.innerHTML === '0') prSevtd.innerHTML = indicateProfit(buyPrice, realPrice, 'Price Sevin', profits)
    }

    if (priVal === '') {
      if (!prOnetd.getAttribute('default-val')) prOnetd.innerHTML = 0;
      if (!prTwotd.getAttribute('default-val')) prTwotd.innerHTML = 0;
      if (!prThreetd.getAttribute('default-val')) prThreetd.innerHTML = 0;
      if (!prFivetd.getAttribute('default-val')) prFivetd.innerHTML = 0;
      if (!prSixtd.getAttribute('default-val')) prSixtd.innerHTML = 0;
      if (!prSevtd.getAttribute('default-val')) prSevtd.innerHTML = 0;
    }
  })
})

window.exportToExcel = exportToExcel;
window.orderByPrice = orderByPrice;
window.orderByQnt = orderByQnt;
window.toggleSlash = toggleSlash;
window.addDiscription = addDiscription;
window.checkBox = checkBox;
window.editSKU = editSKU;