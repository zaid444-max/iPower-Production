const currentCustomerId = localStorage.getItem('currentCustomerId');
const customerName = localStorage.getItem('customerName');
const tableTbody = document.querySelector('.table-tbody');
const allCustomerLoansArray = [];
const startIndexInp = document.querySelector('.start-index-inp');
const endIndexInp = document.querySelector('.end-index-inp');
let scrollPosition;
localStorage.removeItem('searchInpVal');
const languageSelect = document.querySelector('.langause-select');
const castomerNameDiv = document.querySelector('.customer-name-div');
castomerNameDiv.innerHTML = customerName;
const balanceSpan = document.querySelector('.balance-span');
const tableDiv = document.querySelector('.edit-table-div');
const searchinp = document.querySelector('.loanedit-search-inp');
const workerNamesDiv = document.querySelector('.worker-names-div');

if (performance.getEntriesByType("navigation")[0].type === "reload") {
  sessionStorage.removeItem('searchLoanVal');
}

window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('loanEdit-filters');
  if (saved) {
    const filters = JSON.parse(saved);
    startIndexInp.value = filters.startIndexInp || '';
    endIndexInp.value = filters.endIndexInp || '';
  }
});

if (performance.getEntriesByType("navigation")[0].type === "reload") {
  sessionStorage.removeItem('loanEdit-filters');
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

const searVal = sessionStorage.getItem('searchLoanVal') || '';
searchinp.value = searVal;

let isHeld = false;
const handshakeIcon = document.querySelector('.fa-handshake');
handshakeIcon.addEventListener('click', async () => {
  isInvoiceInfAdded = false
  if (isHeld) return;
  const response = await fetch(`${serverIP}/loans-and-get?curCustId=${currentCustomerId}&amount=0`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      invoiceNum: null,
      note: '',
      customer_id: currentCustomerId,
      worker_id: setWorker()
    })
  })
  const addedLoanRes = await response.json();
  const custLoans = addedLoanRes.allCustLoans;
  fetchLoans(custLoans);
})

let holdTimer;
handshakeIcon.addEventListener('mousedown', function() {
  isHeld = false;
  holdTimer = setTimeout(async () => {
    isHeld = true;
    const response = await fetch(`${serverIP}/loans-and-get-all?curCustId=${currentCustomerId}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        invoiceNum: null,
        note: 'All Paid',
        customer_id: currentCustomerId,
        worker_id: setWorker()
      })
    })
    const addedLoanRes = await response.json();
    const custLoans = addedLoanRes.allCustLoans;
    fetchLoans(custLoans);
  }, 500);
})

handshakeIcon.addEventListener('mouseup', function() {
  clearTimeout(holdTimer); // Cancel if released early
  setTimeout(() => {isHeld = false}, 50)
});

handshakeIcon.addEventListener('mouseleave', function() {
  clearTimeout(holdTimer);
});

handshakeIcon.addEventListener('touchstart', function() {
  holdTimer = setTimeout(async () => {
    isHeld = true;
    const response = await fetch(`${serverIP}/loans-and-get-all?curCustId=${currentCustomerId}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        invoiceNum: null,
        note: 'All Paid',
        customer_id: currentCustomerId,
        worker_id: setWorker()
      })
    });
    const addedLoanRes = await response.json();
    const custLoans = addedLoanRes.allCustLoans;
    fetchLoans(custLoans);
  }, 500);
}, { passive: true });

handshakeIcon.addEventListener('touchend', function() {
  clearTimeout(holdTimer);
  setTimeout(() => { isHeld = false }, 50);
});

handshakeIcon.addEventListener('touchcancel', function() {
  clearTimeout(holdTimer);
});

let isPosInvsfetched = false;
let allItems;
let isAllWorkers = false;
let isWorkersFetched;
async function fetchLoansOnce() {
  tableTbody.innerHTML = `
  <div class="spinner-container">
    <div class="spinner loanEdit-spinner"></div>
  </div>
  `
  let searVal = searchinp.value.trim().toLowerCase();
  const response = await fetch(`${serverIP}/loans-SelPosInvs/${currentCustomerId}?searVal=${searVal}`);
  const getresp = await response.json();
  const loans = getresp.loans;
  const workers = getresp.workers;
  if (!isWorkersFetched) fetchWorkers(workers);
  fetchLoans(loans);
}

fetchLoansOnce();

