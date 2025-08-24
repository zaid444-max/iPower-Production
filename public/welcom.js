const input = document.getElementById("productInput");
const list = document.getElementById("productList");
const totalSum = document.getElementById("totalSum");
const totalQty = document.getElementById("totalQty");

let items = [];

input.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && input.value.trim() !== "") {
    const name = input.value.trim();
    items.push({ name, quantity: 1, price: 0, total: 0 });
    input.value = "";
    renderList();
  }
}); 

function renderList() {
  list.innerHTML = "";
  items.forEach((item, index) => {
    item.total = item.quantity * item.price;

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.name}</strong>
      <p class ="dinar">دینار</p>
      <input type="number" min="0" value="${item.price}" onchange="updateItem(${index}, 'price', this.value)">
      <input type="number" min="0" value="${item.quantity}" onchange="updateItem(${index}, 'quantity', this.value)"> 
      
      <button class="delete" onclick="deleteItem(${index})">
        <i class="fa-solid fa-trash fa-flip-horizontal"></i>
      </button>
    `;
    list.appendChild(li);
  });
  updateTotal();
}

function deleteItem(index) {
  items.splice(index, 1); // سڕینەوە تایبەتی لە لیست
  renderList(); // نوێکردنەوەی لیست
}

function updateItem(index, field, value) {
  items[index][field] = parseFloat(value) || 0;
  items[index].total = items[index].quantity * items[index].price;
  renderList(); // نوێکردنەوەی لیستەکان
}

function updateTotal() {
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  totalSum.textContent = total.toFixed(2);
  totalQty.textContent = quantity;
}

document.addEventListener("click", function (e) {
  if (
    e.target.tagName === "INPUT" &&
    e.target.type === "number"
  ) {
    e.target.select();
  }
});






function generateInvoice() {
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString();

  const name = document.getElementById("kryar").value;


  let invoiceWindow = window.open('', '', 'width=900,height=700');
  invoiceWindow.document.write(`
    <html dir="rtl" lang="ku">
    <head>
      <title>Invoice</title>
      <style>
        body {
          font-family: 'kurd', sans-serif;
          direction: rtl;
          padding: 30px;
          color: #000;
        }
          h1, h3 p .invoiceName{
           color:rgb(12, 120, 84);

          }
        h1, h2, h3, p {
          margin: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px;
          text-align: center;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          backgroun: #green;
        }
        .footer {
          margin-top: 30px;
          text-align: right;
        }
.invoiceName {
 color: #10b33858;
  }

      </style>
    </head>
    <body>
      <div class="header">
        <h1>ئایپاوەر</h1>
        <h3>هەمیشە پێشەنگە لە خزمەت کردنی کریارەکانی</h3>
        <p>بەروار: ${date}</p>
        <p>کات: ${time}</p>
      </div>
      <div>
        <p id="invoiceName">ناوی کریار:  ${name}</p>
        <p>ژمارەی تەلەفۆن: ________________</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>ناوی کاڵا</th>
            <th>ژمارە</th>
            <th>نرخ</th>
            <th>کۆی گشتی</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${item.price}</td>
              <td>${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>کۆی گشتی نرخ: ${items.reduce((sum, i) => sum + i.total, 0).toFixed(2)} دینار</p>
        <p>کۆی گشتی ژمارە: ${items.reduce((sum, i) => sum + i.quantity, 0)}</p>
      </div>

      <script>
        window.print();
      </script>
    </body>
    </html>
  `);
  invoiceWindow.document.close();
}