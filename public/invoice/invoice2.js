const tableTbody = document.querySelector('.invoice-table').getElementsByTagName('tbody')[1];
const searchInp = document.querySelector('.search-inp');
searchInp.focus();
const posInvoiceList = []; // consists of DOM elements not invoice objects, this is different from invoiceList array
let itemListArray = [];
const totalBuyinvoiceList = [];
const loanList = [];
const invoiceItemList = [];
const customerInp = document.querySelector('.customer-inp');
const deliveryInp = document.querySelector('.delivery-inp');
const workerInp = document.querySelector('.worker-inp');
const inputContainerDiv = document.querySelector('.input-container-div');
const deliveryInputContainerDiv = document.querySelector('.delivery-input-container-div');
const workerInputContainerDiv = document.querySelector('.worker-input-container-div');
const removeIcon = document.querySelector('.customerRemoveIcon');
const deliveryRemoveIcon = document.querySelector('.deliveryRemoveIcon');
const workerRemoveIcon = document.querySelector('.workerRemoveIcon');
const customDropdwon = document.querySelector('.customDropdwon');
const deliveryCustomDropdwon = document.querySelector('.deliveryCustomDropdwon');
const workerCustomDropdwon = document.querySelector('.workerCustomDropdwon');
const hidingcheckIcon = document.querySelector('.fa-circle-check');
const startDateInp = document.getElementById('startDate');
const endDateInp = document.getElementById('endDate');
startDateInp.addEventListener('change', function() {fetchPosInvoices()});
endDateInp.addEventListener('change', function() {fetchPosInvoices()});
localStorage.removeItem('previousFile');
const priceSelect = document.querySelector('.price-select');
const deliverySelect = document.querySelector('.delivery-select');
const pageInp = document.querySelector('.page-inp');
pageInp.value = 50;

function restoreValues() {
  const saved = sessionStorage.getItem('pos-filters');
  if (saved) {
    const filters = JSON.parse(saved);
    searchInp.value = filters.search || '';
    priceSelect.value = filters.priceSelect || 'All';
    deliverySelect.value = filters.deliverySelect || 'Both';
    customerInp.value = filters.customerInp || '';
    deliveryInp.value = filters.deliveryInp || '';
    workerInp.value = filters.workerInp || '';
    pageInp.value = filters.pageInp || '50';
    startDateInp.value = filters.startDateInp || getTwoMonthsAgo(getLatestDate());
    endDateInp.value = filters.endDateInp || getLatestDate();
  }
}

if (performance.getEntriesByType("navigation")[0].type === "reload") {
  sessionStorage.removeItem('pos-filters');
}

searchInp.value = sessionStorage.getItem('filter_search') || '';


const digitToLetter = {
  '0': 'Z',
  '1': 'O',
  '2': 'T',
  '3': 'E',
  '4': 'F',
  '5': 'P',
  '6': 'S',
  '7': 'H',
  '8': 'A',
  '9': 'N'
};
const cleanerInpIcon = document.querySelector('.fa-times-circle');

endDateInp.value = getLatestDate();
startDateInp.value = getTwoMonthsAgo(getLatestDate())
  
const tableDiv = document.querySelector('.table-div');
const allowedPages = ['invoice.html']; // Add the wanted HTML files

// Restore scroll position when entering (if it's a wanted file)
function restoreScroll() {
  const currentPage = window.location.pathname.split('/').pop();
  if (allowedPages.includes(currentPage)) {
      const savedScrollTop = sessionStorage.getItem('tableScrollTop');
      if (savedScrollTop !== null) {
          tableDiv.scrollTop = savedScrollTop;
      }
      const savedCheckFilter = sessionStorage.getItem('hidingcheckIcon');
      if (savedCheckFilter) {
        if (!savedCheckFilter.includes('check')) hidingcheckIcon.click();
      }
  }
  sessionStorage.removeItem('tableScrollTop');
  sessionStorage.removeItem('hidingcheckIcon');
}

let isItemsAllFetched = false;

pageInp.addEventListener('keydown', async function(e) {
  if (e.key === 'Enter') await fetchPosInvoices();
})

function fetchLoans(loans) {
  loans.forEach(loan => loanList.push(loan));
}