let iaAllPaid;
function fetchLoans(loans) {
  iaAllPaid = false;
  tableTbody.innerHTML = '';
  allCustomerLoansArray.length = 0;
  loans.sort((a, b) => b.id - a.id);
  for(const [index, loan] of loans.entries()) {
    const invStatus = loan?.invStatus;
    const statColor = invStatus === 'Paid' ? 'rgb(32, 190, 90);' :
    invStatus === 'Canceled' ? 'rgb(206, 181, 58)' :
    invStatus === 'Canceled2' ? 'rgb(237, 46, 46)' : '';
    const amountColor = loan.amount.includes('-') ? 'rgb(237, 46, 46)' : '';
    const newRow = document.createElement('tr');
    newRow.className = 'edit-new-row';
    newRow.innerHTML = `
    <td class="id-td">${loan.id}</td>
    <td class="index-td">${index + 1}</td>
    <td class="date-time-td" onclick="changeToOtherTime(${loan.id}, event)">${changLangs(loan.posNowDate) || changLangs(loan.loanNowDate)}</td>
    <td class="worker-td">
    <select class="worker-select" onchange="changeWork(event, ${loan.id})">
    </select>
    </td>
    <td class="amount-td" onclick="editLoan(event, 'number', 'amount')" style="color: ${amountColor};">
    ${Number(loan.amount).toLocaleString()}
    </td>
    <td class="checkBox-td">
    <input type="checkbox" class="paid-checkbox" ${Number(loan.oldAmount) !== 0 ? 'checked' : ''}>
    <span class="checkBox-span">${loan.oldAmount === '0.000' ? '' : Number(loan.oldAmount).toLocaleString()}</span>
    </td>
    <td class="invoice-num-td" onclick="enterInvoice(event)" 
    onmouseover="displayItems(${loan.invoiceNum}, 'loanedit-search-inp', 'loanEdit')" onmouseleave="hideItems()">
    ${loan.invoiceNum === null ? '#': '#' + loan.invoiceNum}</td>
    <td class="ballIcon-td">
      ${loan.invoiceNum === null ? '' : `<i class="fas fa-circle ballIcon" style="color: ${statColor};" onclick="displayItems(${loan.invoiceNum}, 'loanedit-search-inp', 'loanEdit')"></i>`}
    </td>
    <td class="invoice-inf-td"></td>
    <td class="note-td" onclick="editLoan(event, 'text', 'note')">${loan.note}</td>
    <td class="bin-td"><i class="fas fa-trash" onclick="deleteLoan(${loan.id}, event)"></i></td>
    `;
    const workSel = newRow.querySelector('.worker-select');
    workerNamesDiv.querySelectorAll('.worker-span').forEach(span => {
      const option = document.createElement('option');
      option.value = span.innerHTML;
      if (span.innerHTML === 'Unknown') option.value = '';
      option.innerHTML = span.innerHTML;
      option.setAttribute('data-id', span.getAttribute('data-id'));
      workSel.appendChild(option)
    })
    workSel.value = loan.name;
    const note = newRow.querySelector('.note-td').innerHTML;
    if (note === 'All Paid') iaAllPaid = true;
    hightlightRow(newRow);
    tableTbody.appendChild(newRow);
    allCustomerLoansArray.push(newRow);
    hightlightRow(newRow);
    if (newRow.querySelector('.invoice-num-td').innerHTML.replace(/\D/g, '') !== '') {
      newRow.querySelector('.invoice-num-td').style.color = 'rgb(208, 171, 62)';
      newRow.querySelector('.invoice-num-td').style.textDecoration  = 'underline';
    }
    const id = newRow.querySelector('.id-td').innerHTML;
    newRow.querySelector('.paid-checkbox').addEventListener('change', async function() {
      if (newRow.style.backgroundColor !== '') return;
      if (newRow.querySelector('.amount-td').innerHTML.includes('-')) {this.checked = false; return alert(`can't do that on paid loan.`)}
      const response = await fetch(`${serverIP}/payLoan/${id}?checkBox=${this.checked}&resetter=${setWorker()}`);
      const getresp = await response.json();
      const oldAmount = Number(getresp.loan.amount).toLocaleString();
      const amount = Number(getresp.loan.oldAmount).toLocaleString();
      if (getresp.success === 'already paid') {
        newRow.querySelector('.amount-td').innerHTML = oldAmount;
        newRow.querySelector('.checkBox-td .checkBox-span').innerHTML = amount === '0' ? '' : amount;
        updateTotal();
        return alert('already paid');
      } else if (getresp.success === 'already canceled') {
        newRow.querySelector('.amount-td').innerHTML = oldAmount;
        newRow.querySelector('.checkBox-td .checkBox-span').innerHTML = amount === '0' ? '' : amount;
        updateTotal();
        return alert('already canceled');
      }
      newRow.querySelector('.amount-td').innerHTML = oldAmount;
      newRow.querySelector('.checkBox-td .checkBox-span').innerHTML = amount === '0' ? '' : amount;
      updateTotal();
    })
    newRow.querySelector('.paid-checkbox').addEventListener('click', function(event) {if (newRow.style.backgroundColor !== '') event.preventDefault()})
  }
  updateTotal();
  // Restore scroll
  if(localStorage.getItem('loanTableScrollPosition')) {
    tableDiv.scrollTop = localStorage.getItem('loanTableScrollPosition');
    localStorage.removeItem('loanTableScrollPosition');
  }
  if (scrollPosition) {
    tableDiv.scrollTop = scrollPosition;
    scrollPosition = '';
  }
  filterLoans();
}

