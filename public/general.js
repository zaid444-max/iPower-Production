function removeAutocomplete() {
  document.querySelectorAll('input').forEach(input => {
    input.setAttribute('autocomplete', 'off');
  });
}

// Initial call
removeAutocomplete();

// Watch for new inputs added to the DOM
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1) { // Only element nodes
        if (node.tagName === 'INPUT') {
          node.setAttribute('autocomplete', 'off');
        } else {
          // If it's a container, search for input children
          node.querySelectorAll?.('input').forEach(input => {
            input.setAttribute('autocomplete', 'off');
          });
        }
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

function sortItem(searchTerm, array, orderBy, queSele) {
  if (searchTerm === '') return array;
  const sorted = array.sort((a, b) => {
    const term = searchTerm.toLowerCase();
    const aLower = queSele ? a.querySelector(`${queSele}`).innerHTML.toLowerCase() : orderBy ? a[orderBy]
    .toLowerCase() : a.toLowerCase();
    const bLower = queSele ? b.querySelector(`${queSele}`).innerHTML.toLowerCase() : orderBy ? b[orderBy]
    .toLowerCase() : b.toLowerCase();

    const aStarts = aLower.startsWith(term);
    const bStarts = bLower.startsWith(term);

    const aIncludes = aLower.includes(term);
    const bIncludes = bLower.includes(term);

    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    if (aIncludes && !bIncludes) return -1;
    if (!aIncludes && bIncludes) return 1;
    const localeCompare = 
    queSele ? a.querySelector(`${queSele}`).innerHTML.localeCompare(b.querySelector(`${queSele}`).innerHTML) : 
    orderBy ? a[orderBy].localeCompare(b[orderBy]) : 
    a.localeCompare(b);
    return localeCompare; // fallback alphabetical
  });
  return sorted;
}

function sortPosInvs(searchTerm, array) {
  if (searchTerm === '') return array;
  const sorted = array.sort((a, b) => {
    const term = searchTerm.toLowerCase();
    const aLowerArr = a.itemIds.map(item => item.toLowerCase());
    const bLowerArr = b.itemIds.map(item => item.toLowerCase());

    const aStarts = aLowerArr.some(item => item.startsWith(term));
    const bStarts = bLowerArr.some(item => item.startsWith(term));

    const aIncludes = aLowerArr.some(item => item.includes(term));
    const bIncludes = bLowerArr.some(item => item.includes(term));

    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    if (aIncludes && !bIncludes) return -1;
    if (!aIncludes && bIncludes) return 1;
    const localeCompare = a.itemIds.join('').localeCompare(b.itemIds.join(''));
    return localeCompare; // fallback alphabetical
  });
  return sorted;
}

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

const dropDownTabl = document.querySelector('.itemTabl');
const dropDownTablBody = dropDownTabl?.querySelector('.itemTabl-body');
const dropDownTablDiv = document.querySelector('.itemTabl-div');
async function displayItems(invNum, seaInp, locType) {
  if (!invNum) return;
  const items = locType === 'loanEdit' ? allItems : locType === 'invoice' ? itemListArray : '';
 const seachInp = document.querySelector(`.${seaInp}`);
  dropDownTablDiv.classList.add('show');
  const response = await fetch(`${serverIP}/stockentinvs-stItems/${invNum}`);
  const getResp = await response.json();
  const invoice = getResp.inv;
  const posItems = invoice.posItems;
  dropDownTablBody.innerHTML = '';
  posItems.forEach(i => {
    const tr = document.createElement('tr');
    tr.className = 'drop-tr';
    dropDownTablBody.appendChild(tr);

    tr.innerHTML = `
    <td class="name-td">${i.name}</td>
    <td class="det-td" style="display: none !important;">${i.fullName}</td>
    <td class="qnt-td">${i.quantity}</td>
    <td class="price-td">${i.sellPrice}</td>
    `
  });
  
  const tableTbodyHeight = dropDownTablBody.getBoundingClientRect().height;
  const vh = (tableTbodyHeight / window.innerHeight) * 100;
  dropDownTablDiv.style.height = `${vh < 65 ? vh + 10 : 70}vh`;
  const seaVal = seachInp.value.trim().toLocaleLowerCase();
  dropDownTablBody.querySelectorAll('tr').forEach(tr => {
    const detail = tr.querySelector('.det-td').innerHTML.toLocaleLowerCase();
    const splVal = seaVal.split(' ');
    const searMatch = splVal.every(term => detail.includes(term.toLocaleLowerCase()));
    if (seaVal !== '' && searMatch) {
      tr.querySelector('.name-td').style.color = 'yellow';
      tr.scrollIntoView({ behavior: 'smooth', block: 'center' })
    };
  })
}

function hideItems() {dropDownTablDiv.classList.remove('show');}

function removeDuplicates(arr) {
  const seen = new Set();
  return arr.filter(obj => {
    const key = JSON.stringify(obj);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getComName() {
  const saveName = localStorage.getItem('computerVal') || '';
  if (saveName !== 'null' && saveName !== '') return;
  const name = prompt(`What's this computer name ?`);
  localStorage.setItem('computerVal', name);
}