const stockInvsList = [];
async function fetchStockInvs() {
  const response = await fetch(`${serverIP}/stockentinvs-stItems`);
  const getResp = await response.json();
  const StockInvs = getResp.stInvs;
  StockInvs.forEach(inv => stockInvsList.push(inv));
}

let totalItemBuy = 0;
function fetchTargetStockInv(invoice) {
  invoice.posItems.forEach(it => {
    if (!it.targStockInvs) return console.log(`${invoice.inv_id} has empty stock invoice item(s)`);
    it.targStockInvs.forEach(stInv => {
      const targettotalItemBuy = stInv.buyPrice * stInv.quantity;
      totalItemBuy += targettotalItemBuy;

    })
  })
}

let latestFetchId = 0;
let isAlloans = false;
async function fetchPosInvoices() {
  const thisFetchId = ++latestFetchId;
  tableTbody.innerHTML = `
  <div class="spinner-container">
    <div class="spinner"></div>
  </div>
  `;
  posInvoiceList.length = 0;
  totalBuyinvoiceList.length = 0;
  const startDateInpVal = startDateInp.value.trim();
  const endDateInpVal = endDateInp.value.trim();
  const priceSelectVal = priceSelect.value;
  const deliverySelectVal = deliverySelect.value;
  const checkIconMatch = hidingcheckIcon.classList;
  const customerNameVal = customerInp.value;
  const deliveryNameVal = deliveryInp.value;
  const workerNameVal = workerInp.value;
  const limit = pageInp.value || 50;
  const searchVal = searchInp.value.trim().toLowerCase();
  const response = await fetch(`${serverIP}/posinvoicesFilter-extra-mine?startDate=${startDateInpVal}&endDate=${endDateInpVal}&priceSelectVal=${priceSelectVal}&deliverySelectVal=${deliverySelectVal}&checkIcon=${checkIconMatch}&customer=${customerNameVal}&delivery=${deliveryNameVal}&worker=${workerNameVal}&limit=${limit}&searchVal=${searchVal}&isItemsAllFetched=${isItemsAllFetched}`);
  const result = await response.json();
  if (thisFetchId !== latestFetchId) return;
  tableTbody.innerHTML = '';
  let posInvoices = result.filtInvs;
  const loans = result.loans;
  !isItemsAllFetched ? fetchLoans(loans) : '';
  for(const [index, invoice] of posInvoices.entries()) {
    totalItemBuy = 0;
    fetchTargetStockInv(invoice);
    const newRow = document.createElement('tr');
    newRow.className = 'new-row';
    newRow.setAttribute('data-href', 'invoiceedit.html');
    newRow.innerHTML = `
    <td class="index-td">${index + 1}</td>
    <td class="invoice-id-td">${invoice.id}</td>
    <td class="delFee-td" style="display: none;">${Number(invoice.delFee)}</td>
    <td class="customer-td">${invoice.customer_name}</td>
    <td class="total-td">${Number(invoice.total).toLocaleString()}</td>
    <td class="discount-td">${Number(invoice.discount).toLocaleString()}</td>
    <td class="quantity-td">${invoice.totalQuantity}</td>
    <td 
    class="netTotal-td">
    ${Number(invoice.netTotal).toLocaleString()}
    </td>
    <td class="status-td">${invoice.invStatus}</td>
    <td class="computer-td">${invoice.computerName || ''}</td>
    <td class="seller-td">${invoice.worker_name === 'Unknown' ? '' : invoice.worker_name}</td>
    <td class="date-time-td" data-date="${invoice.newDate.split(',')[0]}" 
    onmouseover="displayItems(${invoice.id}, 'search-inp', 'invoice')"  
    onmouseleave="hideItems()">${invoice.newDate}</td>
    <td class="customer-td deliveryName-td">${invoice.delivery_name === 'No Delivery' ? '' : (invoice.delivery_name) || ''} ${invoice.delivery_name !== 'No Delivery' ? ('- ' + Number(invoice.delFee)) : ''}</td>
    <td class="order-td">${Number(invoice.orders)}</td>
    <td class="price-level-td" style="display: none;">${invoice.priceLevel}</td>
    <td class="status-icon-td" onclick="displayItems(${invoice.id}, 'search-inp', 'invoice')"><i class="fas fa-circle ballIcon"></i></td>
    <td class="delete-td"><i class="fas fa-trash delete-icon"></i></td>
    ` 
    tableTbody.appendChild(newRow);
    posInvoiceList.push(newRow);
    totalBuyinvoiceList.push({id: invoice.id, totalBuy: totalItemBuy});
    const targetStatusTd = newRow.querySelector('.status-td');
    if (targetStatusTd.innerHTML === 'Paid') {newRow.querySelector('.status-icon-td').querySelector('.ballIcon').style.color = 'rgb(32, 190, 90)'}
    else if (targetStatusTd.innerHTML === 'Canceled') {newRow.querySelector('.status-icon-td').querySelector('.ballIcon').style.color = 'rgb(206, 181, 58)'}
    else if (targetStatusTd.innerHTML === 'Canceled2') {newRow.querySelector('.status-icon-td').querySelector('.ballIcon').style.color = 'rgb(237, 46, 46)'};

    if (loanList.some(loan => loan.customer_id === invoice.customerId) && loanList.some(loan => loan.invoiceNum === invoice.id)) {newRow.querySelector('.customer-td').innerHTML += " $$"}
  };
  updateTotal();
  if (customerInp.value.trim() !== '') removeIcon.style.display = 'block';
  if (deliveryInp.value.trim() !== '') deliveryRemoveIcon.style.display = 'block';
  if (workerInp.value.trim() !== '') workerRemoveIcon.style.display = 'block';
  cleanerInpIcon.style.display = searchInp.value.trim() !== '' ? 'block' : 'none';
  setTimeout(() => {
    restoreScroll();
  }, 100);
  isItemsAllFetched = true;
}

