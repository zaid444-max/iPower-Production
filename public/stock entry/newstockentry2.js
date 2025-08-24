import { focusNextInput } from './stockFunctions.js';

const addItemButt = document.querySelector('.add-item-butt');
const stockentryForm = document.querySelector('.stock-entry-form');
const skuInp = document.querySelector('.sku-inp');
const remarkInp = document.querySelector('.remark-inp');
const excelIcon = document.querySelector('.fa-file-excel');

const newDiv = document.querySelector('.new-div');
const buyPriceInp = document.querySelector('.buy-price-inp');
const QntInp = document.querySelector('.quantity-inp');
focusNextInput(buyPriceInp, 'buy-price');
focusNextInput(QntInp, 'quantity');

const kiloInp = document.querySelector('.kilo-inp');
const kiloPriceInp = document.querySelector('.kilo-price-inp');
const dollerDinarInp = document.querySelector('.doller-dinar-inp');
const RMBInp = document.querySelector('.RMB-inp');

const customDropdwonSpans = [];
let latestFetchId = 0;
async function fetchItems(newInp) {
  const thisFetchId = ++latestFetchId; // Increment global fetch ID
  const updatedInpVal = newInp ? newInp.value.trim().toLocaleLowerCase() : '';
  customDropdwonSpans.length = 0;
  const response = await fetch(`${serverIP}/itemsFilter2?search=${updatedInpVal}`);
  const itemResp = await response.json();
  const filtItems = itemResp.filtItems;
  if (thisFetchId !== latestFetchId) return;
  filtItems.forEach(item => {
    if (item.disable === 'checked') return;
    const span = document.createElement('span');
    span.className = 'item-span';
    span.innerHTML = item.brand_name + ' ' + item.model_name + ' ' + item.category_name + ' ' + item.quality_name + `<span class="sku-box-span" style="display: none;">${item.SKU || ''}${item.boxId || ''}</span>`;
    span.setAttribute('data-id', item.id);
    customDropdwonSpans.push(span);
  });
}

fetchItems();

document.querySelector('.delete-icon').addEventListener('click', function(e) {deleteDiv(e); updateTotal()})
stockentryForm.querySelector('.container-div').querySelector('.buy-price-inp').addEventListener('input', function() {updateTotal()})
stockentryForm.querySelector('.container-div').querySelector('.quantity-inp').addEventListener('input', function() {updateTotal()})

newDiv.addEventListener('click', async function (e) {
  await fetchItems();
  const customDropdwonContainer = document.createElement('div');
  customDropdwonContainer.className = 'input-container-div';
  customDropdwonContainer.spellcheck = false;
  const newInp = document.createElement('input');
  newInp.className = 'new-inp';
  const customDropdwon = document.createElement('div');
  customDropdwon.className = 'costum-dropdwon';
  customDropdwonContainer.appendChild(newInp)
  customDropdwonContainer.appendChild(customDropdwon);

  customDropdwonSpans.forEach(span => {customDropdwon.appendChild(span)})
  document.body.appendChild(customDropdwonContainer);
  const indexSpan = e.target.previousElementSibling;
  const rect = indexSpan.getBoundingClientRect();
  customDropdwonContainer.style.display = 'flex';
  customDropdwonContainer.style.position = 'absolute';
  customDropdwonContainer.style.top = `${rect.top + 40}px`;
  newInp.focus();

  const taregtBuyPriceInp = this.closest('.container-div').querySelector('.buy-price-inp');
  searchItem(customDropdwon, newInp, newDiv, customDropdwonContainer, customDropdwonSpans);
  function handleSpanClick(e) {
    newDiv.innerHTML = e.target.innerHTML;
    const itemId = Number(e.target.getAttribute('data-id'));
    newDiv.setAttribute('data-id', e.target.getAttribute('data-id'))
    fetch(`${serverIP}/items/${itemId}`)
    .then(response => response.json())
    .then(targetItem => {
      taregtBuyPriceInp.value = Number(targetItem.buyPrice);
      updateTotal();
    });
    for(const span of Array.from(customDropdwon.children)) {
      span.removeEventListener('click', handleSpanClick)
    }
    customDropdwon.remove();
    newInp.remove();
    customDropdwonContainer.remove();
  }
  for(const span of Array.from(customDropdwon.children)) {
    span.addEventListener('click', handleSpanClick, {once: true})
  }
});

