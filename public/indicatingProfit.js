const addPriceButt = document.querySelector('.add-price-butt');
const priceSel = document.querySelector('.price-sel');
addPriceButt.addEventListener('click', async function(e) {
  const priVal = priceSel.value;
  if (priVal === 'All') return alert('Please select a price to add!');
  const targDiv = [...document.querySelectorAll('.profit-div')].find(div => div.style.backgroundColor === 'rgb(43, 37, 37)');
  let disOrder;
  if (targDiv) disOrder = Number(targDiv.getAttribute('disOrder')) + 0.1;
  const response = await fetch(`${serverIP}/addProfit?priVal=${priVal}&disOrder=${disOrder}`, { method: 'POST' });
  const addResp = await response.json();
  const profits = addResp.profits;
  fetchprofits(profits);
})

priceSel.addEventListener('change', function() {
  const newVal = priceSel.value;
  fetchprofitsOnce(newVal);
})

async function fetchprofitsOnce(newVal) {
  !newVal ? newVal = priceSel.value : '';
  const response = await fetch(`${serverIP}/getProfits?price=${newVal}`);
  const addResp = await response.json();
  const profits = addResp.profits;
  fetchprofits(profits);
}

fetchprofitsOnce();

const profitCont = document.querySelector('.profit-container');
function fetchprofits(profits) {
  profitCont.innerHTML = '';
  profits.forEach(profit => {
    const profitDiv = document.createElement('div');
    profitDiv.className = 'profit-div';
    profitDiv.setAttribute('disOrder', profit.disOrder);
    const listerInfo = 'oninput="displaySaveButt(event)" onkeydown="focusNextInp(event)"';
    const listerInfo2 = `oninput="displaySaveButt(event)" onkeydown="focusNextInp(event); saveAmount(event, ${profit.id}, 'en')"`;
    profitDiv.innerHTML = `
    <div class="profit-type-div" data-id="${profit.id}" onclick="heighlightToOrder(event)">${profit.price}</div>
    <input type="number" class="start-inp" value="${Number(profit.start)}" ${listerInfo}>
    <i class="fa-solid fa-arrow-right"></i>
    <input type="number" class="end-inp" value="${Number(profit.end)}" ${listerInfo}>
    <input type="number" class="profit-inp" value="${Number(profit.proAmount)}" ${listerInfo2}>
    <div class="trash-div">
      <button class="save-butt" style="display: none;" onclick="saveAmount(event, ${profit.id})">Save</button>
      <i class="fas fa-trash" onclick="removeProfit(event, ${profit.id})"></i>
    </div>
    `;
    profitCont.appendChild(profitDiv);
  });
  const notIncluded = ['-', '+', 'e', 'E'];
  document.querySelectorAll('input').forEach(input => {
    if (input.type === 'number') {
      input.addEventListener('keydown', function(e) {if (notIncluded.includes(e.key)) e.preventDefault();})
      };
  })
}

function displaySaveButt(event) {
  const targSaveButt = event.target.closest('.profit-div').querySelector('.save-butt');
  targSaveButt.style.display = '';
}

async function saveAmount(event, id, enter) {
  const targSaveButt = event.target.closest('.profit-div').querySelector('.save-butt');
  if (targSaveButt.style.display === 'none') return;
  if (enter) {if (event.key !== 'Enter') return;}
  const [start, end, proAmount] = [
    event.target.closest('.profit-div').querySelector('.start-inp').value.trim(),
    event.target.closest('.profit-div').querySelector('.end-inp').value.trim(),
    event.target.closest('.profit-div').querySelector('.profit-inp').value.trim(),
  ]
  let updatedAmounts = { start, end, proAmount };
  updatedAmounts = JSON.stringify(updatedAmounts);
  const response = await fetch(`${serverIP}/updateProfit?updatedAmounts=${updatedAmounts}&id=${id}`, { method: 'PUT' });
  const updResp = await response.json();
  if (!updResp.success) return alert('Not updated');
  targSaveButt.style.display = 'none';
}

async function removeProfit(event, id) {
  const result = await Swal.fire({
    title: "Are you sure to delete it?",
    text: "You won't be able to undo this action!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
    customClass: { popup: 'custom-popup' },
  });
  if (!result.isConfirmed) return;
  const response = await fetch(`${serverIP}/deleteProfits/${id}`, { method: 'DELETE' });
  const delResp = await response.json();
  if (delResp.success) {
    Toastify({
      text: `Successfully deleted`,
      duration: 3000,
      gravity: 'top', // or 'top'
      position: 'center', // or 'right', 'center'
      style: {
        background: 'rgba(40, 165, 113, 1)',
        borderRadius: '10px',
      },
      stopOnFocus: true,
    }).showToast();
    event.target.closest('.profit-div').remove();
  } else {alert('Not deleted')}
}

function focusNextInp(event) {
  if (event.key === 'Enter') {
    let nextInp = event.target?.nextElementSibling;
    !nextInp.matches('input') ? nextInp = nextInp?.nextElementSibling : '';
    if (nextInp?.matches('input')) {nextInp.focus(); nextInp.select();}
  }
}

function heighlightToOrder(e) {
  const tarProfitDiv = e.target.closest('.profit-div');
  document.querySelectorAll('.profit-div').forEach(div => div.style.backgroundColor = '');
  tarProfitDiv.style.background = 'rgb(43, 37, 37)';
}