restoreValues();
fetchPosInvoices();

async function updateTotal() {
  const totalSpan = document.querySelector('.total-span');
  let total = 0;
  const totalDiscountSpan = document.querySelector('.total-discount-span');
  let totalDiscount = 0;
  const netTotalSpan = document.querySelector('.net-total-span');
  let netTotal = 0;
  const totalQuantitySpan = document.querySelector('.quantity-span');
  let totalQuantity = 0;
  const totalProfitSpan = document.querySelector('.total-profit-span');
  let totalBuy = 0;
  const totalDeliverySpan = document.querySelector('.total-delivery');
  let totalDelivery = 0;

  Array.from(tableTbody.children).forEach(row => {
    const invoiceId = Number(row.querySelector('.invoice-id-td').innerHTML);
    if (row.querySelector('.status-td').innerHTML === 'Canceled2') return;
      total += parseFloat(row.querySelector('.total-td').innerHTML.replace(/,/g, ''));
      totalDiscount += parseFloat(row.querySelector('.discount-td').innerHTML.replace(/,/g, ''));
      netTotal += parseFloat(row.querySelector('.netTotal-td').innerHTML.replace(/,/g, ''));
      totalQuantity += Number(row.querySelector('.quantity-td').innerHTML);
      totalBuy += totalBuyinvoiceList.find(invoice => invoice.id === invoiceId).totalBuy;
      if (row.querySelector('.deliveryName-td').innerHTML.trim() !== '') {totalDelivery += (Number(row.querySelector('.order-td').innerHTML) * Number(row.querySelector('.delFee-td').innerHTML));}
    })
    totalSpan.innerHTML = total.toLocaleString();
    totalDiscountSpan.innerHTML = totalDiscount.toLocaleString();
    netTotalSpan.innerHTML = netTotal.toLocaleString();
    totalQuantitySpan.innerHTML = totalQuantity;
    totalProfitSpan.innerHTML = 
    (netTotal - totalBuy).toLocaleString().replace(/\d/g, d => digitToLetter[d]);
    totalDeliverySpan.innerHTML = totalDelivery;
};

