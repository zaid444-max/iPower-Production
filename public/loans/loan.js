const tableTbody = document.querySelector('.table-tbody');
const loanList = [];
const customerList = [];
const searchInp = document.querySelector('.search-inp');
const startIndexInp = document.querySelector('.start-index-inp');
const endIndexInp = document.querySelector('.end-index-inp');
const cleanerInpIcon = document.querySelector('.fa-times-circle');
const tableDiv = document.querySelector('.table-div');

window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('loan-filters');
  if (saved) {
    const filters = JSON.parse(saved);
    searchInp.value = filters.search || '';
    startIndexInp.value = filters.startIndexInp || '';
    endIndexInp.value = filters.endIndexInp || '';
  }
});

if (performance.getEntriesByType("navigation")[0].type === "reload") {
  sessionStorage.removeItem('loan-filters');
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
  window.location.reload();
  }
});

let latestFetchId = 0;
async function fetchCustomers() {
  const thisFetchId = ++latestFetchId; // Increment global fetch ID
  tableTbody.innerHTML = `
  <div class="spinner-container">
    <div class="spinner"></div>
  </div>
  `;
  const response = await fetch(`${serverIP}/customers-Loans`, { cache: 'no-store' });
  const result = await response.json();
  if (thisFetchId !== latestFetchId) return;
  tableTbody.innerHTML = '';
  const customers = result.customers;
  fetchLoans(result.loans);
  for(const [index, customer] of customers.entries()) {
    let totalBalance = 0;
    const filteredLoanList = loanList.filter(loan => loan.customer_id === customer.id);
    filteredLoanList.forEach(loan => totalBalance += Number(loan.amount));
    const newRow = document.createElement('tr');
    newRow.className  = 'new-row';
    newRow.innerHTML = `
    <td class="id-td">${customer.id}</td>
    <td class="index-td">${index + 1}</td>
    <td class="name-td">${customer.name}</td>
    <td class="balance-td">${totalBalance.toLocaleString()}</td>
    <td class="phone-number-td">${customer.phoneNo || '0750'}</td>
    <td class="price-type-td">${customer.priceLevel}</td>
    `
    tableTbody.appendChild(newRow);
    customerList.push(newRow);
    newRow.addEventListener('click', (e) => {
      const currentCustomerId = parseInt(e.target.closest('tr').querySelector('.id-td').innerHTML);
      const customerName = e.target.closest('tr').querySelector('.name-td').innerHTML;
      localStorage.setItem('currentCustomerId', currentCustomerId);
      localStorage.setItem('customerName', customerName);
      sessionStorage.setItem('loanScrollPostion', tableDiv.scrollTop);
      const filters = {
        search: searchInp.value,
        startIndexInp: startIndexInp.value,
        endIndexInp: endIndexInp.value, 
      };
    sessionStorage.setItem('loan-filters', JSON.stringify(filters));
    sessionStorage.removeItem('loanEdit-filters');
      if (isAlreadySorted !== 'no') {
        localStorage.setItem('savedSort', isAlreadySorted);
      }
      document.body.classList.add('animate-out');
      setTimeout(() => {
        window.location.href = 'loanedit.html';
      }, 200);
    })
  }
  if (localStorage.getItem('savedSort') === 'Maxsorted') {
    isAlreadySorted = 'Minsorted';
    sortAmount();
  } else if (localStorage.getItem('savedSort') === 'Minsorted') {
    isAlreadySorted = 'Maxsorted';
    sortAmount();
  }
  applyCombinedFilters();
  if (startIndexInp.value.trim() !== '' && endIndexInp.value.trim() !== '') {filterAgain();}
  const savedScroll = sessionStorage.getItem('loanScrollPostion');
  tableDiv.scrollTop = Number(savedScroll);
  sessionStorage.removeItem('loanScrollPostion')
}

fetchCustomers();

async function fetchLoans(loans) {
  loans.forEach(loan => loanList.push(loan));
}

