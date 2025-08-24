import { focusNextInput } from './stockFunctions.js';

const currentInvoiceId = JSON.parse(localStorage.getItem('currentInvoiceId')) || [];
const stockEntryForm = document.querySelector('.stock-entry-form');
const cancelButt = document.querySelector('.cancel-butt');
const saveButt = document.querySelector('.save-butt2');
const addItemButt = document.querySelector('.add-item-butt');
const stockentryForm = document.querySelector('.stock-entry-form');
const submitButt = document.querySelector('.submit-butt2');
const skuInp = document.querySelector('.sku-inp')
const remarkInp = document.querySelector('.remark-inp');
const ballIcon = document.querySelector('.fa-circle');
const invoiceStatusSpan = document.querySelector('.invoice-status-span');
const excelIcon = document.querySelector('.fa-file-excel');
const searchInp = document.querySelector('.search-inp');
searchInp.value = localStorage.getItem('searchInpVal') || '';
let currentIdInvoice;
const kiloInp = document.querySelector('.kilo-inp');
const kiloPriceInp = document.querySelector('.kilo-price-inp');
const todayDoller = document.querySelector('.doller-dinar-inp');
const todayRMB = document.querySelector('.RMB-inp');

if (localStorage.getItem('hideSaveButt') === 'true') {
  saveButt.style.display = 'none';
  localStorage.removeItem('hideSaveButt'); // Reset the flag after applying
}
if (localStorage.getItem('submitButtonDisabled') === 'false') {
  submitButt.disabled = false
  localStorage.removeItem('submitButtonDisabled');
}

const customDropdwonSpans = [];
let latestFetchId = 0;
async function fetchItems(newInp) {
  const thisFetchId = ++latestFetchId; // Increment global fetch ID
  const updatedInpVal = newInp ? newInp.value.trim().toLocaleLowerCase() : '';  
  const response = await fetch(`${serverIP}/itemsFilter?search=${updatedInpVal}`);
  const items = await response.json();
  if (thisFetchId !== latestFetchId) return;
  items.forEach(item => {
    if (item.disable === 'checked') return;
    const span = document.createElement('span')
    span.className = 'item-span'
    span.innerHTML = item.brand_name + ' ' + item.model_name + ' ' + item.category_name + ' ' + item.quality_name + `<span class="sku-box-span" style="display: none;">${item.SKU || ''}${item.boxId || ''}</span>`;
    span.setAttribute('data-id', item.id);
    customDropdwonSpans.push(span);
  });
}

async function createDropdown(e) {
  const invoice = localStorage.getItem('invoiceStatus');
  if (invoice !== 'Pending') return;
  customDropdwonSpans.length = 0;
  await fetchItems();
  const customDropdwonContainer = document.createElement('div');
  customDropdwonContainer.className = 'input-container-div';
  customDropdwonContainer.spellcheck = false;
  const newInp = document.createElement('input');
  newInp.className = 'new-inp';
  const customDropdwon = document.createElement('div');
  customDropdwon.className = 'costum-dropdwon';
  document.body.appendChild(customDropdwonContainer);

  customDropdwonContainer.appendChild(newInp)
  customDropdwonContainer.appendChild(customDropdwon);
  customDropdwonSpans.forEach(span => {customDropdwon.appendChild(span)});
  document.body.appendChild(customDropdwonContainer);
  const indexSpan = e.target.previousElementSibling;
  const rect = indexSpan.getBoundingClientRect();
  customDropdwonContainer.style.display = 'flex';
  customDropdwonContainer.style.position = 'absolute';
  customDropdwonContainer.style.top = `${rect.top + 40}px`;
  handleDropposit(customDropdwonContainer, rect);
  newInp.focus();
  const newDiv = e.target;
  const taregtBuyPriceInp = newDiv.closest('.container-div').querySelector('.buy-price-inp');
  searchItem(customDropdwon, newInp, newDiv, customDropdwonContainer, customDropdwonSpans);
  function handleSpanClick(e) {
    newDiv.innerHTML = e.target.innerHTML;
    const itemId = Number(e.target.getAttribute('data-id'));
    newDiv.setAttribute('data-id', e.target.getAttribute('data-id'))
    fetch(`${serverIP}/items/${itemId}`)
    .then(response => response.json())
    .then(targetItem => {
      taregtBuyPriceInp.value = Number(targetItem.buyPrice);
      resetButtons();
      updateTotal();
    });
    customDropdwon.remove();
    newInp.remove();
    customDropdwonContainer.remove();
    for (const span of customDropdwon.children) {
      span.removeEventListener('click', handleSpanClick);
    }
  }
  for(const span of Array.from(customDropdwon.children)) {
      span.addEventListener('click', handleSpanClick);
  }
}