const targettedInvoiceId = localStorage.getItem('targettedInvoiceId');
tableTbody.addEventListener('click', async (e) => {
  const ballIconElemMatch = e.target.matches('.status-icon-td') || e.target.matches('.ballIcon');
  const targettedInvoiceId = parseInt(e.target.closest('tr').querySelector('td.invoice-id-td').innerHTML);
  if (!e.target.classList.contains('delete-icon') && !e.target.classList.contains('order-td') &&  !e.target.closest('input') && !ballIconElemMatch) {
    sessionStorage.setItem('tableScrollTop', tableDiv.scrollTop);
    sessionStorage.setItem('hidingcheckIcon', hidingcheckIcon.classList);
    localStorage.setItem('targettedInvoiceId', targettedInvoiceId);
    localStorage.setItem('searchInpVal', searchInp.value.trim());
    const filters = {
      search: searchInp.value,
      priceSelect: priceSelect.value,
      deliverySelect: deliverySelect.value,
      customerInp: customerInp.value,
      deliveryInp: deliveryInp.value,
      workerInp: workerInp.value,
      pageInp: pageInp.value,
      startDateInp: startDateInp.value,
      endDateInp: endDateInp.value
    };
    sessionStorage.setItem('pos-filters', JSON.stringify(filters));
    // Trigger the animation before navigating
    document.body.classList.add('animate-out');
    // Wait for the animation to complete, then navigate
    setTimeout(() => {
      window.location.href = 'invoiceedit.html';
    }, 200); // Match this delay with the animation duration
  } else if (e.target.classList.contains('delete-icon')) {
    if (e.target.closest('tr').querySelector('td.status-td').innerHTML === 'Paid') {
      Toastify({
        text: `You must cancel the invoice then can delete it`,
        duration: 3000,
        gravity: 'top', // or 'top'
        position: 'center', // or 'right', 'center'
        style: {
          background: 'Brown',
          borderRadius: '10px',
        },
        stopOnFocus: true,
      }).showToast();
      return;
    }
    const result = await Swal.fire({
      title: "Delete this invoice!",
      text: "You won't be able to undo this action!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      customClass: {
        popup: 'custom-popup',
      },
    });
    if (result.isConfirmed) {
      const targetInvoiceId = parseInt(e.target.closest('tr').querySelector('.invoice-id-td').innerHTML);
      e.target.closest('tr').remove();
      await fetch(`${serverIP}/posinvoices/${targetInvoiceId}`, {method: 'DELETE'})
      updateTotal();
      Toastify({
        text: `Removed successfully!`,
        duration: 2000,
        gravity: 'top', // or 'top'
        position: 'center', // or 'right', 'center'
        style: {
          background: 'rgb(78, 188, 164)',
          borderRadius: '10px',
        },
        stopOnFocus: true,
      }).showToast();
    }
    } else if (e.target.classList.contains('order-td')) {
      const newInp = document.createElement('input');
      newInp.className = 'order-inp';
      const oldVal = e.target.innerHTML;
      e.target.innerHTML = '';
      e.target.appendChild(newInp);
      newInp.value = oldVal;
      const rowETarget = e.target;
      newInp.select();
      newInp.focus();
      newInp.addEventListener('blur', async function () {
        if (newInp.value.trim() === '' || isNaN(newInp.value.trim())){ rowETarget.innerHTML = oldVal; return};
        await fetch(`${serverIP}/posinvoices/${targettedInvoiceId}`, {
        method:'PUT',
        headers:{'Content-Type': 'application/json'},
        body: JSON.stringify({
          orders: newInp.value.trim()
        })
      })
      rowETarget.innerHTML = newInp.value.trim();
      updateTotal();
      })

      newInp.addEventListener('keydown', function(e) {if (e.key === 'Enter') newInp.blur()})
    }
});

searchInp.addEventListener('input', function() {
  fetchPosInvoices();
  cleanerInpIcon.style.display = searchInp.value.trim() !== '' ? 'block' : 'none';
});

cleanerInpIcon.addEventListener('click', function() {
  this.style.display = 'none';
  searchInp.value = '';
  searchInp.focus();
  fetchPosInvoices();
})

let index = -1;
let isAllCustomersFetched;
customerInp.addEventListener('click', function (e) {
  inputContainerDiv.style.display = '';
  !isAllCustomersFetched ? fetchCustomers() : '';
  isAllCustomersFetched = true;
})

let isDeliveryFetched;
deliveryInp.addEventListener('click', function (e) {
  deliveryInputContainerDiv.style.display = '';
  !isDeliveryFetched ? fetchDeliveries() : '';
  isDeliveryFetched = true;
})