let orderNum = 1;
addItemButt.addEventListener('click', () => {
  const eyeIcon = document.querySelector('.eye-icon');
  orderNum += 1;
  const newItemDiv = document.createElement('div');
  newItemDiv.className = 'container-div';
  newItemDiv.innerHTML = `
  <span class="index">${orderNum}</span>
  <div class="new-div">Select...</div>
  <input type="${eyeIcon.classList.contains("fa-eye-slash") ? 'password': 'number'}" value="0" class="buy-price-inp" step="any" onkeydown="if (
    !/^[0-9.]$/.test(event.key) &&
    !(event.ctrlKey && ['v', 'z', 'a', 'x', 'c'].includes(event.key.toLowerCase())) &&
    !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowRight', 'ArrowLeft'].includes(event.key)) event.preventDefault();if (event.key === '.' && this.value.includes('.')) event.preventDefault();">
  <div class="two-quantity-div">
    <input type="number" value="0" class="quantity-inp" onkeydown="if (!/^[0-9]$/.test(event.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowRight', 'ArrowLeft'].includes(event.key)) event.preventDefault();">
    <div class="last-quantity-div">0</div>
  </div>
  <i class="fas fa-trash delete-icon"></i>
  `
  newItemDiv.querySelector('.delete-icon').addEventListener('click', function(e) {deleteDiv(e); updateTotal()})
  newItemDiv.querySelector('.buy-price-inp').addEventListener('input', function() {updateTotal()})
  newItemDiv.querySelector('.quantity-inp').addEventListener('input', function() {updateTotal()})

  const newDiv = newItemDiv.querySelector('.new-div');
  newDiv.addEventListener('click', async function (e) {
    customDropdwonSpans.length = 0;
    await fetchItems();
    const customDropdwonContainer = document.createElement('div');
    customDropdwonContainer.className = 'input-container-div';
    customDropdwonContainer.spellcheck = false;
    const newInp = document.createElement('input');
    newInp.className = 'new-inp';
    const customDropdwon = document.createElement('div');
    customDropdwon.className = 'costum-dropdwon';

    customDropdwonSpans.forEach(span => {customDropdwon.appendChild(span)});
    document.body.appendChild(customDropdwonContainer);
    customDropdwonContainer.appendChild(newInp)
    customDropdwonContainer.appendChild(customDropdwon);
    const indexSpan = e.target.previousElementSibling;
    const rect = indexSpan.getBoundingClientRect();
    customDropdwonContainer.style.display = 'flex';
    customDropdwonContainer.style.position = 'absolute';
    customDropdwonContainer.style.top = `${rect.top + 40}px`;
    handleDropposit(customDropdwonContainer, rect);
    newInp.focus();
    const taregtBuyPriceInp = newItemDiv.querySelector('.buy-price-inp');
    searchItem(customDropdwon, newInp, newDiv, customDropdwonContainer, customDropdwonSpans)
    function handleSpanClick(e) {
      newDiv.innerHTML = e.target.innerHTML;
      const itemId = Number(e.target.getAttribute('data-id'));
      newDiv.setAttribute('data-id', e.target.getAttribute('data-id'))
      fetch(`${serverIP}/items/${itemId}`)
      .then(response => response.json())
      .then(targetItem => {
        taregtBuyPriceInp.value = Number(targetItem.buyPrice);
        updateTotal();
      });
      for(const span of Array.from(customDropdwon.children)) {
        span.removeEventListener('click', handleSpanClick)
      }
      customDropdwon.remove();
      newInp.remove();
      customDropdwonContainer.remove();
    }
    for(const span of Array.from(customDropdwon.children)) {
      span.addEventListener('click', handleSpanClick)
    }
  })
  focusNextInput(newItemDiv.querySelector('.buy-price-inp'), 'buy-price');
  focusNextInput(newItemDiv.querySelector('.quantity-inp'), 'quantity');
  stockentryForm.appendChild(newItemDiv);
});