document.addEventListener('click', function(e) {
  const inputContainerDiv = document.querySelector('.input-container-div');
  if (!inputContainerDiv) return;
  if (!e.target.matches('.new-inp')) inputContainerDiv.remove();
})

function useLoadingIcon() {
 stockEntryForm.innerHTML = `
  <div class="spinner-container">
    <div class="spinner quality-spinner"></div>
  </div>
  `
}

async function fetchThisInvoiceFromBackend() {
  useLoadingIcon();
  const response = await fetch(`${serverIP}/stockentinvs-get/${currentInvoiceId}`);
  const stockResp = await response.json();
  const invoice = stockResp.invoice;
  currentIdInvoice = invoice;
  fetchCurrentInv();
}

let orderNum = 0;
function fetchCurrentInv() {
  fetchInvoiceStatus();
  stockEntryForm.innerHTML = '';
  skuInp.value = currentIdInvoice.sku;
  remarkInp.value = currentIdInvoice.remark;
  kiloInp.value = Number(currentIdInvoice.kilos) === 0 ? null : Number(currentIdInvoice.kilos);
  kiloPriceInp.value = Number(currentIdInvoice.kiloPrice) === 0 ? null : Number(currentIdInvoice.kiloPrice);
  todayDoller.value = Number(currentIdInvoice.todayDoller) === 0 ? null : Number(currentIdInvoice.todayDoller);
  todayRMB.value = Number(currentIdInvoice.todayRMB) === 0 ? null : Number(currentIdInvoice.todayRMB);

  const targetItems = currentIdInvoice.items;
  for(const item of targetItems) {
    orderNum += 1;
    const newItemDiv = document.createElement('div');
    newItemDiv.className = 'container-div';
    newItemDiv.innerHTML = `
    <span class="index">${orderNum}</span>
    <div class="new-div" data-id="${item.itemId}">${item.itemName + `<span class="sku-box-span" style="display: none;">${item.itemDet}</span>`}</div><input type="password" value="${Number(item.buyPrice)}" class="buy-price-inp" step="any" onkeydown="if (
      !/^[0-9.]$/.test(event.key) &&
      !(event.ctrlKey && ['v', 'z', 'a', 'x', 'c'].includes(event.key.toLowerCase())) &&
      !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowRight', 'ArrowLeft'].includes(event.key)
  ) event.preventDefault(); if (event.key === '.' && this.value.includes('.')) event.preventDefault();">
  <div class="two-quantity-div">
      <input type="number" value="${item.quantity}" class="quantity-inp" onkeydown="if (!/^[0-9]$/.test(event.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowRight', 'ArrowLeft'].includes(event.key)) event.preventDefault();">
      <div class="last-quantity-div"">${item.lastQuantity}</div>
    </div>
    <i class="fas fa-trash delete-icon" style="display: none;"></i>
    `
    newItemDiv.querySelector('.delete-icon').addEventListener('click', function(e) {deleteDiv(e); updateTotal()});
    newItemDiv.querySelector('.buy-price-inp').addEventListener('input', function(e) {updateTotal()});
    newItemDiv.querySelector('.quantity-inp').addEventListener('input', function(e) {updateTotal()});
    newItemDiv.querySelector('.new-div').addEventListener('click', function(e) {createDropdown(e)});
    newItemDiv.querySelector('.new-div').addEventListener('input', function(e) {resetButtons()});

    stockEntryForm.appendChild(newItemDiv);
    focusNextInput(newItemDiv.querySelector('.buy-price-inp'), 'buy-price');
    focusNextInput(newItemDiv.querySelector('.quantity-inp'), 'quantity');

    if (currentIdInvoice.invStatus === 'Pending') {
      const deleteIcons = document.querySelectorAll('.delete-icon');
      deleteIcons.forEach(icon => {
        icon.style.display = '';
      })
    }
    if (currentIdInvoice.invStatus !== 'Pending') {
      const quantityInps = document.querySelectorAll('.quantity-inp');
      quantityInps.forEach(qntInput => {
      qntInput.disabled = true;
      });
    }
    updateTotal();
    let totalExistingItem = 0;
    findItem(searchInp.value, totalExistingItem)
  }
}