let isAllWorkersFetched;
workerInp.addEventListener('click', function (e) {
  workerInputContainerDiv.style.display = '';
  !isAllWorkersFetched ? fetchWorkers() : '';
  isAllWorkersFetched = true;
})

// hide the customer dropdown
document.body.addEventListener('click', function (e) {
  if (!e.target.matches('.customer-inp') && !e.target.matches('.customerRemoveIcon')) { 
    inputContainerDiv.style.display = 'none';
    Array.from(deliveryCustomDropdwon.children).forEach(span => span.style.backgroundColor = '');
    Array.from(customDropdwon.children).forEach(span => span.style.backgroundColor = '');
    Array.from(workerCustomDropdwon.children).forEach(span => span.style.backgroundColor = '');
    index = -1;
  }
})
// hide the delivery dropdown
document.body.addEventListener('click', function (e) {
  if (!e.target.matches('.delivery-inp') && !e.target.matches('.deliveryRemoveIcon')) { 
    deliveryInputContainerDiv.style.display = 'none';
    Array.from(deliveryCustomDropdwon.children).forEach(span => span.style.backgroundColor = '');
    Array.from(customDropdwon.children).forEach(span => span.style.backgroundColor = '');
    Array.from(workerCustomDropdwon.children).forEach(span => span.style.backgroundColor = '');
    index = -1;
  }
})
// hide the worker dropdown
document.body.addEventListener('click', function (e) {
  if (!e.target.matches('.worker-inp') && !e.target.matches('.workerRemoveIcon')) { 
    workerInputContainerDiv.style.display = 'none';
    Array.from(deliveryCustomDropdwon.children).forEach(span => span.style.backgroundColor = '');
    Array.from(customDropdwon.children).forEach(span => span.style.backgroundColor = '');
    Array.from(workerCustomDropdwon.children).forEach(span => span.style.backgroundColor = '');
    index = -1;
  }
})

const fetchedCustomers = new Map();
async function fetchCustomers() {
  const customerListArray = [];
  if (!fetchedCustomers.has(1) && !fetchedCustomers.has(2)) {
    const response = await fetch(`${serverIP}/customers`);
    const customers = await response.json();
    fetchedCustomers.set(1, customers);
    fetchedCustomers.set(2, customerListArray);
  }
  const customers = fetchedCustomers.get(1);
  customers.forEach(customer => {
    const newSpan = document.createElement('span');
    newSpan.className = 'customer-span';
    newSpan.innerHTML = customer.name;
    newSpan.setAttribute('data-id', customer.id);
    customDropdwon.appendChild(newSpan);
    customerListArray.push(newSpan)

    newSpan.addEventListener('click', (e) => {
      const customerName = e.target.innerHTML;
      clickSpan(e, customerName, customerInp, inputContainerDiv, removeIcon);
    })
  })
}

const fetchedDelieveries = new Map();
async function fetchDeliveries() {
  const deliveryListArray = [];
  if (!fetchedDelieveries.has(1) && !fetchedDelieveries.has(2)) {
    const response = await fetch(`${serverIP}/deliveries`);
    const getResp = await response.json();
    const deliveries = getResp.deliveries;
    fetchedDelieveries.set(1, deliveries);
    fetchedDelieveries.set(2, deliveryListArray);
  }
  const deliveries = fetchedDelieveries.get(1);
  deliveries.forEach(delivery => {
    const newSpan = document.createElement('span');
    newSpan.className = 'customer-span';
    newSpan.innerHTML = delivery.name;
    newSpan.setAttribute('data-id', delivery.id);
    deliveryCustomDropdwon.appendChild(newSpan);
    deliveryListArray.push(newSpan)

    newSpan.addEventListener('click', (e) => {
      const deliveryName = e.target.innerHTML;
      clickSpan(e, deliveryName, deliveryInp, deliveryInputContainerDiv, deliveryRemoveIcon);
    })
  })
}