function handleDropposit(customDropdwonContainer, rect) {
  const dropdownHeight = customDropdwonContainer.offsetHeight || 100;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const offsetYDown = rect.top + window.scrollY + 40;
  const offsetYUp = rect.top + window.scrollY - dropdownHeight - 10;
  if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
    // Not enough space below but enough above → show upward
    customDropdwonContainer.style.top = `${offsetYUp}px`;
  } else {
    // Enough space → show downward as usual
    customDropdwonContainer.style.top = `${offsetYDown}px`;
  }
}

function deleteDiv(e) {
  e.target.closest('.container-div').remove();
  const spans = document.querySelectorAll('.index');
  if (spans.length === 0) {orderNum = 0; return}
  spans.forEach((span, index) => {
    span.innerHTML = index + 1;
    orderNum = index + 1;
  });
};

function enableSaveButt() {
  saveButt.disabled = false;
  saveButt.innerHTML = 'Save';
}

const saveButt = document.querySelector('.save-butt');
const invoiceData = [];
saveButt.addEventListener('click', async () => {
  saveButt.disabled = true;
  saveButt.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  const newDivs = document.querySelectorAll('.new-div');
  const buyPriceInps = document.querySelectorAll('.buy-price-inp');
  const quantityInps = document.querySelectorAll('.quantity-inp');
  const checkboxInp = document.querySelector('.checkbox-inp');
  if(!newDivs[0]) {
    Toastify({
      text: `Please select an item`,
      duration: 3000,
      gravity: 'top', // or 'top'
      position: 'center', // or 'right', 'center'
      style: {
        background: 'rgb(154, 59, 59)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
    return enableSaveButt();
  };
  for(const div of newDivs) {
    if (div.innerHTML.trim() === 'Select...') {
      div.style.background = 'rgb(167, 66, 66)';
      const index = div.closest('.container-div').querySelector('.index').innerHTML;
      Toastify({
        text: `Item is empty at index: ${index}`,
        duration: 3000,
        gravity: 'top', // or 'top'
        position: 'center', // or 'right', 'center'
        style: {
          background: 'rgb(154, 59, 59)',
          borderRadius: '10px',
        },
        stopOnFocus: true,
      }).showToast();
      return enableSaveButt();
    };
    div.style.background = '';
  }
  for(const [index, div] of newDivs.entries()) {
    div.style.background = '';
  }
  for(const input of quantityInps) {
    input.style.background = '';
  }
  
  const mySet = new Set();
  const mySet2 = new Set();
  for(const [index, div] of newDivs.entries()) {
    if (quantityInps[index].value === '0' || quantityInps[index].value === '') {
      quantityInps[index].style.background = 'rgb(154, 59, 59)';
      saveButt.disabled = false;
      saveButt.innerHTML = 'Save';
      const TargetIndex = div.closest('.container-div').querySelector('.index').innerHTML;
      Toastify({
        text: `Item quantity is invalid at index: ${TargetIndex}`,
        duration: 3000,
        gravity: 'top', // or 'top'
        position: 'center', // or 'right', 'center'
        style: {
          background: 'rgb(154, 59, 59)',
          borderRadius: '10px',
        },
        stopOnFocus: true,
      }).showToast();
      return enableSaveButt();
    };
    if (mySet.has(div.innerHTML) || mySet2.has(div.getAttribute('data-id') === null ? false : div.getAttribute('data-id'))) {
      const selectHTML = div.innerHTML;
      const divAttr = div.getAttribute('data-id');
      const invalidIndixes = [];
      newDivs.forEach(div2 => {
        if (selectHTML === div2.innerHTML) {
          div2.style.background = 'blue';
          const index = div2.closest('.container-div').querySelector('.index').innerHTML;
          invalidIndixes.push(index);
        }
        if (divAttr === null ? false :  divAttr === div2.getAttribute('data-id')) {
          div2.style.background = 'blue';
        }
      })
      saveButt.disabled = false;
      saveButt.innerHTML = 'Save';
      div.style.background = 'blue';
      if (invalidIndixes.length > 0) {
        Toastify({
          text: `Item is repeated at index(es): ${invalidIndixes.join(', ')}`,
          duration: 3000,
          gravity: 'top', // or 'top'
          position: 'center', // or 'right', 'center'
          style: {
            background: 'rgb(154, 59, 59)',
            borderRadius: '10px',
          },
          stopOnFocus: true,
        }).showToast();
      }
      return enableSaveButt();
    }
    mySet.add(div.innerHTML)
    mySet2.add(div.getAttribute('data-id'));
  }

  for(const [index, div] of newDivs.entries()) {
    for(const div of newDivs) {
      if (div.getAttribute('data-id')) {
        if (div.getAttribute('data-id') === 'NaN') {div.style.background = 'rgb(154, 59, 59)';saveButt.disabled = false; saveButt.innerHTML = 'Save';
          const targetIndex = div.closest('.container-div').querySelector('.index').innerHTML;
          Toastify({
            text: `Item id is invalid at index: ${targetIndex}`,
            duration: 3000,
            gravity: 'top', // or 'top'
            position: 'center', // or 'right', 'center'
            style: {
              background: 'rgb(154, 59, 59)',
              borderRadius: '10px',
            },
            stopOnFocus: true,
          }).showToast();
          return enableSaveButt();
        };
      }
    }
    const itemId = parseInt(div.getAttribute('data-id'));
    invoiceData.push({
      id: itemId,
      buyPrice: parseFloat(buyPriceInps[index].value) || 0,
      quantity: parseInt(quantityInps[index].value) || 0,
      lastQuantity: parseInt(quantityInps[index].value) || 0,
    });
  };
  const newStockEntryInv = {
    items: JSON.stringify(invoiceData),
    invStatus: 'Pending',
    sku: skuInp.value.trim(),
    remark: remarkInp.value.trim(),
    kilos: parseFloat(kiloInp.value) || 0,
    kiloPrice: parseFloat(kiloPriceInp.value) || 0,
    todayDoller: parseFloat(dollerDinarInp.value) || 0,
    todayRMB: parseFloat(RMBInp.value) || 0
  }
  const items = [...stockentryForm.querySelectorAll('.container-div')].map(container => {
    const id = Number(container.querySelector('.new-div').getAttribute('data-id'));
    const buyPrice = Number(container.querySelector('.buy-price-inp').value);
    return {
      id: id,
      buyPrice: buyPrice
    }
  });
  const response = await fetch(`${serverIP}/stockentinvs-checkBox`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ newStockEntryInv, priceBox: checkboxInp.checked ? true : false, items })
  });
  const result = await response.json();

  if (result.result === 'notFoundId') {
    const invalidId = result.invalidId;
    const containers = [...document.querySelectorAll('.container-div')];
    const invaIdCont = containers.find(cont => Number(cont.querySelector('.new-div').getAttribute('data-id')) === invalidId);
    invaIdCont.querySelector('.new-div').style.background = 'rgb(154, 59, 59)'; saveButt.disabled = false; saveButt.innerHTML = 'Save';
    const targetIndex = invaIdCont.closest('.container-div').querySelector('.index').innerHTML;
    Toastify({
    text: `Item id is invalid at index: ${targetIndex}`,
    duration: 3000,
    gravity: 'top', // or 'top'
    position: 'center', // or 'right', 'center'
    style: {
        background: 'rgb(154, 59, 59)',
        borderRadius: '10px',
    },
    stopOnFocus: true,
    }).showToast();
    return enableSaveButt();
  };
  localStorage.setItem('currentInvoiceId', result.insertId)
  localStorage.setItem('isInvoiceSaved', 'true');
  window.location.href = 'stockentryedit.html';
});