fetchThisInvoiceFromBackend()

addItemButt.addEventListener('click', () => {
  const eyeIcon = document.querySelector('.eye-icon');
  resetButtons();
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
  newItemDiv.querySelector('.buy-price-inp').addEventListener('input', function(e) {updateTotal()});
  newItemDiv.querySelector('.quantity-inp').addEventListener('input', function(e) {updateTotal()});
  newItemDiv.querySelector('.new-div').addEventListener('click', function(e) {createDropdown(e)});
  newItemDiv.querySelector('.new-div').addEventListener('input', function(e) {resetButtons()});
  stockentryForm.appendChild(newItemDiv);
  focusNextInput(newItemDiv.querySelector('.buy-price-inp'), 'buy-price');
  focusNextInput(newItemDiv.querySelector('.quantity-inp'), 'quantity');
});

function deleteDiv(event) {
  event.target.closest('.container-div').remove();
  resetButtons();
  const spans = document.querySelectorAll('.index');
  if (spans.length === 0) {orderNum = 0; return}
  spans.forEach((span, index) => {
    span.innerHTML = index + 1;
    orderNum = index + 1;
  });
};

function resetButtons() {
  const invStat = localStorage.getItem('invoiceStatus');
  if (invStat === 'Pending') {
    submitButt.disabled = true;
    saveButt.style.display = '';
  }
}

function enableButt(button) {
  button.disabled = false;
  button.innerHTML = 'Save';
}