const fetchedWorkers = new Map();
async function fetchWorkers() {
  const workerListArray = [];
  if (!fetchedWorkers.has(1) && !fetchedWorkers.has(2)) {
    const response = await fetch(`${serverIP}/workers`);
    const workers = await response.json();
    fetchedWorkers.set(1, workers);
    fetchedWorkers.set(2, workerListArray);
  }
  const workers = fetchedWorkers.get(1);
  workers.forEach(worker => {
    const newSpan = document.createElement('span');
    newSpan.className = 'customer-span';
    newSpan.innerHTML = worker.name;
    newSpan.setAttribute('data-id', worker.id);
    workerCustomDropdwon.appendChild(newSpan);
    workerListArray.push(newSpan)

    newSpan.addEventListener('click', (e) => {
      const workerName = e.target.innerHTML;
      clickSpan(e, workerName, workerInp, workerInputContainerDiv, workerRemoveIcon);
    })
  })
}

customerInp.addEventListener('input', () => {
  Array.from(customDropdwon.children).forEach(span => span.style.backgroundColor = '');
  index = -1;
  searchCustomers()
})

deliveryInp.addEventListener('input', () => {
  Array.from(deliveryCustomDropdwon.children).forEach(span => span.style.backgroundColor = '');
  index = -1;
  searchDeliveries()
})

workerInp.addEventListener('input', () => {
  Array.from(workerCustomDropdwon.children).forEach(span => span.style.backgroundColor = '');
  index = -1;
  searchWorkers();
})

customerInp.addEventListener('keydown', (e) => {heilightArrow (e, customDropdwon, customerInp, inputContainerDiv, removeIcon)});

deliveryInp.addEventListener('keydown', (e) => {heilightArrow (e, deliveryCustomDropdwon, deliveryInp, deliveryInputContainerDiv, deliveryRemoveIcon)});

workerInp.addEventListener('keydown', (e) => {heilightArrow (e, workerCustomDropdwon, workerInp, workerInputContainerDiv, workerRemoveIcon)});

function heilightArrow (e, customDropdwon, customerInp, inputContainerDiv, removeIcon) {
  const brandArray2 = Array.from(customDropdwon.children);
  if (!brandArray2.length) return; // Exit if no items

  // Remove previous highlight
  if (index >= 0) brandArray2[index].style.backgroundColor = '';

  if (e.key === 'ArrowDown') {
    index = Math.min(index + 1, brandArray2.length - 1); // Ensure it doesn't go beyond the last item
  } else if (e.key === 'ArrowUp') {
    index = Math.max(index - 1, -1); // Ensure it doesn't go below -1
  } else if (e.key === 'Enter') {
    const customerName = brandArray2[index].innerHTML;
    clickSpan(e, customerName, customerInp, inputContainerDiv, removeIcon);
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
};

function clickSpan(e, customerName, customerInp, inputContainerDiv, removeIcon) {
  customerInp.value = customerName;
  inputContainerDiv.style.display = 'none';
  removeIcon.style.display = '';
  fetchPosInvoices();
}

removeIcon.addEventListener('click', function () {
  this.style.display = 'none';
  customerInp.value = '';
  searchCustomers()
  customerInp.focus();
  Array.from(customDropdwon.children).forEach(span => span.style.backgroundColor = '');
  index = -1;
  fetchPosInvoices();
})

deliveryRemoveIcon.addEventListener('click', function () {
  this.style.display = 'none';
  deliveryInp.value = '';
  searchDeliveries()
  deliveryInp.focus();
  Array.from(deliveryCustomDropdwon.children).forEach(span => span.style.backgroundColor = '');
  index = -1;
  fetchPosInvoices();
})

workerRemoveIcon.addEventListener('click', function () {
  this.style.display = 'none';
  workerInp.value = '';
  searchWorkers()
  workerInp.focus();
  Array.from(workerCustomDropdwon.children).forEach(span => span.style.backgroundColor = '');
  index = -1;
  fetchPosInvoices();
})

// Search customers function
function searchCustomers() {
  const searchValue = customerInp.value.trim().toLowerCase();
  const filteredArray = fetchedCustomers.get(2).filter(span => {
    return span.innerHTML.toLowerCase().includes(searchValue);
  })
  const mappedArray = filteredArray.map(span => {
    return {HTML: span.innerHTML, id: span.getAttribute('data-id')}
  });
  const sorted = sortItem(searchValue, mappedArray, 'HTML');
  const sortedNames = sorted.map(name => {  
    const span = document.createElement('span'); span.innerHTML = name.HTML; span.className = 'customer-span';
    span.setAttribute('data-id', name.id);
    span.addEventListener('click', (e) => {
      const customerName = e.target.innerHTML;
      clickSpan(e, customerName, customerInp, inputContainerDiv, removeIcon);
    })
    return span;
  });
  customDropdwon.innerHTML = '';
  sortedNames.forEach(span => {customDropdwon.appendChild(span)});
}

// Search deliveries function
function searchDeliveries() {
  const searchValue = deliveryInp.value.trim();
  const filteredArray = fetchedDelieveries.get(2).filter(span => {
    return span.innerHTML.toLowerCase().includes(searchValue.toLowerCase());
  })
  deliveryCustomDropdwon.innerHTML = '';
  filteredArray.forEach(span => {deliveryCustomDropdwon.appendChild(span)});
}

// Search workers function
function searchWorkers() {
  const searchValue = workerInp.value.trim();
  const filteredArray = fetchedWorkers.get(2).filter(span => {
    return span.innerHTML.toLowerCase().includes(searchValue.toLowerCase());
  })
  workerCustomDropdwon.innerHTML = '';
  filteredArray.forEach(span => {workerCustomDropdwon.appendChild(span)});
}

hidingcheckIcon.addEventListener('click', function() {
  this.classList.toggle('fa-circle-check');
  this.classList.toggle('fa-circle');
  fetchPosInvoices();
})

function getLatestDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(today.getDate()).padStart(2, '0');

  // Format the date as YYYY-MM-DD
  const formattedDate = `${year}-${month}-${day}`;
  return formattedDate;
}