function searchItem(customDropdwon, newInp, newDiv, customDropdwonContainer, customDropdwonSpans) {
  let index = -1;
  newInp.addEventListener('input', async (e) => {
    customDropdwonSpans.length = 0;
    index = -1;
    customDropdwon.innerHTML = '';
    const updatedInpVal = newInp.value.trim().toLocaleLowerCase();
    const splittedValue = updatedInpVal.split(' ');
    await fetchItems(newInp);
    const lastArray = customDropdwonSpans.filter(brand => {
      return splittedValue.every(term => (brand.innerHTML + brand.querySelector('.sku-box-span').innerHTML).toLocaleLowerCase().includes(term)) 
    });
    const taregtBuyPriceInp = newDiv.closest('.container-div').querySelector('.buy-price-inp');
    function handleSpanClick(e) {
      newDiv.innerHTML = e.target.innerHTML;
      const itemId = Number(e.target.getAttribute('data-id'));
      newDiv.setAttribute('data-id', e.target.getAttribute('data-id'))
      fetch(`${serverIP}/items/${itemId}`)
        .then(response => response.json())
        .then(targetItem => {
          taregtBuyPriceInp.value = Number(targetItem.buyPrice);
          updateTotal();
        });
      for(const span of Array.from(customDropdwon.children)) {
        span.removeEventListener('click', handleSpanClick)
      }
      customDropdwon.remove();
      newInp.remove();
      customDropdwonContainer.remove();
      }
    lastArray.forEach(brand => {
      const span = document.createElement('span');
      span.className = `item-span`;
      const mainText = brand.innerHTML.split('<span>')[0].trim();
      span.innerHTML = mainText;
      span.setAttribute('data-id', brand.getAttribute('data-id'));
      span.addEventListener('click', handleSpanClick);
      customDropdwon.appendChild(span);
    });
  })
  newInp.addEventListener('keydown', (e) => {
    const brandArray2 = Array.from(customDropdwon.children);
    const taregtBuyPriceInp = newDiv.closest('.container-div').querySelector('.buy-price-inp');
    function handleSpanClick(e, attribute) {
      newDiv.innerHTML = brandArray2[index].innerHTML;
      const itemId = Number(attribute);
      newDiv.setAttribute('data-id', attribute)
      fetch(`${serverIP}/items/${itemId}`)
        .then(response => response.json())
        .then(targetItem => {
          taregtBuyPriceInp.value = Number(targetItem.buyPrice);
          updateTotal();
        });
    }
    if (!brandArray2.length) return; // Exit if no items
  
    // Remove previous highlight
    if (index >= 0) brandArray2[index].style.backgroundColor = '';
  
    if (e.key === 'ArrowDown') {
      index = Math.min(index + 1, brandArray2.length - 1); // Ensure it doesn't go beyond the last item
    } else if (e.key === 'ArrowUp') {
      index = Math.max(index - 1, -1); // Ensure it doesn't go below -1
    } else if (e.key === 'Enter') {
      customDropdwonContainer.remove();
      customDropdwon.remove();
      newInp.remove();
      handleSpanClick(e, brandArray2[index].getAttribute('data-id'));
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

// Find item input
document.querySelector('.search-inp').addEventListener('input', function () {
  Array.from(stockentryForm.children).forEach(itemDiv => {
    itemDiv.querySelector('.new-div').style.color = '';
  })
  const updatedValue = this.value.trim().toLocaleLowerCase();
  let totalExistingItem = 0;
  findItem(updatedValue, totalExistingItem)
})

function findItem(updatedValue, totalExistingItem) {
  const existingItemPar = document.querySelector('.existing-item-par');
  const splittedValue = updatedValue.split(' ');
  if (updatedValue.trim() === '') {existingItemPar.innerHTML = 0;return};
  Array.from(stockentryForm.children).forEach(itemDiv => {
    
    if (splittedValue.every(term => itemDiv.querySelector('.new-div').innerHTML.toLocaleLowerCase().includes(term))) {
      totalExistingItem += 1;
      itemDiv.querySelector('.new-div').style.color = 'yellow';
    }
    existingItemPar.innerHTML = totalExistingItem;
  })
}

// eye Icon
document.querySelector('.fa-eye-slash').addEventListener('click', function () {
  this.classList.toggle('fa-eye-slash');
  this.classList.toggle('fa-eye');

  hideBuyPrices(this)
})

function hideBuyPrices(eyeIcon) {
  const buyPriceInps = Array.from(stockentryForm.children).map(cont => cont.querySelector('.buy-price-inp'));
  if (!buyPriceInps[0]) return;
  if (eyeIcon.classList.contains('fa-eye-slash')) {buyPriceInps.forEach(inp => inp.type = 'password');}
  else {
    //const userInput = prompt('Enter password:');
    const userInput = '0.0.0.';
    if (userInput !== '0.0.0.') {
      eyeIcon.classList.toggle('fa-eye-slash');
      return alert('The password is incorrect')
    } else {buyPriceInps.forEach(inp => inp.type = 'text');};
  }
}

function updateTotal() {
  const totalIqdSpan = document.querySelector('.total-iqd-span');
  const totalQntSpan = document.querySelector('.total-quantity-span');
  let totalIQD = 0;
  let totalQnt = 0;
  document.querySelectorAll('.buy-price-inp').forEach(input => {
    totalIQD += (Number(input.value) * Number(input.closest('.container-div').querySelector('.quantity-inp').value));
    totalQnt += Number(input.closest('.container-div').querySelector('.quantity-inp').value);
  });
  totalIqdSpan.innerHTML = totalIQD.toLocaleString();
  totalQntSpan.innerHTML = totalQnt;
}

// Createing the excel
document.querySelector('.excel-file-inp').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    // 1. Get the file data as array buffer
    const data = new Uint8Array(e.target.result);
    
    // 2. Parse the Excel file
    const workbook = XLSX.read(data, { type: 'array' });
    
    // 3. Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    
    // 4. Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
    stockentryForm.innerHTML = '';
    let totQnt = 0;
    for(const item of jsonData) totQnt += Number(item.Quantity);
    const kilos = parseFloat(kiloInp.value);
    const kiloPrice = parseFloat(kiloPriceInp.value);
    const todayDoller = parseFloat(dollerDinarInp.value)/100;
    const todayRMB = parseFloat(RMBInp.value);
    const eachShipFee = (kilos * kiloPrice * todayDoller)/totQnt;
    for(const item of jsonData) {
      const itemId = Number(item.Id);
      const brand = item.Brand;
      const model = item.Model;
      const category = item.Category;
      const quality = item.Quality;
      let buyPrice = Number(item["Buy Price"]);
      const quantity = Number(item.Quantity);
      const rmbPrice = Number(item["RMB Price"]);
      if (!buyPrice) buyPrice = ((rmbPrice / todayRMB * todayDoller + eachShipFee)/1000).toFixed(3);
      addItemDiv(itemId, brand, model, category, quality, buyPrice, quantity);
    }
    updateTotal();
    orderNum = 0;
    document.querySelectorAll('.container-div').forEach((div, index) => {
      div.querySelector('.index').innerHTML = index + 1;
      orderNum += 1;
    })
  };
  reader.readAsArrayBuffer(file);
});

document.addEventListener('click', function(e) {
  const inputContainerDiv = document.querySelector('.input-container-div');
  if (!inputContainerDiv) return;
  if (!e.target.matches('.new-inp')) inputContainerDiv.remove();
})

function addItemDiv(itemId, brand, model, category, quality, buyPrice, quantity) {
  const eyeIcon = document.querySelector('.eye-icon');
  orderNum += 1;
  const newItemDiv = document.createElement('div');
  newItemDiv.className = 'container-div';
  newItemDiv.innerHTML = `
  <span class="index">${orderNum}</span>
  <div class="new-div" data-id="${itemId}">${brand + ' ' + model + ' ' + category + ' ' + quality}</div>
  <input type="${eyeIcon.classList.contains("fa-eye-slash") ? 'password': 'number'}" value="${buyPrice}" class="buy-price-inp" step="any" onkeydown="if (
      !/^[0-9.]$/.test(event.key) &&
      !(event.ctrlKey && ['v', 'z', 'a', 'x', 'c'].includes(event.key.toLowerCase())) &&
      !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowRight', 'ArrowLeft'].includes(event.key)) event.preventDefault();if (event.key === '.' && this.value.includes('.')) event.preventDefault();">
  <div class="two-quantity-div">
    <input type="number" value="${quantity}" class="quantity-inp" onkeydown="if (['-', 'ArrowUp', 'ArrowDown', 'e', 'E'].includes(event.key)) event.preventDefault();">
    <div class="last-quantity-div">0</div>
  </div>
  <i class="fas fa-trash delete-icon"></i>
  `
  newItemDiv.querySelector('.delete-icon').addEventListener('click', function(e) {deleteDiv(e); updateTotal()})
  newItemDiv.querySelector('.buy-price-inp').addEventListener('input', function() {updateTotal()})
  newItemDiv.querySelector('.quantity-inp').addEventListener('input', function() {updateTotal()})

  const newDiv = newItemDiv.querySelector('.new-div');
  newDiv.addEventListener('click', async function (e) {
    await fetchItems();
    const customDropdwonContainer = document.createElement('div');
    customDropdwonContainer.className = 'input-container-div';
    customDropdwonContainer.spellcheck = false;
    const newInp = document.createElement('input');
    newInp.className = 'new-inp';
    const customDropdwon = document.createElement('div');
    customDropdwon.className = 'costum-dropdwon';

    customDropdwonSpans.forEach(span => {customDropdwon.appendChild(span)});
    document.body.appendChild(customDropdwonContainer);
    customDropdwonContainer.appendChild(newInp)
    customDropdwonContainer.appendChild(customDropdwon);
    const indexSpan = e.target.previousElementSibling;
    const rect = indexSpan.getBoundingClientRect();
    customDropdwonContainer.style.display = 'flex';
    customDropdwonContainer.style.position = 'absolute';
    customDropdwonContainer.style.top = `${rect.top + 40}px`;
    handleDropposit(customDropdwonContainer, rect);
    newInp.focus();
    const taregtBuyPriceInp = newItemDiv.querySelector('.buy-price-inp');
    searchItem(customDropdwon, newInp, newDiv, customDropdwonContainer, customDropdwonSpans);
    for(const span of Array.from(customDropdwon.children)) {
      span.addEventListener('click', async (e) => {
        newDiv.innerHTML = e.target.innerHTML;
        const itemId = Number(span.getAttribute('data-id'));
        newDiv.setAttribute('data-id', span.getAttribute('data-id'))
        const response = await fetch(`${serverIP}/items/${itemId}`);
        const targetItem = await response.json();
        taregtBuyPriceInp.value = Number(targetItem.buyPrice);
        updateTotal();
        customDropdwon.remove();
        newInp.remove();
        customDropdwonContainer.remove();
      })
    }
  })
  stockentryForm.appendChild(newItemDiv);
  focusNextInput(newItemDiv.querySelector('.buy-price-inp'), 'buy-price');
  focusNextInput(newItemDiv.querySelector('.quantity-inp'), 'quantity');
}

const excelInp = document.querySelector('.excel-file-inp');
excelIcon.addEventListener('click', function() {
  excelInp.click();
})

const calcIcon = document.querySelector('.fa-calculator');
const modalContainerDiv = document.querySelector('.modal-container-div');

calcIcon.addEventListener('click', function() {
  modalContainerDiv.classList.add('show');
  setTimeout(() => {kiloInp.focus()}, 50);
})

modalContainerDiv.addEventListener('click', function(e) {
  if (e.target.matches('.modal-container-div')) modalContainerDiv.classList.remove('show');
})

function goNextInp(e) {
  if (e.key !== 'Enter') return;
  const currInp = e.target;
  const nextInp = currInp.nextElementSibling;
  if (!nextInp) return modalContainerDiv.classList.remove('show');
  nextInp.focus();
}

window.goNextInp = goNextInp;

document.querySelector('.remark-inp').addEventListener('click', async function() {
  const newDivs = [...document.querySelectorAll('.new-div')];
  const response = await fetch(`${serverIP}/get-item-name`);
  const items = await response.json();
  for (const div of newDivs) {
    const name = div.innerHTML.trim();
    const dbName = items.find(i => {
      const conName = i.brand_name + ' ' + i.model_name + ' ' + i.category_name + ' ' + i.quality_name;
      const matchname = name === conName;
      return matchname;
    });
    if (!dbName) console.log(name)
    div.setAttribute('data-id', dbName.id)
    console.log(dbName.id)
  }
})