// Check the invoice the status
function fetchInvoiceStatus() {
  if (currentIdInvoice.invStatus === 'Pending') {
    const quantityInps = document.querySelectorAll('.quantity-inp');
    addItemButt.style.display = '';
    quantityInps.forEach(qntInput => {
      qntInput.disabled = false;
      });
    cancelButt.style.display = 'none';
    const checkboxInp = document.querySelector('.checkbox-inp');

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
        return enableButt(saveButt);
      };
      for(const newDiv of newDivs) {
        if (newDiv.innerHTML === 'Select...') {
          newDiv.style.background = 'rgb(167, 66, 66)';
          const index = newDiv.closest('.container-div').querySelector('.index').innerHTML;
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
          return enableButt(saveButt);
        };
        newDiv.style.background = '';
      }

      for(const [index, newDiv] of newDivs.entries()) {
        newDiv.style.background = '';
      }
      for(const input of quantityInps) {
        input.style.background = '';
      }
      const mySet = new Set();
      const mySet2 = new Set();
      for(const [index, div] of newDivs.entries()) {
        if (quantityInps[index].value === '0' || quantityInps[index].value === '') {
          quantityInps[index].style.background = 'rgb(167, 66, 66)';
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
          return enableButt(saveButt);
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
          return enableButt(saveButt);
        }
        mySet.add(div.innerHTML)
        mySet2.add(div.getAttribute('data-id'));
      }
      const invoiceData = [];
      for(const [index, newDiv] of newDivs.entries()) {
        for(const div of newDivs) {
          if (div.getAttribute('data-id')) {
            if (div.getAttribute('data-id') === 'NaN') {div.style.background = 'rgb(154, 59, 59)';saveButt.disabled = false;saveButt.innerHTML = 'Save';
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
              return enableButt(saveButt);
            };
          }
        }
        const itemId = parseInt(newDiv.getAttribute('data-id')); //Needed
        invoiceData.push({
          id: itemId,
          buyPrice: parseFloat(buyPriceInps[index].value) || 0,
          quantity: parseInt(quantityInps[index].value) || 0,
          lastQuantity: parseInt(quantityInps[index].value) || 0
        });
      };
      const formItems = [...stockentryForm.querySelectorAll('.container-div')].map(container => {
        const id = Number(container.querySelector('.new-div').getAttribute('data-id'));
        const buyPrice = Number(container.querySelector('.buy-price-inp').value);
        return {
          id: id,
          buyPrice: buyPrice
        }
      });
      const response = await fetch(`${serverIP}/stockentinvs-checkBoxEditNew/${currentInvoiceId}`, {
        method:'PUT',
        headers:{'Content-Type': 'application/json'},
        body: JSON.stringify({
          updatedFeilds: { 
          items: JSON.stringify(invoiceData),
          sku: skuInp.value.trim(),
          remark: remarkInp.value.trim(),
          kilos: kiloInp.value || 0,
          kiloPrice: kiloPriceInp.value || 0,
          todayDoller: todayDoller.value || 0,
          todayRMB: todayRMB.value || 0
          },
          priceCheckBox: checkboxInp.checked ? true : false,
          formItems
        })
      });
      const saveResp = await response.json();
      if (saveResp.result === 'notFoundId') {
        const invalidId = saveResp.invalidId;
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
      if (saveResp.currentInv.invStatus !== 'Pending') {
        alert('This invoice is already submitted');
        return enableButt(saveButt); 
      }
      localStorage.setItem('hideSaveButt', 'true'); // Store state before reload
      localStorage.setItem('submitButtonDisabled', 'false'); // Store state before reload
      Toastify({
        text: `Invoice updated!`,
        duration: 3000,
        gravity: 'top', // or 'top'
        position: 'center', // or 'right', 'center'
        style: {
          background: 'rgb(154, 59, 59)',
          borderRadius: '10px',
        },
        stopOnFocus: true,
      }).showToast();
      localStorage.setItem('isInvoiceUpdated', 'true');
      location.reload(true);
    });

    submitButt.addEventListener('click', async () => {
      submitButt.disabled = true;
      submitButt.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      const allContainers = document.querySelectorAll('.container-div');
      const items = [...allContainers].map(cont => {
        const id = Number(cont.querySelector('.new-div').getAttribute('data-id'));
        const inpBuyPrice = Number(cont.querySelector('.buy-price-inp').value);
        const inpQnt = Number(cont.querySelector('.two-quantity-div').querySelector('.quantity-inp').value);
        return {
          id: id,
          buyPrice: inpBuyPrice,
          quantity: inpQnt,
          lastQuantity: inpQnt
        }
      });

      // ✅ Fetch all items' latest quantities in one request
      const response = await fetch(`${serverIP}/items-and-updateStock/batch?invId=${currentInvoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items,
          stockInvId: currentInvoiceId,
          checkboxInp: checkboxInp.checked ? true : false
        })
      });
      const waitResp = await response.json();
      const currentInv = waitResp.currentInv;
      if (currentInv.invStatus !== 'Pending') {
        enableButt(submitButt)
        return Toastify({
          text: `This invoice is already submitted!`,
          duration: 2000,
          gravity: 'top',
          position: 'center',
          style: { background: 'brown', borderRadius: '10px' },
          stopOnFocus: true,
        }).showToast();
      }
      const quantityInps1 = document.querySelectorAll('.quantity-inp');
      for(const input of quantityInps1) {
        input.style.background = '';
      }
      
      localStorage.setItem('isInvoiceSubmitted', 'true');
      document.body.classList.add('animate-out');
      setTimeout(() => {
        window.location.href = 'stockentry.html';
      }, 200)
    });
  } else if (currentIdInvoice.invStatus === 'Canceled') {
    saveButt.style.display = 'none';
    cancelButt.disabled = true;
    submitButt.disabled = false;
    const checkboxInp = document.querySelector('.checkbox-inp');
    submitButt.addEventListener('click', async () => {
      submitButt.disabled = true;
      submitButt.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      const allContainers = document.querySelectorAll('.container-div');
      const currentItems = [...allContainers].map(cont => {
        const id = Number(cont.querySelector('.new-div').getAttribute('data-id'));
        const inpBuyPrice = Number(cont.querySelector('.buy-price-inp').value);
        const inpQnt = Number(cont.querySelector('.two-quantity-div').querySelector('.quantity-inp').value);
        const currentLastQnt = Number(cont.querySelector('.two-quantity-div').querySelector('.last-quantity-div').innerHTML);
        return {
          id: id,
          buyPrice: inpBuyPrice,
          quantity: inpQnt,
          lastQuantity: currentLastQnt
        }
      });
      const formItems = [...stockentryForm.querySelectorAll('.container-div')].map(container => {
        const id = Number(container.querySelector('.new-div').getAttribute('data-id'));
        const buyPrice = Number(container.querySelector('.buy-price-inp').value);
        return {
          id: id,
          buyPrice: buyPrice
        }
      });
      await fetch(`${serverIP}/stockentinvs-submit/${currentInvoiceId}`, {
        method:'PUT',
        headers:{'Content-type': 'application/json'},
        body: JSON.stringify({
          updatedFeilds: {
            invStatus: 'Submitted',
            items: JSON.stringify(currentItems),
            sku: skuInp.value.trim(),
            remark: remarkInp.value.trim(),
            kilos: kiloInp.value || 0,
            kiloPrice: kiloPriceInp.value || 0,
            todayDoller: todayDoller.value || 0,
            todayRMB: todayRMB.value || 0
          },
          priceCheckBox: checkboxInp.checked ? true : false,
          formItems
        })
      });
      localStorage.setItem('isInvoiceSubmitted', 'true');
      document.body.classList.add('animate-out');
      setTimeout(() => {
        window.location.href = 'stockentry.html';
      }, 200)
    });
    ballIcon.style.color = 'rgb(224, 175, 60)';
    invoiceStatusSpan.style.color = 'rgb(224, 175, 60)';
    invoiceStatusSpan.innerHTML = 'Canceled';
    addItemButt.style.display = 'none';
    excelIcon.style.display = 'none';
  } else if (currentIdInvoice.invStatus === 'Submitted') {
    saveButt.style.display = 'none';
    ballIcon.style.color = 'rgb(60, 224, 161)';
    invoiceStatusSpan.style.color = 'rgb(60, 224, 161)';
    invoiceStatusSpan.innerHTML = 'Submitted';
    addItemButt.style.display = 'none';
    excelIcon.style.display = 'none';
  }
}

function enableSaveButt() {
  saveButt.disabled = false;
  saveButt.innerHTML = 'Save';
}

cancelButt.addEventListener('click', async () => {
  cancelButt.disabled = true;
  cancelButt.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  await fetch(`${serverIP}/stockentinvs/${currentInvoiceId}`, {
    method:'PUT',
    headers:{'Content-type': 'application/json'},
    body: JSON.stringify({
      invStatus: 'Canceled'
    })
  })

  cancelButt.disabled = true;
  submitButt.disabled = false;
  const checkboxInp = document.querySelector('.checkbox-inp');
  Toastify({
    text: `Invoice canceled!`,
    duration: 2000,
    gravity: 'top', // or 'top'
    position: 'center', // or 'right', 'center'
    style: {
      background: 'rgb(61, 183, 138)',
      borderRadius: '10px',
    },
    stopOnFocus: true,
  }).showToast();
  submitButt.addEventListener('click', async () => {
    submitButt.disabled = true;
    submitButt.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const allContainers = document.querySelectorAll('.container-div');
    const currentItems = [...allContainers].map(cont => {
      const id = Number(cont.querySelector('.new-div').getAttribute('data-id'));
      const inpBuyPrice = Number(cont.querySelector('.buy-price-inp').value);
      const inpQnt = Number(cont.querySelector('.two-quantity-div').querySelector('.quantity-inp').value);
      const currentLastQnt = Number(cont.querySelector('.two-quantity-div').querySelector('.last-quantity-div').innerHTML);
      return {
        id: id,
        buyPrice: inpBuyPrice,
        quantity: inpQnt,
        lastQuantity: currentLastQnt
      }
    });
    const formItems = [...stockentryForm.querySelectorAll('.container-div')].map(container => {
        const id = Number(container.querySelector('.new-div').getAttribute('data-id'));
        const buyPrice = Number(container.querySelector('.buy-price-inp').value);
        return {
          id: id,
          buyPrice: buyPrice
        }
      });
    await fetch(`${serverIP}/stockentinvs-submit/${currentInvoiceId}`, {
      method:'PUT',
      headers:{'Content-type': 'application/json'},
      body: JSON.stringify({
        updatedFeilds: {
          invStatus: 'Submitted',
          items: JSON.stringify(currentItems),
          sku: skuInp.value.trim(),
          remark: remarkInp.value.trim(),
          kilos: kiloInp.value || 0,
          kiloPrice: kiloPriceInp.value || 0,
          todayDoller: todayDoller.value || 0,
          todayRMB: todayRMB.value || 0
        },
        priceCheckBox: checkboxInp.checked ? true : false,
        formItems
      })
    });
    localStorage.setItem('isInvoiceSubmitted', 'true');
    document.body.classList.add('animate-out');
    setTimeout(() => {
      window.location.href = 'stockentry.html';
    }, 200)
  });
  cancelButt.innerHTML = 'Cancel';
  ballIcon.style.color = 'rgb(224, 175, 60)';
  invoiceStatusSpan.style.color = 'rgb(224, 175, 60)';
  invoiceStatusSpan.innerHTML = 'Canceled';
});

function searchItem(customDropdwon, newInp, newDiv, customDropdwonContainer, customDropdwonSpans) {
  let index = -1;
  newInp.addEventListener('input', async () => {
    customDropdwonSpans.length = 0;
    index = -1;
    customDropdwon.innerHTML = '';
    const updatedInpVal = newInp.value.trim().toLocaleLowerCase();
    const splittedValue = updatedInpVal.split(' ');
    await fetchItems(newInp);
    const lastArray = customDropdwonSpans.filter(brand => splittedValue.every(term => (brand.innerHTML + brand.querySelector('.sku-box-span').innerHTML).toLocaleLowerCase().includes(term)));
    const taregtBuyPriceInp = newDiv.closest('.container-div').querySelector('.buy-price-inp');
    function handleSpanClick(e) {
      newDiv.innerHTML = e.target.innerHTML;
      const itemId = Number(e.target.getAttribute('data-id'));
      newDiv.setAttribute('data-id', e.target.getAttribute('data-id'));
      fetch(`${serverIP}/items/${itemId}`)
      .then(response => response.json())
      .then(targetItem => {
        taregtBuyPriceInp.value = Number(targetItem.buyPrice);
        resetButtons();
        updateTotal();
      });
      customDropdwonContainer.remove();
      customDropdwon.remove();
      newInp.remove();
    }
    lastArray.forEach(brand => {
      const span = document.createElement('span');
      span.className = `item-span`
      span.innerHTML = brand.innerHTML;
      span.setAttribute('data-id', brand.getAttribute('data-id'));
      span.addEventListener('click', handleSpanClick, { once: true});
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
        resetButtons();
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
      document.querySelectorAll('.input-container-div').forEach(cont => cont.remove());
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
};

// Find item input
searchInp.addEventListener('input', function () {
  Array.from(stockentryForm.children).forEach(itemDiv => {
    itemDiv.querySelector('.new-div').style.color = '';
  })
  const updatedValue = this.value.trim().toLocaleLowerCase();
  let totalExistingItem = 0;
  findItem(updatedValue, totalExistingItem)
})

function findItem(updatedValue, totalExistingItem) {
  const existingItemPar = document.querySelector('.existing-item-par');
  const splittedValue = updatedValue.toLocaleLowerCase().trim().split(' ');
  if (updatedValue.trim() === '') {
    existingItemPar.innerHTML = 0;
    return;
  }

  let firstMatchFound = false;
  totalExistingItem = 0;

  Array.from(stockentryForm.children).forEach(itemDiv => {
    const newDiv = itemDiv.querySelector('.new-div');
    const itemText = newDiv.innerHTML.toLocaleLowerCase();

    if (splittedValue.every(term => itemText.includes(term))) {
      totalExistingItem += 1;
      newDiv.style.color = 'yellow';

      if (!firstMatchFound) {
        itemDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstMatchFound = true;
      }
    } else {
      newDiv.style.color = ''; // Reset color if not matched
    }
  });
  existingItemPar.innerHTML = totalExistingItem;
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
    const userInput = prompt('Enter password:');
    if (userInput !== '0.0.0.') {
      eyeIcon.classList.toggle('fa-eye-slash');
      return alert('The password is incorrect')
    } else {buyPriceInps.forEach(inp => inp.type = 'text');};
  }
}

skuInp.addEventListener('input', () => resetButtons());
remarkInp.addEventListener('input', () => resetButtons());

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

// Creating excel
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
    const dollerDinar = parseFloat(todayDoller.value)/100;
    const RMBPri = parseFloat(todayRMB.value);
    const eachShipFee = (kilos * kiloPrice * dollerDinar)/totQnt;
    for(const item of jsonData) {
      const itemId = Number(item.Id);
      const sku = item.SKU;
      const boxId = item['Box ID'];
      const brand = item.Brand;
      const model = item.Model;
      const category = item.Category;
      const quality = item.Quality;
      let buyPrice = Number(item["Buy Price"]);
      const quantity = Number(item.Quantity);
      const rmbPrice = Number(item["RMB Price"]);
      if (!buyPrice) buyPrice = ((rmbPrice / RMBPri * dollerDinar + eachShipFee)/1000).toFixed(3);
      addItemDiv(sku, boxId, itemId, brand, model, category, quality, buyPrice, quantity)
    }
    updateTotal();
    orderNum = 0;
    document.querySelectorAll('.container-div').forEach((div, index) => {
      div.querySelector('.index').innerHTML = index + 1;
      orderNum++
    })
  };
  
  reader.readAsArrayBuffer(file);
});

async function addItemDiv(sku, boxId, itemId, brand, model, category, quality, buyPrice, quantity) {
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
  newItemDiv.querySelector('.buy-price-inp').addEventListener('input', function(e) {updateTotal()});
  newItemDiv.querySelector('.quantity-inp').addEventListener('input', function(e) {updateTotal()});
  newItemDiv.querySelector('.new-div').addEventListener('click', function(e) {createDropdown(e)});
  newItemDiv.querySelector('.new-div').addEventListener('input', function(e) {resetButtons()});
  
  const newDiv = newItemDiv.querySelector('.new-div');
  stockentryForm.appendChild(newItemDiv)
}

document.addEventListener('click', function(e) {
  if (e.target.closest('a')) {sessionStorage.removeItem('stockTableScrollPosition')}
})

const isSaved = localStorage.getItem('isInvoiceSaved');
const isUpdated = localStorage.getItem('isInvoiceUpdated');
if (isSaved || isUpdated) {
  if (isSaved)
  Toastify({
    text: `New invoice created!`,
    duration: 2000,
    gravity: 'top', // or 'top'
    position: 'center', // or 'right', 'center'
    style: {
      background: 'rgb(61, 183, 138)',
      borderRadius: '10px',
    },
    stopOnFocus: true,
  }).showToast();
  if (isUpdated)
    Toastify({
      text: `Invoice Updated!`,
      duration: 2000,
      gravity: 'top', // or 'top'
      position: 'center', // or 'right', 'center'
      style: {
        background: 'rgb(61, 183, 138)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
  localStorage.removeItem('isInvoiceSaved');
  localStorage.removeItem('isInvoiceUpdated');
}

const excelInp = document.querySelector('.excel-file-inp');
excelIcon.addEventListener('click', function() {
  excelInp.click();
})

excelInp.addEventListener('input', function() {resetButtons()});

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
  resetButtons();
  if (e.key !== 'Enter') return;
  const currInp = e.target;
  const nextInp = currInp.nextElementSibling;
  if (!nextInp) return modalContainerDiv.classList.remove('show');
  nextInp.focus();
}

window.goNextInp = goNextInp;