function getTwoMonthsAgo(dateString) {
  // Convert the input date string to a Date object
  const date = new Date(dateString);
  
  // Subtract 2 months
  date.setDate(date.getDate() - 10);

  // Format the date as YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

window.addEventListener('DOMContentLoaded', () => {
  const showToast = localStorage.getItem('showLoanToast');
  if (showToast === 'true') {
    Toastify({
      text: `Loan added!`,
      duration: 2000,
      gravity: 'top',
      position: 'center',
      style: {
        background: 'rgb(78, 188, 164)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
    localStorage.removeItem('showLoanToast'); // Clean up after showing
  }
});

const totalProfitSpan = document.querySelector('.total-profit-span');
totalProfitSpan.addEventListener('click', function() {
  if (!isNaN(this.innerHTML.replace(/,/g, ''))) return;
  const newInp = document.createElement('input');
  const profitAmount = this.innerHTML;
  this.innerHTML = '';
  this.appendChild(newInp);
  newInp.focus();
  newInp.className = 'profit-input';
  newInp.type = 'password';
  newInp.addEventListener('blur', function() {
    if (newInp.value.trim() === '344841') {
      totalProfitSpan.innerHTML = profitAmount
      .replace(/Z/g, '0')
      .replace(/O/g, '1')
      .replace(/T/g, '2')
      .replace(/E/g, '3')
      .replace(/F/g, '4')
      .replace(/P/g, '5')
      .replace(/S/g, '6')
      .replace(/H/g, '7')
      .replace(/A/g, '8')
      .replace(/N/g, '9');

      setTimeout(() => {
        totalProfitSpan.innerHTML = profitAmount
      }, 5000);
    }
    else totalProfitSpan.innerHTML = profitAmount;
  })

  newInp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') newInp.blur();
  })
})

priceSelect.addEventListener('change', function() {
  fetchPosInvoices();
})

deliverySelect.addEventListener('change', function() {
  fetchPosInvoices();
})

document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', (e) => {
    const nextPage = link.href;
    sessionStorage.removeItem('pos-filters');
  });
});

const totalQuantitySpan = document.querySelector('.quantity-span');
totalQuantitySpan.addEventListener('click', async function() {await fetchStockInvs(); fetchPosInvoices(); totalProfitSpan.style.display = ''});

searchInp.addEventListener('keydown', async function(e) {
  if (e.key === 'Enter' && e.shiftKey) {
    console.log('yes')
    const resp = await fetch(`${serverIP}/replaceNewPosInvs`);
    const getRes = await resp.json();
    if (getRes.success) alert('All done')
      else alert('Not successful')
  }
})