let isAlreadySorted = 'no';
function sortAmount() {
  if (isAlreadySorted === 'Minsorted') {
    const sortedArray = customerList.sort((a, b) => {
      return Number(b.querySelector('.balance-td').innerHTML.replace(/,/g, '')) - Number(a.querySelector('.balance-td').innerHTML.replace(/,/g, ''));
    });
    resetTableTbody(sortedArray)
    isAlreadySorted = 'Maxsorted';
    localStorage.setItem('savedSort', isAlreadySorted);
  } else if (isAlreadySorted === 'Maxsorted') {
    const sortedArray = customerList.sort((a, b) => {
      return Number(a.querySelector('.balance-td').innerHTML.replace(/,/g, '')) - Number(b.querySelector('.balance-td').innerHTML.replace(/,/g, ''));
    });
    resetTableTbody(sortedArray)
    isAlreadySorted = 'Minsorted';
    localStorage.setItem('savedSort', isAlreadySorted);
  } else if (isAlreadySorted === 'no') {
    const sortedArray = customerList.sort((a, b) => {
      return Number(b.querySelector('.balance-td').innerHTML.replace(/,/g, '')) - Number(a.querySelector('.balance-td').innerHTML.replace(/,/g, ''));
    });
    resetTableTbody(sortedArray)
    isAlreadySorted = 'Maxsorted';
    localStorage.setItem('savedSort', isAlreadySorted);
  }
  localStorage.removeItem('savedSort');
}

searchInp.addEventListener('input', function() {
  applyCombinedFilters();
  cleanerInpIcon.style.display = this.value !== '' ? 'block' : 'none';
  startIndexInp.value = '';
  endIndexInp.value = '';
});

searchInp.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    document.body.classList.add('animate-out');
    const currentCustomerId = Array.from(tableTbody.children)[0].querySelector('.id-td').innerHTML;
    const customerName = Array.from(tableTbody.children)[0].querySelector('.name-td').innerHTML;
    localStorage.setItem('currentCustomerId', currentCustomerId);
    localStorage.setItem('customerName', customerName);
    sessionStorage.setItem('loanScrollPostion', tableDiv.scrollTop);
    if (isAlreadySorted !== 'no') {
      localStorage.setItem('savedSort', isAlreadySorted);
    }
    setTimeout(() => {
      window.location.href = 'loanedit.html';
    }, 200)
  }
})

searchInp.focus();

cleanerInpIcon.addEventListener('click', function() {
  this.style.display = 'none';
  searchInp.value = '';
  applyCombinedFilters();
})

function applyCombinedFilters() {
  const searchInpVal = searchInp.value.trim().toLowerCase();
  const filteredArray = customerList.filter(row => {
    const searchMatch = searchInpVal === '' ||
     row.querySelector('.name-td').innerHTML.toLowerCase().includes(searchInpVal) ||
     row.querySelector('.phone-number-td').innerHTML.toLowerCase().includes(searchInpVal);
    return searchMatch;
  })
  sortItem(searchInpVal, filteredArray, false, '.name-td')
  resetTableTbody(filteredArray);
  updateTotal();
  if (searchInp.value.trim() !== '') cleanerInpIcon.style.display = 'block';
}

startIndexInp.addEventListener('keydown', function(e) {if (e.key === 'Enter') {endIndexInp.focus();endIndexInp.select()}});
endIndexInp.addEventListener('keydown', function(e) {if (e.key === 'Enter') {
  filterAgain();
  updateTotal();
  this.addEventListener('keydown', function(e) {if (e.key === 'Enter') {createPDF()}});
}})

function resetTableTbody(sortedArray) {
  tableTbody.innerHTML = '';
  sortedArray.forEach((row, index) => {
    tableTbody.appendChild(row);
    row.querySelector('.index-td').innerHTML = index + 1;
  });
}

