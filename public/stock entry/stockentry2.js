const stockentryTableTbody = document.querySelector('.stock-entry-table').getElementsByTagName('tbody')[1];
const addStockentryButt = document.querySelector('.add-stock-entry');
const newRow = stockentryTableTbody.insertRow();
const initialTableTbodyArrey = [];
const inpValResetterIcon = document.querySelector('.fa-times-circle');
const tableDiv = document.querySelector('.table-div');
const searchInp = document.querySelector('.search-inp');

window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('stock-filters') || false;
  if (saved) {
    const filters = JSON.parse(saved);
    searchInp.value = filters.search || '';
  }
  fethcStockInvs();
});

if (performance.getEntriesByType("navigation")[0].type === "reload") {
  sessionStorage.removeItem('stock-filters');
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
  window.location.reload();
  }
});

addStockentryButt.addEventListener('click', () => {
  document.body.classList.add('animate-out');
  setTimeout(() => {
    window.location.href = 'newstockentry.html';
  }, 200)
});

stockentryTableTbody.addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete-icon')) {
    const row = e.target.closest('tr');
    const invoiceId = Number(Array.from(row.children)[1].innerHTML);
    const invoiceStatus = row.querySelector('.invoice-status').innerHTML;
    if (invoiceStatus === 'Submitted') {
      Toastify({
        text: `You must cancel this invoice then delete it`,
        duration: 4000,
        gravity: 'top', // or 'top'
        position: 'center', // or 'right', 'center'
        style: {
          background: 'rgb(154, 59, 59)',
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
      const response = await fetch(`${serverIP}/items-updateAndDeleteStock?stockInvId=${invoiceId}`, {method: 'DELETE'});
      const invoResp = await response.json();
      if (invoResp.used === 'used') {
        return Toastify({
          text: `You can't delete this invoice, because it's used, you must return its items then can delete it.`,
          duration: 5000,
          gravity: 'top', // or 'top'
          position: 'center', // or 'right', 'center'
          style: {
            background: 'rgb(154, 59, 59)',
            borderRadius: '10px',
          },
          stopOnFocus: true,
        }).showToast();
      }
      if (invoResp.invoice === 'AlrDeleted') {
        Toastify({
          text: `This invoice is already deleted!`,
          duration: 5000,
          gravity: 'top', // or 'top'
          position: 'center', // or 'right', 'center'
          style: {
            background: 'rgb(177, 46, 37)',
            borderRadius: '10px',
          },
          stopOnFocus: true,
        }).showToast();
        return updateTotal();
      }
      Toastify({
        text: `Successfully deleted!`,
        duration: 2000,
        gravity: 'top', // or 'top'
        position: 'center', // or 'right', 'center'
        style: {
          background: 'rgb(37, 177, 98)',
          borderRadius: '10px',
        },
        stopOnFocus: true,
      }).showToast();
      row.remove();
    }

  } else if (!e.target.classList.contains('delete-icon')) {
    const invoiceId = e.target.closest('tr').querySelector('td.id-td').innerHTML;
    localStorage.setItem('currentInvoiceId', invoiceId);
    sessionStorage.setItem('stockTableScrollPosition', tableDiv.scrollTop);
    document.body.classList.add('animate-out');
    localStorage.setItem('searchInpVal', searchInp.value.trim());
    const invStatus = e.target.closest('.new-row').querySelector('.invoice-status').innerHTML;
    localStorage.setItem('invoiceStatus', invStatus)
    const filters = {
      search: searchInp.value,
    };
    sessionStorage.setItem('stock-filters', JSON.stringify(filters));
    setTimeout(() => {
      window.location.href = 'stockentryedit.html';
    }, 200)
  }
});

searchInp.focus();
searchInp.addEventListener('input', function() {
  inpValResetterIcon.style.display = 'block';
  fethcStockInvs();
  if (this.value === '') inpValResetterIcon.style.display = 'none';
});

function useLoadingIcon() {
 stockentryTableTbody.innerHTML = `
  <div class="spinner-container">
    <div class="spinner"></div>
  </div>
  `
}