async function changeWork(e, loanId) {
  const selElem = e.target;
  const selectedOpt = selElem.options[selElem.selectedIndex];
  const workerid = selectedOpt.getAttribute('data-id');
  fetch(`${serverIP}/loans/${loanId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      worker_id: workerid
    })
  })
}

function hightlightRow(newRow) {
  if (iaAllPaid) newRow.style.backgroundColor = 'rgb(22, 22, 22)';
}

let isTimeChanged = false;
const initialId = [];
async function changeToOtherTime(id, e) {
  const tarId = initialId.find(item => item.id === id);
  isTimeChanged = tarId ? tarId.isTimeChanged : false;
  const tarTimeTd = e.target.closest('.edit-new-row').querySelector('.date-time-td');
  const response = await fetch(`${serverIP}/loans-loanId/${id}`);
  const getresp = await response.json();
  const tarLoan = getresp[0];
  const firstTime = tarLoan.posNowDate || tarLoan.loanNowDate;
  const oldAmountTime = tarLoan.paidTime;
  if (!oldAmountTime) return alert('not available');
  if (!isTimeChanged) {
    tarTimeTd.innerHTML = changLangs(oldAmountTime);
    isTimeChanged = true;
    tarTimeTd.style.color = 'rgba(166, 135, 41, 1)';
  } else {
    tarTimeTd.innerHTML = changLangs(firstTime);
    isTimeChanged = false;
    tarTimeTd.style.color = '';
  }
  !tarId ? initialId.push({ id, isTimeChanged }) : tarId.isTimeChanged = isTimeChanged;

  displayToastify(`${tarLoan.name}`);
}

function updateTotal() {
  let totalBalance = 0;
  Array.from(tableTbody.children).forEach(row => {
    totalBalance += Number(row.querySelector('.amount-td').innerHTML.replace(/,/g, ''));
  })
  const balanceSpan = document.querySelector('.balance-span');
  balanceSpan.innerHTML = totalBalance.toLocaleString();
}

async function deleteLoan(id, e) {
  const row = e.target.closest('.edit-new-row');
  const note = row.querySelector('.note-td').innerHTML;
  if (row.style.backgroundColor !== '' && note !== 'All Paid') return alert(`You cant't delete this laon.`);
  const result = await Swal.fire({
    title: "Are you sure to delete it?",
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
    const loanId = id;
    const response = await fetch(`${serverIP}/loans-and-get/${loanId}?curCustId=${currentCustomerId}`, {method: 'DELETE'});
    scrollPosition = tableDiv.scrollTop;
    const deleResp = await response.json();
    const custLoans = deleResp.allCustLoans;
    fetchLoans(custLoans);
    updateTotal();
    Toastify({
      text: `Loan deleted!`,
      duration: 2000,
      gravity: 'top',
      position: 'center',
      style: {
        background: 'rgb(61, 183, 138)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
  }
}

async function editLoan(event, type, updatedField) {
  const inv = (updatedField === 'amount' && 
    event.target.closest('.edit-new-row').querySelector('.invoice-num-td').innerHTML.trim().replace('#', '') !== '');
  const AllPaidNote = (updatedField === 'note' && 
    event.target.closest('.edit-new-row').querySelector('.note-td').innerHTML === 'All Paid');
  const alreadypaid = (updatedField === 'amount' && event.target.closest('.edit-new-row').style.backgroundColor !== '');
  if (inv || AllPaidNote || alreadypaid) return alert(`You can't edit this`);
  const td = event.target;
  const loanId = td.closest('tr').querySelector('.id-td').innerHTML;
  const newInp = document.createElement('input');
  newInp.type = `${type}`;
  newInp.spellcheck = false;
  newInp.className = 'new-inp';
  const oldValue = td.innerHTML.replace(/,/g, '');
  td.innerHTML = '';
  newInp.value = oldValue;
  td.appendChild(newInp);
    newInp.addEventListener('keydown', (e) => {
      if (type === 'number' || type === 'invoiceNum') {
        newInp.style.width = '100px';
        if (['ArrowUp', 'ArrowDown', 'e', 'E'].includes(e.key)) {
          e.preventDefault();
        }
      }
      if (e.key === 'Enter') {
        newInp.blur();
      }
    })
  newInp.focus();
  newInp.select();
  newInp.addEventListener('blur', async () => {
    if (newInp.value.trim() === oldValue) {
      td.innerHTML = updatedField === 'note' ? oldValue : Number(oldValue).toLocaleString(); return
    }
    await fetch(`${serverIP}/loans/${loanId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        [updatedField]: newInp.value.trim().replace(/,/g, '')
      })
    })
    Toastify({
      text: `Loan Updated!`,
      duration: 1500,
      gravity: 'top', // or 'top'
      position: 'center', // or 'right', 'center'
      style: {
        background: 'rgb(61, 183, 138)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
    td.innerHTML = updatedField !== 'note' ? Number(newInp.value.trim().replace(/,/g, '')).toLocaleString() : newInp.value.trim().replace(/,/g, '');
    console.log(td)
    td.style.color = td.innerHTML.includes('-') ? 'rgb(237, 46, 46)' : '#19beab';
    updateTotal();
  })
}

function enterInvoice(event) {
  let searVal = searchinp.value.trim().toLowerCase();
  sessionStorage.setItem('searchLoanVal', searVal);
  const invoiceNum = (event.target.innerHTML.trim());
  const tarNum = invoiceNum.split('<i')[0].replace(/\D/g, '');
  if(tarNum === '') return;
  localStorage.setItem('targettedInvoiceId', tarNum);
      const filters = {
      startIndexInp: startIndexInp.value,
      endIndexInp: endIndexInp.value,
    };
    sessionStorage.setItem('loanEdit-filters', JSON.stringify(filters));
  document.body.classList.add('animate-out');
  setTimeout(() => {
    window.location.href = '../invoice/invoiceedit.html';
  }, 200);

  const scrollPosition = tableDiv.scrollTop;
  localStorage.setItem('loanTableScrollPosition', scrollPosition);
}

const broom = document.querySelector('.fa-broom');
broom.addEventListener('click', async function() {
  if (startIndexInp.value.trim() === '' && endIndexInp.value.trim() === '') {
    const result1 = await Swal.fire({
      title: "Delete all!",
      text: "You won't be able to undo this action!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete all!",
      cancelButtonText: "Cancel",
      customClass: {
        popup: 'custom-popup',
      },
    });
    if (result1.isConfirmed) {
      const response = await fetch(`${serverIP}/totalLoans/${currentCustomerId}`, {method: 'DELETE'});
      const toJson = await response.json();
      const loans = toJson.allCustLoans;
      fetchLoans(loans);
    }
  }
  if (startIndexInp.value.trim() !== '' && endIndexInp.value.trim() !== '') {
    const result2 = await Swal.fire({
      title: "Delete selected loans!",
      text: "You won't be able to undo this action!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete them!",
      cancelButtonText: "Cancel",
            customClass: {
        popup: 'custom-popup',
      },
    });
    if (result2.isConfirmed) {
      const ids = Array.from(tableTbody.children).map(row => row.querySelector('.id-td').innerHTML);
      const toStringifyId = JSON.stringify(ids);
      const response = await fetch(`${serverIP}/loans-selectedOnes?ids=${toStringifyId}&curCustId=${currentCustomerId}`, {method: 'DELETE'});
      const delResp = await response.json();
      const custLouns = delResp.allCustLoans;
      startIndexInp.value = '';
      endIndexInp.value = '';
      fetchLoans(custLouns);
    }
  }
})

function filterLoans() {
  if (startIndexInp.value === '') return;
  const filteredArray = allCustomerLoansArray.filter(row => {
    const startIndexInpVal = Number(startIndexInp.value.trim());
    const endIndexInpVal = Number(endIndexInp.value.trim());
    const rowIndex = Number(row.querySelector('.index-td').innerHTML);

    return rowIndex >= startIndexInpVal && endIndexInpVal >= rowIndex;
  })
  tableTbody.innerHTML = '';
  filteredArray.forEach(row => {tableTbody.appendChild(row);});
  updateTotal();
}

let isFilterLoansDone;
startIndexInp.addEventListener('keydown', function(e) {if (e.key === 'Enter') {endIndexInp.focus();endIndexInp.select()}});
endIndexInp.addEventListener('keydown', function(e) {if (e.key === 'Enter') {
  filterLoans();
  if (isFilterLoansDone) {endIndexInp.value.trim() !== '' ? createPDF() : createPDF(false);}
  isFilterLoansDone = true;
}})

endIndexInp.addEventListener('input', function() {isFilterLoansDone = false})

const RemoveIcon = document.querySelector('.RemoveIcon');
RemoveIcon.addEventListener('click', function() {
  tableTbody.innerHTML = '';
  allCustomerLoansArray.forEach(row => {tableTbody.appendChild(row)});
  updateTotal();
  isFilterLoansDone = false
})

async function oldCreatePDF2() {
  // Load jsPDFja
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  // Add Kurdish font
  doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", font);
  doc.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskh", "normal");
  doc.setFont("NotoNaskh");
  let customerLoans;
  const ids = Array.from(tableTbody.querySelectorAll('tr')).map(row => {
    const invNum = row.querySelector('.invoice-num-td').innerHTML.split('#')[1];
    return invNum;
  }).filter(Boolean);

  const idsToStringify = JSON.stringify(ids);
  const response = await fetch(`${serverIP}/selected-posinvoices?ids=${idsToStringify}&custId=${currentCustomerId}`);
  const InvResp = await response.json();
  customerLoans = InvResp.custLons;
  const selectedInvoices = InvResp.selectedInvs;
  for(const row of tableTbody.querySelectorAll('tr')) {
    const invoiceNum = Number(row.querySelector('.invoice-num-td').innerHTML.split('#')[1]);
    if (invoiceNum === 0) {continue};
    const invoice = selectedInvoices.find(inv => Number(inv.id) === invoiceNum);
    for(const item of invoice.items) {
      const newRow = document.createElement('tr');
      newRow.innerHTML = item;
      const itemQnt = newRow.querySelector('.quantity-td').innerHTML;
      const combinedItemText = (
        newRow.querySelector('.name-td').querySelector('.item-name-span').innerText.trim() + 
        ` {${newRow.querySelector('.quantity-td').innerText.trim()} PCS}` +
        ` {${(Number(newRow.querySelector('.price-td').innerText.trim().replace(' IQD', '')) * 1000).toLocaleString()}}` +
        `${itemQnt !== '1' ? (' {' + ((Number(newRow.querySelector('.price-td').innerText.trim().replace(' IQD', ''))) * Number(newRow.querySelector('.quantity-td').innerText.trim()) * 1000).toLocaleString() + '}') : ''}` +
        ','
      )
      row.querySelector('.invoice-inf-td').innerHTML += combinedItemText;
    }
  };

  // Get table reference
  const table = document.querySelector('table');
  const rows = Array.from(tableTbody.children);

  
  // Extract table data
  const tableData = [];
  rows.forEach(row => {
    const rowData = [];
    row.querySelectorAll('td').forEach(cell => {
      if (cell.matches('.id-td') || cell.matches('.index-td') || cell.matches('.delete-td')) return
      rowData.push(
        cell.matches('.amount-td') ? (parseFloat(cell.innerHTML.replace(/,/g, '')) * 1000).toLocaleString()  : 
        cell.innerText
      ); // Remove extra spaces
    });
    tableData.push(rowData);
  });
  const excludedClasses = ['id-th', 'order-num-th']; // Add more classes here
  const headers = Array.from(table.querySelectorAll('thead th'))
  .filter(th => !excludedClasses.some(cls => th.classList.contains(cls))) // Exclude matching elements
  .map(th => th.innerText.trim()); // Extract text

  const kurdish = languageSelect.value === 'Kurdish';
  const arabic = languageSelect.value === 'Arabic';

  const shopName = kurdish ? "پیشانگای ئایپاوەر" : arabic ? "محل ئايباور" : "iPower Shop";
  const Address = kurdish ? "هە ولیر کۆتری سە لام بینای شە هاب مۆڵ" : arabic ? "العنوان: أربيل كوتري سلام، مبنى شهـاب مول" : "Address: Erbil, Kotry Salam, Shahab Mall building";
  const customerName = kurdish ? 'ناوی کریار' : arabic ? 'اسم العميل' : 'Customer Name';
  const date = kurdish ? 'بە روار' : arabic ? 'التاريخ'  : 'Date';
  const currentBalance = kurdish ? 'حیسابی ئیستا' : arabic ? 'الحساب الحالي' : 'Current Balance';
  const TotalInvoiceAmount = kurdish ? 'کۆی گشتی ئە م وەسلانە' : arabic ? 'إجمالي مبلغ الفاتورة' : 'Total Invoice Amount';
  const rightUpperPosition = (kurdish || arabic) ? 142 : 15;
  const leftUpperPosition = (kurdish || arabic) ? 15 : 155;

  // Add shop information before the table
  doc.setFontSize(18);
  doc.text(shopName, 105, 10, { align: "center" }); // Centered title
  doc.setFontSize(11);
  doc.text(Address, 105, 16, { align: "center" });
  doc.text("Phone: 0751 845 4545 - 0750 344 6261", 105, 22, { align: "center" });
  doc.text((kurdish || arabic) ? `${castomerNameDiv.innerText} :${customerName}` : `${customerName}: ${castomerNameDiv.innerText}`, rightUpperPosition, 35);
  doc.text((kurdish || arabic) ? `${getLatestDate()} :${date}` : `${date}: ${getLatestDate()}`, leftUpperPosition, 30);
  doc.text(`${getLatestTime()}`, leftUpperPosition, 35);
  doc.save(`${castomerNameDiv.innerText}.pdf`);
  // Generate PDF table
  doc.autoTable({
    head: [headers],
    body: tableData,
    tableWidth: 'wrap', // or try 'auto'
    startY: 38, // Space from top
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2, textColor: [0, 0, 0]},
    headStyles: { textColor: [255, 255, 255] , fillColor: [162, 108, 255] },
    margin: { bottom: 30 }, // Reserve space for footer
    columnStyles: {
      3: { cellWidth: 'wrap' }
    },
    didParseCell: function (data) {
      if (data.column.index === 0) { data.cell.styles.cellWidth = 24; }
      if (data.column.index === 1) { 
        data.cell.styles.cellWidth = 24;
        const text = data.cell.text[0];
        if (text.includes('-')) data.cell.styles.textColor = 'red'}
      if (data.column.index === 2) { data.cell.styles.cellWidth = 21; }
      
      if (data.column.index === 3) { // 4th column (zero-based index)
          let text = data.cell.text[0]; // Get the text content
          let orderNum = 0;
          data.cell.text = text.split('},').map((line, index, arr) => {
            orderNum++;
              return index < arr.length - 1 ? `${orderNum}- ` + line.trim() + "}," : line.trim();
            });
          let maxLineLength = Math.max(...data.cell.text.map(line => line.length));
          
          const maxColumnWidth = 100; 
          data.cell.styles.cellWidth = Math.min(80 + (maxLineLength * 1.4), maxColumnWidth);
          data.cell.styles.fontSize = 9;
      }
      
      if (data.column.index === 4) { data.cell.styles.cellWidth = 15;}
      if (data.section === 'head' && data.column.index === 2) { // Third column (zero-based index)
        data.cell.styles.fontSize = 8; // Set font size for the third column header
      }
    },
    didDrawPage: function (data) {
      lastTableY = data.cursor.y; // Save last position of table
    },
    showHead: 'firstPage'
  });
  
  // Get final Y position after the table
  let finalY = lastTableY + 10; 
  let pageHeight = doc.internal.pageSize.height; 
  
  // If footer exceeds page, create a new page
  if (finalY + 30 > pageHeight) {  
    doc.addPage();
    finalY = 20; // Reset Y position for new page
  }
  let total = 0;
  customerLoans.forEach(loan => total += Number(loan.amount));
  // Add footer information **only once at the end**
  doc.text(`${TotalInvoiceAmount}: ${(Number(balanceSpan.innerHTML.replace(/,/g, '')) * 1000).toLocaleString()}`, rightUpperPosition, finalY);
  doc.text(`${currentBalance}: ${(total * 1000).toLocaleString()}`, rightUpperPosition, finalY + 6);

  // Save the PDF
  doc.save(`${castomerNameDiv.innerText}.pdf`); // Downloads as 'invoice.pdf'
}

async function createPDF(inclAll = true) {
  // Load jsPDFja
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  // Add Kurdish font
  doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", font);
  doc.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskh", "normal");
  doc.setFont("NotoNaskh");
  const kurdish = languageSelect.value === 'Kurdish';
  const arabic = languageSelect.value === 'Arabic';

  const shopName = kurdish ? "پیشانگای ئایپاوەر" : arabic ? "محل ئايباور" : "iPower Shop";
  const Address = kurdish ? "هە ولیر کۆتری سە لام بینای شە هاب مۆڵ" : arabic ? "العنوان: أربيل كوتري سلام، مبنى شهـاب مول" : "Address: Erbil, Kotry Salam, Shahab Mall building";
  const customerName = kurdish ? 'ناوی کریار' : arabic ? 'اسم العميل' : 'Customer Name';
  const date = kurdish ? 'بە روار' : arabic ? 'التاريخ'  : 'Date';
  const TotalInvoiceAmount = kurdish ? 'کۆی گشتی ئە م وە سلە' : arabic ? 'إجمالي مبلغ الفاتورة' : 'Total Invoice Amount';
  const currentBalance = kurdish ? 'حیسابی ئیستا' : arabic ? 'الحساب الحالي' : 'Current Balance';
  const targInvNum = kurdish ? 'ژمارە ی وەسل' : arabic ? 'رقم الفاتورة' : 'Invoice Number';
  const note = kurdish ? 'تیبینی' : arabic ? 'ملا‌حضة' : 'Note';
  const discount = kurdish ? 'داشکان' : arabic ? 'الخصم' : 'Discount';
  const loanStatus = kurdish ? 'دۆخی قە رز' : arabic ? 'حالة الدین' : 'Loan Status';
  const rightUpperPosition = (kurdish || arabic) ? 142 : 15;
  const leftUpperPosition = (kurdish || arabic) ? 15 : 155;

  // Add shop information before the table
  doc.setFontSize(18);
  doc.text(shopName, 105, 10, { align: "center" }); // Centered title
  doc.setFontSize(11);
  doc.text(Address, 105, 16, { align: "center" });
  doc.text("Phone: 0751 845 4545 - 0750 344 6261", 105, 22, { align: "center" });
  doc.text((kurdish || arabic) ? `${castomerNameDiv.innerText} :${customerName}` : `${customerName}: ${castomerNameDiv.innerText}`, rightUpperPosition, 30);
  doc.text((kurdish || arabic) ? `${getLatestDate()} :${date}` : `${date}: ${getLatestDate()}`, leftUpperPosition, 30);
  doc.text(`${getLatestTime()}`, leftUpperPosition, 35);

  function createLine(lastTableY, circle, color, startX1, endX1) {
    return;
    const startX = startX1;
    const endX = endX1;
    const lineY = lastTableY;
    const radius = 1.5; // Radius for rounded ends
    const lineWidth = 0.5;
    doc.setLineWidth(lineWidth);
    doc.setDrawColor(...color);
    doc.line(startX, lineY, endX, lineY);

    doc.setFillColor(...color);
    if (circle) {doc.circle(startX, lineY, radius, 'F');doc.circle(endX, lineY, radius, 'F');}
  }

  function createCircle(lastTableY) {
    return
    const x = 10;
    const y = lastTableY - 3;
    const radius = 4;

    doc.setDrawColor(48, 115, 173);     // Circle border color
    doc.setLineWidth(0.5);
    doc.circle(x, y, radius);      // Draw circle (outline only)

    doc.setFontSize(10);
    doc.text(`${orderNum}`, x, y + 1.3, { align: 'center' }); // Center text inside
  }

  function createBorder(startY, tableHeight) {
    // rgba(48, 180, 145, 1)
    doc.setDrawColor(34, 129, 104);// Black border
    doc.setLineWidth(1);      // Border thickness
    doc.roundedRect(3, startY, 204, tableHeight, 3, 3); // 3 is radius
  }

  function setBackgroundColor(text, x, y) {
    const textWidth = doc.getTextWidth(text);
    const textHeight = 8; // Approximate height based on font size
    const radius = 2; // Border radius
    'rgba(232, 232, 232, 1)'
    doc.setFillColor(232, 232, 232);
    doc.roundedRect(x - 2, y - textHeight + 3, textWidth + 4, textHeight, radius, radius, 'F');
    doc.setTextColor(0, 0, 0); // Text color
    doc.text(text, x, y);
  }

  let customerLoans;
  const ids = Array.from(tableTbody.querySelectorAll('tr')).map(row => {
    const invNum = row.querySelector('.invoice-num-td').innerHTML.split('#')[1];
    return invNum;
  }).filter(Boolean);
  const idsToStringify = JSON.stringify(ids);
  const response = await fetch(`${serverIP}/selected-posinvoices?ids=${idsToStringify}&custId=${currentCustomerId}`);
  const InvResp = await response.json();
  customerLoans = InvResp.custLons;
  const selectedInvoices = InvResp.selectedInvs;
  let lastTableY = 58;
  let orderNum = 0;
  for(const row of tableTbody.querySelectorAll('tr')) {
    if (row.style.backgroundColor === 'rgb(22, 22, 22)' && !inclAll) continue;
    const invoId = Number(row.querySelector('.invoice-num-td').innerHTML.replace('#', ''));
    const tarInv = selectedInvoices?.find(inv => inv.id === invoId);
    let netTotal = kurdish ? 'کۆی قە رز' : arabic ? 'المجموع' : 'Net Total'; // This variable shouild be created at this line or else it would be wrong.
    let addLoanStat = kurdish ? `قە رزی بردووە` : arabic ? `أخذ قرضًا` : 'took a loan';
    const tableBody = [];
    const date = row.querySelector('.date-time-td').innerHTML.split('<i')[0];
    const tarInvNetTotal = Number(row.querySelector('.amount-td').innerHTML.replace(/,/, '') * 1000).toLocaleString();
    if (tarInvNetTotal.includes('-')) {
      netTotal = kurdish ? 'کۆی پارە دان' : arabic ? 'المجموع الدفع' : 'Paid Amount';
      addLoanStat = kurdish ? `پارە ی داوە` : arabic ? `دفع مالاً` : 'paid money';
    } 
    const checkBox = row.querySelector('.checkBox-td .paid-checkbox');
    let paidStat = kurdish ? 'ماوە' : arabic ? 'غیر واصل' : 'not paid'; // It must be at this line.
    if (checkBox.checked === true || tarInv?.invStatus === 'Canceled2') paidStat = kurdish ? 'واسل کراوە' : arabic ? 'واصل' : 'paid';
    const redColor = tarInv?.invStatus.includes('Canceled') || checkBox.checked;
    if (tarInv) {
      addLoanStat = kurdish ? `ئە شیای بردووە` : arabic ? `أخذ مواد` : 'took an invoice';
      orderNum++;
      const tarInvDisc = Number(tarInv.discount * 1000).toLocaleString();
      const items = tarInv.posItems;
      items.forEach(item => {
        const itemDetail = [];
        const name = item.name;
        const qnt = item.quantity;
        const price = Number((String(item.sellPrice).replace(' IQD', '')) * 1000).toLocaleString();
        itemDetail.push(name, qnt, price);
        tableBody.push(itemDetail);
      })
      const estimatedTableHeight = tableBody.length * 10 + 5;
      if (lastTableY + estimatedTableHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        lastTableY = 20;
      }
      createCircle(lastTableY);
      doc.text(date, 20, lastTableY - 3);
      doc.text(`${discount}: ${tarInvDisc}`, 105, lastTableY - 3);
      doc.setTextColor(23, 208, 106)
      doc.text(addLoanStat, 160, lastTableY - 3);
      doc.setTextColor(0, 0, 0)
      let startY = lastTableY;
      let endY = 0;
      doc.autoTable({
        body: tableBody,
        startY: lastTableY, // Space from top
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 2, halign: 'center', textColor: [0, 0, 0]},
        headStyles: { textColor: [255, 255, 255], fillColor: [255, 255, 255] },
        margin: { bottom: 30 }, // Reserve space for footer
        didDrawPage: function (data) {lastTableY = data.cursor.y + 10; endY = data.cursor.y;}, // Save last position of table
        showHead: 'firstPage'
      });
      const tableHeight = endY - startY;
      if (tarInv.invStatus === 'Canceled') {paidStat = kurdish ? 'گە راوە' : arabic ? 'مرجوع' : 'returned'};
      if (redColor) doc.setTextColor(232, 27, 27);
      else doc.setTextColor(219, 157, 49);
      doc.text(`${loanStatus}: ${paidStat}`, 115, lastTableY - 3);
      doc.setTextColor(0, 0, 0);
      if (row.querySelector('.note-td').innerHTML !== '') doc.text(`${note}: ${row.querySelector('.note-td').innerHTML}`, 20, lastTableY - 3);
      const text = `${netTotal}: ${(Number(tarInv.netTotal) * 1000).toLocaleString()}`;
      setBackgroundColor(text, 160, lastTableY - 3);
      lastTableY += 20;
      createBorder(startY - 12, tableHeight + 24);
    } else {
      createBorder(lastTableY - 10 , 22);
      orderNum++;
      // rgba(168, 23, 208, 1)
      if (tarInvNetTotal.includes('-')) doc.setTextColor(232, 27, 27);
      else doc.setTextColor(23, 208, 106);
      doc.text(addLoanStat, 160, lastTableY - 3);
      doc.setTextColor(0, 0, 0);
      createCircle(lastTableY);
      doc.text(date, 20, lastTableY - 3);
      lastTableY += 10;
      if (redColor) doc.setTextColor(232, 27, 27);
      else doc.setTextColor(219, 157, 49);
      if (!tarInvNetTotal.includes('-')) doc.text(`${loanStatus}: ${paidStat}`, 115, lastTableY - 3);
      doc.setTextColor(0, 0, 0);
      const noteHTML = row.querySelector('.note-td').innerHTML.trim();
      const kurdish = languageSelect.value === 'Kurdish';
      const arabic = languageSelect.value === 'Arabic';
      const allPaidLangs = kurdish ? 'هە مووی واسل کرد' : arabic ? 'مدفوع بالكامل' : 'All Paid';
      if (row.querySelector('.note-td').innerHTML !== '') {
        if (noteHTML === 'All Paid') doc.setTextColor(168, 23, 208);
        doc.text(`${note}: ${noteHTML === 'All Paid' ? allPaidLangs : noteHTML}`, 20, lastTableY - 3);
        doc.setTextColor(0, 0, 0);
      }
      const oldAmountSp = Number(row.querySelector('.checkBox-td .checkBox-span').innerHTML.replace(/,/, '') * 1000).toLocaleString();
      const text = `${netTotal}: ${checkBox.checked ? oldAmountSp : tarInvNetTotal.replace('-', '')}`;
      setBackgroundColor(text, 160, lastTableY - 3);
      createLine(lastTableY, circle = false, [48, 115, 173], 0, 250);
      lastTableY += 20;
    };
  }
  let total = 0;
  customerLoans.forEach(loan => total += Number(loan.amount));
  doc.text(`${TotalInvoiceAmount}: ${(Number(balanceSpan.innerHTML.replace(/,/g, '')) * 1000).toLocaleString()}`, 20, lastTableY + 10);
  doc.text(`${currentBalance}: ${(total * 1000).toLocaleString()}`, 20, lastTableY + 15);
  return doc.save(`${castomerNameDiv.innerText}.pdf`);
}

function getLatestDate() {
  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1; // Months are zero-based
  const year = currentDate.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  return formattedDate;
}

function getLatestTime() {
  const kurdish = languageSelect.value === 'Kurdish';
  const arabic = languageSelect.value === 'Arabic';
  const currentDate = new Date();
  const options = { 
    weekday: 'long', // Full day name (e.g., "Saturday")
    hour: 'numeric', // Hour in 12-hour format
    minute: 'numeric', // Minutes
    hour12: true // Use AM/PM format
  };
  let formattedTime = currentDate.toLocaleTimeString('en-US', options);
  const day = formattedTime.split(' ')[0];
  let tanslatedDay;
  if (kurdish) {
    day === 'Saturday' ? tanslatedDay = 'شە ممە' :
    day === 'Sunday' ? tanslatedDay = 'یەک شەممە' :
    day === 'Monday' ? tanslatedDay = 'دوو شە ممە' :
    day === 'Tuesday' ? tanslatedDay = 'سێ شەممە' :
    day === 'Wednesday' ? tanslatedDay = 'چوار شەممە' :
    day === 'Thursday' ? tanslatedDay = 'پینج شە ممە' :
    day === 'Friday' ? tanslatedDay = 'هە ینی' :
    '';
    formattedTime = `${formattedTime.split(' ')[1]} ${formattedTime.split(' ')[2]} ${tanslatedDay} `
  } else if (arabic) {
    day === 'Saturday' ? tanslatedDay = 'السبت  ' :
    day === 'Sunday' ? tanslatedDay = 'الأحد' :
    day === 'Monday' ? tanslatedDay = 'الاثنين' :
    day === 'Tuesday' ? tanslatedDay = 'الثلاثاء' :
    day === 'Wednesday' ? tanslatedDay = 'الأربعاء' :
    day === 'Thursday' ? tanslatedDay = 'الخميس' :
    day === 'Friday' ? tanslatedDay = 'الجمعة' :
    '';
    formattedTime = `${formattedTime.split(' ')[1]} ${formattedTime.split(' ')[2]} ${tanslatedDay} `
  }
  return formattedTime;
}

function changLangs(fullDate) {
  if (!fullDate) return fullDate;
  const match = String(fullDate).match(/\d{4}-\d{2}-\d{2}/);
  const dateOnly = match ? match[0] : null;

  const originalDate = new Date(dateOnly);
  originalDate.setDate(originalDate.getDate() - 1); // Subtract 1 day
  const oneDayBefore = originalDate.toISOString().split('T')[0];

  const kurdish = languageSelect.value === 'Kurdish';
  const arabic = languageSelect.value === 'Arabic';

  const sepDate = fullDate.split(',');
  const day = sepDate[0];
  const date = sepDate[1];
  let changDay = day;

  if (kurdish) {
    day === 'Saturday' ? changDay = 'شە ممە' :
    day === 'Sunday' ? changDay = 'یەک شەممە' :
    day === 'Monday' ? changDay = 'دوو شە ممە' :
    day === 'Tuesday' ? changDay = 'سێ شەممە' :
    day === 'Wednesday' ? changDay = 'چوار شەممە' :
    day === 'Thursday' ? changDay = 'پینج شە ممە' :
    day === 'Friday' ? changDay = 'هە ینی' :
    '';
  } else if (arabic) {
    day === 'Saturday' ? changDay = 'السبت  ' :
    day === 'Sunday' ? changDay = 'الأحد' :
    day === 'Monday' ? changDay = 'الاثنين' :
    day === 'Tuesday' ? changDay = 'الثلاثاء' :
    day === 'Wednesday' ? changDay = 'الأربعاء' :
    day === 'Thursday' ? changDay = 'الخميس' :
    day === 'Friday' ? changDay = 'الجمعة' :
    '';
  }
  if (dateOnly === getTodayDate()) changDay = kurdish ? 'ئە مرۆ' : arabic ? 'اليوم' : 'Today';
  if (getTodayDate(1) === dateOnly) changDay = kurdish ? 'دوێنێ' : arabic ? 'أمس' : 'Yesterday';
  if (kurdish || arabic) return `${date} ،${changDay}`
  else return `${changDay}, ${date}`;
}

function getTodayDate(oneDayBefore) {
  const today = new Date();
  if (oneDayBefore) today.setDate(today.getDate() - oneDayBefore);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const dayy = String(today.getDate()).padStart(2, '0');
  const formatted = `${year}-${month}-${dayy}`;
  return formatted;
}

async function lastBalancePDF() {
  // Load jsPDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Add Kurdish font
  doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", font);
  doc.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskh", "normal");
  doc.setFont("NotoNaskh");

  // Load the image dynamically
  const img = new Image();
  img.src = '../iPower_stamp.png'; // Make sure the file is in the correct path
  img.onload = async function () {
    // Convert image to Base64 using Canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imgData = canvas.toDataURL('image/png'); // Convert to Base64

    const kurdish = languageSelect.value === 'Kurdish';
    const arabic = languageSelect.value === 'Arabic';

    const shopName = kurdish ? "پیشانگای ئایپاوەر" : arabic ? "محل ئايباور" : "iPower Shop";
    const Address = kurdish ? "هە ولیر کۆتری سە لام بینای شە هاب مۆڵ" : arabic ? "العنوان: أربيل كوتري سلام، مبنى شهـاب مول" : "Address: Erbil, Kotry Salam, Shahab Mall building";
    const customerName = kurdish ? 'ناوی کریار' : arabic ? 'اسم العميل' : 'Customer Name';
    const date = kurdish ? 'بە روار' : arabic ? 'التاريخ'  : 'Date';
    const OldBalance = kurdish ? 'حیسابی کۆن' : arabic ? 'حساب القديم' : 'Old Balance';
    const Then = kurdish ? 'کە واتە' : arabic ? 'ثم' : 'Then';
    const currentBalance = kurdish ? 'حیسابی ئیستا' : arabic ? 'الحساب الحالي' : 'Current Balance';
    const rightUpperPosition = (kurdish || arabic) ? 142 : 15;
    const leftUpperPosition = (kurdish || arabic) ? 15 : 155;
    const LastTransaction = kurdish ? 'کۆتا مامەلە' : arabic ? 'آخر معاملة' : 'Last Transaction';
    const TransactionStatus = kurdish ? 'باری مامەلە' : arabic ? 'حالة المعاملة' : 'Transaction Status'

    // Add image to the PDF
    doc.addImage(imgData, 'PNG', 90, 30, 40, 40); // (image, type, x, y, width, height)
    const targetAmount = tableTbody.querySelectorAll('tr')[0].querySelector('.amount-td').innerHTML.replace(/,/g, '');
    const targetNote = tableTbody.querySelectorAll('tr')[0].querySelector('.note-td').innerHTML;
    let total = 0;
    const response = await fetch(`${serverIP}/loans/${currentCustomerId}`);
    const customerLoans = await response.json();
    customerLoans.forEach(loan => total += Number(loan.amount));

    // Add shop information
    doc.setFontSize(18);
    doc.text(shopName, 115, 10, {align: 'center'}); // Adjusted to fit beside the image
    doc.setFontSize(10);
    doc.text(Address, 115, 16, {align: 'center'});
    doc.text("Phone: 0751 845 4545 - 0750 344 6261", 115, 22, {align: 'center'});
    doc.text(`${date}: ${getLatestDate()}`, leftUpperPosition, 40);
    doc.text(`${getLatestTime()}`, leftUpperPosition, 46);console.log(targetAmount)
    doc.text( (kurdish || arabic) ? `${castomerNameDiv.innerText.replace(/,/g, '')} :${customerName}` : `${customerName}: ${castomerNameDiv.innerText.replace(/,/g, '')}`, rightUpperPosition, 40);
    const LastTransactionAmount = (Number(targetAmount) * 1000).toLocaleString();
    doc.text(`${((kurdish || arabic) && targetAmount !== '0' && targetAmount.includes('-')) ? '-' : ''}${LastTransaction}: ${(kurdish || arabic) ? LastTransactionAmount.replace('-', ' ') : LastTransactionAmount}`, rightUpperPosition, 46);
    doc.text((kurdish || arabic) ? `${targetNote} :${TransactionStatus}` : `${TransactionStatus}: ${targetNote}`, rightUpperPosition, 51);
    doc.text('-----------------------------------------', rightUpperPosition, 57);
    doc.text(`${OldBalance}: ${((total - Number(targetAmount)) * 1000).toLocaleString()}`, rightUpperPosition, 63);
    doc.text(`${Then}: ${((total - Number(targetAmount)) * 1000).toLocaleString()}${!targetAmount.includes('-') ? ' +' : ''} ${(Number(targetAmount) * 1000).toLocaleString()}`, rightUpperPosition, 69);
    doc.text(`${currentBalance}: ${(total * 1000).toLocaleString()}`, rightUpperPosition, 75);

    // Save the PDF
    doc.save(`${castomerNameDiv.innerText.replace(/,/g, '')}.pdf`); // Downloads as 'invoice.pdf'
  };
}

document.addEventListener('click', function(e) {
  const targetLink = e.target.closest('a');
  if (targetLink) {
    localStorage.removeItem('savedSort');
    sessionStorage.removeItem('loanScrollPostion')
  }
})

window.addEventListener('DOMContentLoaded', () => {
  const showToast = localStorage.getItem('showLoanToast');
  if (showToast === 'true') {
    Toastify({
      text: `Loan added!`,
      duration: 2000,
      gravity: 'top',
      position: 'center',
      style: {
        background: 'rgb(61, 183, 138)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
    localStorage.removeItem('showLoanToast'); // Clean up after showing
  }
});

languageSelect.addEventListener('change', function () {
  const langauseSelectVal = this.value;
  localStorage.setItem('langauseSelectVal', langauseSelectVal);
  fetchLoansOnce();
})

languageSelect.value = localStorage.getItem('langauseSelectVal') || 'Kurdish';

const removeIcon = document.querySelector('.loEdit-cir');
searchinp.addEventListener('input', function() {
  fetchLoansOnce();
  removeIcon.style.display = this.value.trim() !== '' ? 'block' : '';
})

removeIcon.addEventListener('click', function() {
  this.style.display = 'none';
  searchinp.value = '';
  fetchLoansOnce();
})

removeIcon.style.display = searchinp.value.trim() !== '' ? 'block' : '';

const ArrowLeft = document.querySelector('.fa-arrow-left');
ArrowLeft.addEventListener('click', function() {sessionStorage.removeItem('searchLoanVal')});

document.addEventListener('keydown', function(e) {if (e.key === 'Escape') sessionStorage.removeItem('searchLoanVal');});

function fetchWorkers(workers) {
  workers.forEach((worker, index) => {
    const newSpan = document.createElement('span');
    newSpan.className = 'worker-span';
    newSpan.innerHTML = worker.name;
    newSpan.style.padding = '0.4vw';
    newSpan.setAttribute('data-id', worker.id);
    workerNamesDiv.appendChild(newSpan);
    const savedWorkerId = localStorage.getItem('workerName');
    if (savedWorkerId && (Number(newSpan.getAttribute('data-id')) === Number(savedWorkerId))) {
      newSpan.style.backgroundColor = 'rgb(35, 199, 174)';
      newSpan.style.color = 'rgb(255, 255, 255)';
    }
    newSpan.addEventListener('click', (e) => {
      workerNamesDiv.querySelectorAll('span').forEach(span => span.style.backgroundColor = '');
      newSpan.style.backgroundColor = 'rgb(35, 199, 174)';
      newSpan.style.color = 'rgb(255, 255, 255)';
      localStorage.setItem('workerName', Number(newSpan.getAttribute('data-id')));
    })
  })
  isWorkersFetched = true;
}

function setWorker() {
  let workerId;
  (workerNamesDiv.querySelectorAll('span')).forEach(span => {
    if (span.style.backgroundColor === 'rgb(35, 199, 174)') {
      workerId = span.getAttribute('data-id');
    };
  });
  return workerId;
}

function displayToastify(text, duration = 2000, backColor = 'rgb(61, 183, 138)') {
  Toastify({
    text: `${text}`,
    duration: duration,
    gravity: 'top',
    position: 'center',
    style: {
      background: backColor,
      borderRadius: '10px',
    },
    stopOnFocus: true,
  }).showToast();
}