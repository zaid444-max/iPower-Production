const addButt = document.querySelector('.add-butt');
addButt.addEventListener('click', async function() {
  const respo = await fetch(`${serverIP}/add-transl`, { method: 'POST' });
  const getRes = await respo.json();
  const transls = getRes.transls;
  fetchTransls(transls);
})

async function fetchTranslsOnce() {
  const respo = await fetch(`${serverIP}/get-transls`);
  const getRes = await respo.json();
  const transls = getRes.transls;
  fetchTransls(transls);
}

fetchTranslsOnce();

function fetchTransls(transls) {
  const itemDiv = document.querySelector('.item-container');
  itemDiv.innerHTML = '';
  transls.forEach((trans, ind) => {
    const newDiv = document.createElement('div');
    newDiv.className = 'new-div'
    newDiv.innerHTML = `
    <span class="ind-span">${ind + 1}</span>
    <span class="IF-span">IF</span>
    <input value="${trans.ifState}" class="ifState-inp" spellcheck="false">
    <span class="THEN-CHANGE-span">THEN CHANGE</span>
    <input type="text" value="${trans.changeStat}" class="changeStat-inp" spellcheck="false">
    <span class="INTO-span">INTO</span>
    <input type="text" value="${trans.afterChangeStat}" class="afterChangeStat-inp" spellcheck="false">
    <i class="fas fa-trash" onclick="deleteTransl(${trans.id}, event)"></i>
    <button onclick="updateTransl(${trans.id}, event)" class="save-butt">Save</button>
    `;
    itemDiv.appendChild(newDiv);
  });

  itemDiv.querySelectorAll('input').forEach(inp => inp.addEventListener('input', function(e) {
    const tarSaveButt = e.target.closest('.new-div').querySelector('.save-butt');
    tarSaveButt.style.display = 'block';
  }))
}



async function updateTransl(id, e) {
  const newDiv = e.target.closest('.new-div');
  const ifState = newDiv.querySelector('.ifState-inp').value;
  const changeStat = newDiv.querySelector('.changeStat-inp').value;
  const afterChangeStat = newDiv.querySelector('.afterChangeStat-inp').value;
  await fetch(`${serverIP}/update-transl?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ifState, changeStat, afterChangeStat
    })
  });
  const tarSaveButt = newDiv.querySelector('.save-butt');
  tarSaveButt.style.display = 'none';
}

async function deleteTransl(id, e) {
  await fetch(`${serverIP}/del-transls?id=${id}`, { method: 'DELETE' });
  const tarDiv = e.target.closest('.new-div');
  tarDiv.remove();
  document.querySelectorAll('.ind-span').forEach((indSp, ind) => {
    indSp.innerHTML = ind + 1;
  })
}