let latestFetchId = 0;
async function fethcStockInvs() {
  const thisFetchId = ++latestFetchId;
  useLoadingIcon();
  const searVal = searchInp.value.trim().toLocaleLowerCase();
  const response = await fetch(`${serverIP}/stockentinvs-items?searVal=${searVal}`);
  const stockResp = await response.json();
  if (thisFetchId !== latestFetchId) return;
  stockentryTableTbody.innerHTML = '';
  const invoices = stockResp.stockInvs;
  const stockItems = stockResp.stockItems;
  initialTableTbodyArrey.length = 0;
  invoices.sort((a, b) => b.id - a.id);
  invoices.forEach((invoice, index) => {
    let total = 0;
    const invId = invoice.id;
    invoice.items = stockItems.filter(i => i.inv_id === invId);
    invoice.items.forEach(item => {
      total += item.buyPrice * item.quantity
    })
    const newRow = stockentryTableTbody.insertRow();
    newRow.className = 'new-row'
    newRow.innerHTML = `
    <td class="order-num-td">${index + 1}</td>
    <td class="id-td">${invoice.id}</td>
    <td class="sku-td">${invoice.sku === null ? '' : invoice.sku}</td>
    <td class="total-iqd-td">${total.toLocaleString()}</td>
    <td class="time-td">${invoice.nowDate}</td>
    <td class="invoice-status">${invoice.invStatus}</td>
    <td class="status-icon"><i class="fas fa-circle"></i></td>
    <td><i class="fas fa-trash delete-icon"></i></td>
    `;
    if (newRow.querySelector('.invoice-status').innerHTML === 'Pending') {
      newRow.querySelector('.status-icon').style.color = 'rgb(23, 85, 239)';
    } else if (newRow.querySelector('.invoice-status').innerHTML === 'Submitted') {
      newRow.querySelector('.status-icon').style.color = 'rgb(25, 225, 95)';
    } else if (newRow.querySelector('.invoice-status').innerHTML === 'Canceled') {
      newRow.querySelector('.status-icon').style.color = 'orange';
    };
    const InvoiceItemList = [];
    invoice.items.forEach(item => InvoiceItemList.push(item))
    initialTableTbodyArrey.push({
      row: newRow,
      itemList: InvoiceItemList
    });
  });
  tableDiv.scrollTop = sessionStorage.getItem('stockTableScrollPosition');
  sessionStorage.removeItem('stockTableScrollPosition');
  updateTotal();
  if (searchInp.value !== '') inpValResetterIcon.style.display = 'block';
}

function updateTotal() {
  let totalBaught = 0;
  let totalOnWay = 0;
  Array.from(stockentryTableTbody.children).forEach(row => {
    const totalIQDRow = parseFloat(row.querySelector('.total-iqd-td').innerHTML.replace(/,/g, ''));
    const status = row.querySelector('.invoice-status').innerHTML;
    if (status !== 'Pending') {totalBaught += totalIQDRow;}
    if (status === 'Pending') {totalOnWay += totalIQDRow;}
  });
  document.querySelector('.total-baught-span').innerHTML = totalBaught.toLocaleString();
  document.querySelector('.total-on-way-span').innerHTML = totalOnWay.toLocaleString();
}

inpValResetterIcon.addEventListener('click', function() {
  searchInp.value = '';
  this.style.display = 'none';
  fethcStockInvs();
  searchInp.focus();
})

const isInvoiceSubmitted = localStorage.getItem('isInvoiceSubmitted');
if (isInvoiceSubmitted) {
  Toastify({
    text: `Invoice Submitted!`,
    duration: 2000,
    gravity: 'top', // or 'top'
    position: 'center', // or 'right', 'center'
    style: {
      background: 'rgb(61, 183, 138)',
      borderRadius: '10px',
    },
    stopOnFocus: true,
  }).showToast();
  localStorage.removeItem('isInvoiceSubmitted');
}

document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', (e) => {
    const nextPage = link.href;
    sessionStorage.removeItem('stock-filters');
  });
});

searchInp.addEventListener('keydown', async function(e) {
  if (!(e.key === 'Enter' && e.shiftKey)) return;
  const response = await fetch(`${serverIP}/replaceNewStockInvs`);
  const getRes = await response.json();
  const success = getRes.success;
  if (success) alert('All Done')
    else alert('not successful')
})