function filterAgain() {
  const filteredArray = Array.from(tableTbody.querySelectorAll('tr')).filter(row => {
    const startIndexInpVal = Number(startIndexInp.value.trim());
    const endIndexInpVal = Number(endIndexInp.value.trim());
    const rowIndex = Number(row.querySelector('.index-td').innerHTML);

    return rowIndex >= startIndexInpVal && endIndexInpVal >= rowIndex;
  })

  tableTbody.innerHTML = '';
  filteredArray.forEach(row => {tableTbody.appendChild(row);})
}

const removeIcon = document.querySelector('.RemoveIcon');
removeIcon.addEventListener('click', function() {
  resetTableTbody(customerList);
  startIndexInp.value = '';endIndexInp.value = '';
  applyCombinedFilters();
})

function updateTotal() {
  let totalBalance = 0;
  Array.from(tableTbody.children).forEach(row => {
    totalBalance += Number(row.querySelector('.balance-td').innerHTML.replace(/,/g, ''));
  })
  const totalBalanceSpan = document.querySelector('.total-balance-span');
  totalBalanceSpan.innerHTML = totalBalance.toLocaleString();
}

function createPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const table = document.querySelector('.table');
  const rows = table.querySelectorAll('tbody tr');

  const tableData = [];
  rows.forEach((row, index) => {
    const rowData = [];
    row.querySelectorAll('td').forEach((cell) => {
      if (cell.matches('.id-td') || cell.matches('.price-type-td')) return
      rowData.push(
        cell.matches('.balance-td') ? (parseFloat(cell.innerHTML.replace(/,/g, '')) * 1000).toLocaleString()  : 
        cell.matches('.phone-number-td') && cell.innerHTML === '0750' ? '' : cell.matches('.index-td') ? cell.innerHTML = index + 1 : cell.innerText
      );
    });
    tableData.push(rowData);
  });

  const excludedClasses = ['id-th', 'price-level-th'];
  const headers = Array.from(table.querySelectorAll('thead th'))
    .filter(th => !excludedClasses.some(cls => th.classList.contains(cls)))
    .map(th => th.innerText.trim());

  doc.setFontSize(10);
  doc.text(`Date: ${getLatestDate()}`, 140, 10);
  doc.text(`Time: ${getLatestTime()}`, 140, 16);

  // Generate PDF table
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 20, // Space from top
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2, halign: 'center', textColor: [0, 0, 0]},
    headStyles: {textColor: [255, 255, 255]},
    margin: { bottom: 30 }, // Reserve space for footer
    didDrawPage: function (data) {
      lastTableY = data.cursor.y; // Save last position of table
    },
    showHead: 'firstPage',
    headStyles: {
      textColor: [255, 255, 255], // White text
      fillColor: [0, 0, 0] // Blue background
    }
  });
  
  // Get final Y position after the table
  let finalY = lastTableY + 10; 
  let pageHeight = doc.internal.pageSize.height; 
  
  // If footer exceeds page, create a new page
  if (finalY + 30 > pageHeight) {  
    doc.addPage();
    finalY = 20; // Reset Y position for new page
  }
  let totalBalance = 0;
  Array.from(tableTbody.children).forEach(row => {totalBalance += Number(row.querySelector('.balance-td').innerHTML.replace(/,/g, ''))})
  // Add footer information **only once at the end**
  doc.text(`Total: ${(totalBalance * 1000).toLocaleString()} IQD`, 15, finalY);
  // Save the PDF
  doc.save('invoice.pdf'); // Downloads as 'invoice.pdf'
}

function getLatestDate() {
  const currentDate = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = currentDate.toLocaleDateString('en-US', options);

  return formattedDate;
}

function getLatestTime() {
  const currentDate = new Date();
  
  // Get formatted time
  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true // AM/PM format
  });

  // Get the day name
  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

  return `${formattedTime} ${dayName}`;
}

document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', (e) => {
    const nextPage = link.href;
    sessionStorage.removeItem('loan-filters');
  });
});