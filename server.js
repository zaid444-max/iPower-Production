const basicAuth = require("express-basic-auth");
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const compression = require('compression');
const ExcelJS = require("exceljs");
const cheerio = require('cheerio');
const app = express();
const os = require("os");

app.use(cors()); // allow all origins, all methods by default

app.use(compression());

// Increase limit to, say, 20MB
app.use(express.json({ limit: "20mb" }));

if (os.hostname() !== 'ipowerdragon') app.use(basicAuth({ users: { "ipower": "ipowerdragon99" },challenge: true, unauthorizedResponse: "Access denied" }));

app.use((req, res, next) => {   
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Serve static frontend files
app.use(express.static("public")); // Serve frontend files


const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, 
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true // ✅ add this
});

/*
const db = mysql.createPool({
    connectionLimit: 10,
    host: "turntable.proxy.rlwy.net",
    port: 39457, 
    user: 'root',
    password: "JYaNxDIJrISpgzgknrubTpyTIvTKJFRv",
    database: 'railway',
    multipleStatements: true // ✅ add this
});
*/

// ✅ Whenever a new connection is made, set the timezone
db.on("connection", (connection) => {
    connection.query("SET time_zone = '+03:00'");
});
  
console.log('MySQL pool initialized');

app.get('/health', (req, res) => {
  res.send('OK');
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.get('/replaceNewStockInvs', (req, res) => {
    db.query('SELECT * FROM stockentinvs', (err, stockInvs) => {
        if (err) {console.error(err); return res.status(500);}
        const newStockItems = [];
        for(const inv of stockInvs) {
            const invoiceId = inv.id;
            const items = inv?.items;
            if (!items) continue;
            for (const i of items) {
                newStockItems.push({ 
                    inv_id: invoiceId, 
                    itemId: i.itemId, 
                    quantity: i.quantity, 
                    lastQuantity: i.lastQuantity,
                    buyPrice: i.buyPrice
                })
            }
        }
        if (newStockItems.length === 0) return res.json({ success: false });
        const values = [];
        const placeHols = newStockItems.map(i => `(?, ?, ?, ?, ?)`).join(', ');
        for (const i of newStockItems) values.push(i.inv_id, i.itemId, i.quantity, i.lastQuantity, i.buyPrice);
        const sql = `INSERT INTO stockitems (inv_id, itemId, quantity, lastQuantity, buyPrice) VALUES ${placeHols}`;
        db.query(sql, values, (err) => {
            if (err) {console.error(err); return res.status(500)}
            res.json({ success: true })
            })
    })
})

app.get('/replaceNewPosInvs', (req, res) => {
    db.query('SELECT * FROM posinvoices', (err, posInvs) => {
        if (err) {console.error(err); return res.status(500);}
        const newPosItems = [];
        const newtargStockInvs = [];
        for(const inv of posInvs) {
            const invoiceId = inv.id;
            const items = inv?.items;
            if (!items) continue;
            for (const i of items) {
                const $ = cheerio.load(i);
                const $row = $('<tr>' + i + '</tr>');
                const itemId = Number($row.find('.id-span').text());
                const quantity = Number($row.find('.quantity-td').text()) || 1;
                const sellPrice = Number($row.find('.price-td').text().split(' ')[0].replace(/,/g, ''));
                const targetInvTd = i.match(/\(\d+-\d+\)/g);
                if (invoiceId === 756040 || invoiceId === 756216 || invoiceId === 756609 || !targetInvTd || invoiceId === 765241) continue;
                newPosItems.push({ 
                    pos_id: invoiceId,
                    itemId: itemId, 
                    quantity: quantity, 
                    sellPrice: sellPrice,
                })
                targetInvTd.forEach(piece => {
                    const entire =  piece.replace('(', '').replace(')', '');
                    const quantity2 = Number(entire.split('-')[0]);
                    const stockInv_id = Number(entire.split('-')[1]);
                    newtargStockInvs.push({
                        pos_id: invoiceId,
                        itemId: itemId, 
                        quantity: quantity2, 
                        stockInv_id: stockInv_id
                    })
                })
            }
        }
        if (newPosItems.length === 0) return res.json({ success: false });
        const values = [];
        const placeHols = newPosItems.map(i => `(?, ?, ?, ?)`).join(', ');
        for (const i of newPosItems) values.push(i.pos_id, i.itemId, i.quantity, i.sellPrice);
        const sql = `INSERT INTO positems (pos_id, itemId, quantity, sellPrice) VALUES ${placeHols}`;
        db.query(sql, values, (err) => {
            if (err) {console.error(err); return res.status(500)}
        })

        if (newtargStockInvs.length === 0) return res.json({ success: false });
        const values2 = [];
        const placeHols2 = newtargStockInvs.map(i => `(?, ?, ?, ?)`).join(', ');
        for (const i of newtargStockInvs) values2.push(i.pos_id, i.itemId, i.quantity, i.stockInv_id);
        const sql2 = `INSERT INTO targstockinvs (pos_id, itemId, quantity, stockInv_id) VALUES ${placeHols2}`;
        db.query(sql2, values2, (err) => {
            if (err) {console.error(err); return res.status(500)}
            res.json({ success: true })
        })
    })
})
  
// Items:-----------

const filtItemsQuery = "SELECT i.id, b.name AS brand_name, m.name AS model_name, c.name AS category_name, q.name AS quality_name, i.quantity, i.buyPrice, i.priceOne, i.display_order, i.changingId, i.SKU, i.boxId, i.disable, i.noExcel, i.discription, c.circle_ball AS ball FROM items i JOIN brand b ON i.brand = b.id JOIN model m ON i.model = m.id JOIN category c ON i.category = c.id JOIN quality q ON i.quality = q.id ORDER BY i.display_order";

const stockAndStockItemsQry = invId => `
    SELECT 
    stockentinvs.id,
    DATE_FORMAT(stockentinvs.nowDate, "%Y-%m-%d, %H:%i:%s") AS nowDate,
    stockentinvs.sku,
    stockentinvs.invStatus,
    stockentinvs.remark,
    JSON_ARRAYAGG(JSON_OBJECT(
        'id', stockitems.id,
        'inv_id', stockitems.inv_id,
        'itemId', stockitems.itemId,
        'quantity', stockitems.quantity,
        'lastQuantity', stockitems.lastQuantity,
        'buyPrice', stockitems.buyPrice
    )) AS items
    FROM stockentinvs
    LEFT JOIN 
    stockitems ON stockitems.inv_id = stockentinvs.id
    ${invId ? ` WHERE stockentinvs.id = ?` : ''} 
    GROUP BY stockentinvs.id
`;

let loanEditFilterQry = `SELECT 
    l.id, 
    l.amount, 
    l.oldAmount, 
    l.invoiceNum, 
    DATE_FORMAT(pisInv.newDate, "%W, %Y-%m-%d %h:%i:%s %p") AS posNowDate, 
    DATE_FORMAT(l.nowDate, "%W, %Y-%m-%d %h:%i:%s %p") AS loanNowDate, 
    l.note, 
    workers.name,
    pisInv.invStatus
    FROM loans l
    LEFT JOIN posinvoices pisInv ON l.invoiceNum = pisInv.id 
    LEFT JOIN workers ON l.worker_id = workers.id
    WHERE l.customer_id = ?`;

const allPosInvs = `
   SELECT posinvoices.id, 
        DATE_FORMAT(posinvoices.newDate, "%Y-%m-%d, %H:%i:%s") AS newDate, 
        posinvoices.items, 
        customers.name AS customer_name, 
        deliveries.name AS delivery_name,
        workers.name AS worker_name,
        posinvoices.total, 
        posinvoices.discount,
        posinvoices.netTotal,
        posinvoices.note, 
        posinvoices.invStatus,
        posinvoices.totalQuantity, 
        posinvoices.customerId,
        posinvoices.delFee,
        posinvoices.deliveryId,
        posinvoices.workerId,
        posinvoices.orders,
        posinvoices.priceLevel,
        posinvoices.computerName,
        posinvoices.itemIds,
        GROUP_CONCAT(DISTINCT CONCAT(brand.name, ' ', model.name, ' ', category.name, ' ', quality.name) SEPARATOR ', ') AS itName,
        JSON_ARRAYAGG(JSON_OBJECT(
            'inv_id', positems.pos_id,
            'itemId', positems.itemId,
            'quantity', positems.quantity,
            'sellPrice', positems.sellPrice,
            'targstockinvs', (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                    'quantity', targstockinvs.quantity,
                    'stockInv_id', targstockinvs.stockInv_id,
                    'buyPrice', stockitems.buyPrice
                    )
                )
                FROM targstockinvs
                LEFT JOIN stockitems 
                    ON stockitems.inv_id = targstockinvs.stockInv_id
                    AND stockitems.itemId = targstockinvs.itemId
                WHERE targstockinvs.pos_id = positems.pos_id
                AND targstockinvs.itemId = positems.itemId
            ),
            'sku', items.SKU,
            'boxId', items.boxId,
            'existQnt', items.quantity,
            'discrip', items.discription,
            'name', CONCAT(brand.name, ' ', model.name, ' ', category.name, ' ', quality.name)
        )) AS posItems
    FROM posinvoices 
    JOIN customers ON customers.id = posinvoices.customerId
    LEFT JOIN deliveries ON deliveries.id = posinvoices.deliveryId
    LEFT JOIN workers ON workers.id = posinvoices.workerId
    LEFT JOIN positems ON positems.pos_id = posinvoices.id
    LEFT JOIN items ON items.id = positems.itemId
    LEFT JOIN brand ON brand.id = items.brand
    LEFT JOIN model ON model.id = items.model
    LEFT JOIN category ON category.id = items.category
    LEFT JOIN quality ON quality.id = items.quality
`

// Fetch all items
app.get('/items', (req, res) => {
    let sql = "SELECT i.id, b.name AS brand_name, m.name AS model_name, c.name AS category_name, q.name AS quality_name, i.quantity, i.buyPrice, i.priceOne, i.display_order, i.changingId, i.SKU, i.boxId, i.disable, i.noExcel, i.discription, c.circle_ball AS ball FROM items i JOIN brand b ON i.brand = b.id JOIN model m ON i.model = m.id JOIN category c ON i.category = c.id JOIN quality q ON i.quality = q.id ORDER BY i.display_order"
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching items:', err);
            res.status(500).send(err);
            return;
        }
        res.json(results);
    });
});

// Fetch all items
app.get('/items-changingId/:id', (req, res) => {
    let updatedChangingIdVal = req.query.updatedChangingIdVal;
    if (updatedChangingIdVal === 'null') updatedChangingIdVal = null;
    const id = req.params.id;
    const updatedField = req.query.updatedField;
    const price = req.query.price;
    db.query(`UPDATE items SET ${updatedField} = ? WHERE id = ?`, [updatedChangingIdVal, id], (err, resu) => {
        if (err) {console.error(err); return res.status(500);}
        if (updatedField === 'changingId') {
            if (updatedChangingIdVal === null) return res.json({ success: true })
                const sql = `SELECT * FROM items WHERE id != ? AND changingId = ? LIMIT 1`;
            db.query(sql, [id, updatedChangingIdVal], (err, item) => {
                if (err) {console.error(err); return res.status(500);}
                if (item.length === 0) return res.json({ success: true })
                const updatPriceOne0 = item[0].priceOne0;
                const updatPriceTwo = item[0].priceTwo;
                const updatPriceThree = item[0].priceThree;
                const updatPriceOne = item[0].priceOne;
                const updatPriceFive = item[0].priceFive;
                const updatPriceSix = item[0].priceSix;
                const updatPriceSevin = item[0].priceSevin;
                const sql = `Update items SET 
                priceOne0 = ?,
                priceTwo = ?,
                priceThree = ?,
                priceOne = ?,
                priceFive = ?,
                priceSix = ?,
                priceSevin = ?
                WHERE id = ?`;
                const values = [updatPriceOne0, updatPriceTwo, updatPriceThree, updatPriceOne, updatPriceFive, updatPriceSix,updatPriceSevin,id]
                db.query(sql, values, (err, result) => {
                    if (err) {console.error(err); return res.status(500);}
                    res.json({ success: true, updatPrice: values })
                })
            })
        } else if (updatedField !== 'buyPrice') {
            const updatedprice = req.query.updatedprice;
            const itemChanging = req.query.itemChanging;
            const price = req.query.price;
            db.query(`UPDATE items SET ${price} = ? WHERE id != ? AND changingId = ?`, [updatedprice, id, itemChanging], (err) => {
                if (err) {console.error(err); return res.status(500);}
                    res.json({ success: true })
            })
        }
    })
});

// Fetch all items with filtering
app.get('/itemsFilter', (req, res) => {
    let limit = parseInt(req.query.limit, 10) || 70; // default to 1000000 if not provided
    const search = `%${req.query.search || ''}%`;
    const searchTerms  = search.toLocaleLowerCase().split(' ');
    const brandDivVal = req.query.brandDivVal === 'Select brand..' ? '' : req.query.brandDivVal;
    const categoryDivVal = !req.query.categoryDivVal ? false : req.query.categoryDivVal === 'Select category..' ? '' : req.query.categoryDivVal.replace(/plus/g, '+');
    let sql = `SELECT i.id, b.name AS brand_name, m.name AS model_name, c.name AS category_name, q.name AS quality_name, i.quantity, i.buyPrice, i.priceOne, i.display_order, i.changingId, i.SKU, i.boxId, i.disable, i.noExcel, i.discription, c.circle_ball AS ball FROM items i JOIN brand b ON i.brand = b.id JOIN model m ON i.model = m.id JOIN category c ON i.category = c.id JOIN quality q ON i.quality = q.id WHERE 1=1 `;
    const values = [];
    for(const term of searchTerms ) {
        sql += `
        AND (
            LOWER(b.name) LIKE ? OR
            LOWER(m.name) LIKE ? OR
            LOWER(q.name) LIKE ? OR
            LOWER(c.name) LIKE ? OR
            LOWER(i.SKU) LIKE ? OR
            LOWER(i.boxId) LIKE ? OR
            LOWER(i.discription) LIKE ?
        )
        `
        const wildcardTerm = `%${term}%`;
        values.push(wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm)
    }

    if (brandDivVal) {
        sql += ` AND b.name = ?`;
        values.push(brandDivVal)
    }
    if (categoryDivVal) {
        sql += ` AND c.name = ?`;
        values.push(categoryDivVal)
    }

    sql += ` ORDER BY i.display_order ASC LIMIT ?;`;
    values.push(limit);

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error fetching items:', err);
            res.status(500).send(err);
            return;
        }
        res.json(results);
    });
});

// Fetch all items with filtering
app.get('/itemsFilter-andStock', (req, res) => {
    let limit = parseInt(req.query.limit, 10) || 70; // default to 1000000 if not provided
    const search = `%${req.query.search || ''}%`;
    const searchTerms  = search.toLocaleLowerCase().split(' ');
    const brandDivVal = req.query.brandDivVal === 'Select brand..' ? '' : req.query.brandDivVal;
    const categoryDivVal = !req.query.categoryDivVal ? false : req.query.categoryDivVal === 'Select category..' ? '' : req.query.categoryDivVal.replace(/plus/g, '+');
    const priceType = req.query.priceType;
    const zero = req.query.zero;
    let sql = `SELECT 
    i.id,
    b.name AS brand_name,
    m.name AS model_name,
    c.name AS category_name,
    q.name AS quality_name,
    i.quantity,
    i.buyPrice,
    i.priceOne0,
    i.priceTwo,
    i.priceThree,
    i.priceOne,
    i.priceFive,
    i.priceSix,
    i.priceSevin,
    i.display_order,
    i.changingId,
    i.SKU, 
    i.boxId, 
    i.disable, 
    i.noExcel, 
    i.discription
    FROM items 
    i JOIN brand b ON i.brand = b.id 
    JOIN model m ON i.model = m.id 
    JOIN category c ON i.category = c.id 
    JOIN quality q ON i.quality = q.id 
    WHERE 1=1 `;
    const values = [];
    if (searchTerms[0] !== '%%') {
        for(const term of searchTerms ) {
            sql += `
            AND i.fullName LIKE ?
            `
            values.push(`%${term}%`)
        }
    }

    if (brandDivVal) {sql += `AND b.name = ?`; values.push(brandDivVal)}
    if (categoryDivVal) {sql += `AND c.name = ?`; values.push(categoryDivVal)}
    const equal = `${zero === 'false' ? '=' : zero === 'blue' ? '!=' : ''}`;
    if (priceType && zero !== 'green') {sql += `AND ${priceType} ${equal} 0`}

    sql += ` ORDER BY i.display_order ASC LIMIT ?;`;
    values.push(limit);

    db.query(sql, values, (err, filtItems) => {
        if (err) {console.error('Error fetching items:', err); return res.status(500).send(err)}
        let filtItemsIds = filtItems.map(i => i.id);
        if (filtItemsIds.length === 0) filtItemsIds = -1;
        db.query(`SELECT itemId, quantity, inv_id FROM stockitems WHERE itemId IN (${filtItemsIds})`, (err, stockItems) => {
            let stockInvIds = stockItems.map(i => i.inv_id);
            if (stockInvIds.length === 0) stockInvIds = -1;
            const sql = `
            SELECT 
            id,
            DATE_FORMAT(nowDate, "%Y-%m-%d, %H:%i:%s") AS nowDate,
            sku,
            invStatus,
            remark
            FROM stockentinvs
            WHERE id IN (${stockInvIds}) AND invStatus = 'Pending'
            `
            db.query(sql, (err, stockInvs) => {
                if (err) {console.error(err); return res.status(500)}
                stockInvs.forEach(inv => {
                    inv.items = stockItems.filter(i => i.inv_id === inv.id);
                })
                db.query('SELECT * FROM profits', (err, profits) => {
                    if (err) {console.error(err); return res.status(500);}
                    res.json({ filtItems, stockInvs, profits });
                })
            })
            
        })
    });
});

app.post('/items-filterToo', (req, res) => {
    const tarId = req.query.tarId;
    const isAddByHighl = req.query.isAddByHighl === 'true';
    db.query('SELECT * FROM items WHERE id = ?', [tarId], (err, item) => {
        if (err) {console.error(err); return res.status(500);}
        const targItem = item[0];
        const brandId = targItem?.brand || 0;
        const categoryId = targItem?.category || 0;
        const qualityId = targItem?.quality || 0;
        const newOrder = isAddByHighl ? (Number(targItem.display_order) + 0.1) : ((Number(targItem?.display_order) - 0.1) || 1000000);
        const sql = 'INSERT INTO items (brand, model, category, quality, quantity, buyPrice, priceOne, display_order) VALUES(?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [ brandId, 0, categoryId, qualityId, 0, 0, 0, newOrder];
        db.query(sql, values, (err, addedItem) => {
            if (err) {console.error(err); return res.status(500);}

            let limit = parseInt(req.query.limit, 10) || 70; // default to 1000000 if not provided
            const search = `%${req.query.search || ''}%`;
            const searchTerms  = search.toLocaleLowerCase().split(' ');
            const brandDivVal = req.query.brandDivVal === 'Select brand..' ? '' : req.query.brandDivVal;
            const categoryDivVal = !req.query.categoryDivVal ? false : req.query.categoryDivVal === 'Select category..' ? '' : req.query.categoryDivVal.replace(/plus/g, '+');
            let sql = "SELECT i.id, b.name AS brand_name, m.name AS model_name, c.name AS category_name, q.name AS quality_name, i.quantity, i.buyPrice, i.priceOne, i.display_order, i.changingId, i.SKU, i.boxId, i.disable, i.noExcel, i.discription, c.circle_ball AS ball FROM items i JOIN brand b ON i.brand = b.id JOIN model m ON i.model = m.id JOIN category c ON i.category = c.id JOIN quality q ON i.quality = q.id WHERE 1=1";
            const values = [];
            for(const term of searchTerms ) {
                sql += `
                AND (
                    LOWER(b.name) LIKE ? OR
                    LOWER(m.name) LIKE ? OR
                    LOWER(q.name) LIKE ? OR
                    LOWER(c.name) LIKE ? OR
                    LOWER(i.SKU) LIKE ? OR
                    LOWER(i.boxId) LIKE ? OR
                    LOWER(i.discription) LIKE ?
                )
                `
                const wildcardTerm = `%${term}%`;
                values.push(wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm)
            }
        
            if (brandDivVal) {
                sql += `AND b.name = ?`;
                values.push(brandDivVal)
            }
            if (categoryDivVal) {
                sql += `AND c.name = ?`;
                values.push(categoryDivVal)
            }
        
            sql += ` ORDER BY i.display_order ASC LIMIT ?; SELECT id FROM items ORDER BY display_order`;
            values.push(limit);
        
            db.query(sql, values, (err, filtItems) => {
                if (err) {
                    console.error('Error fetching items:', err);
                    res.status(500).send(err);
                    return;
                }
                const allItems = filtItems[1];
                let orderNum = 1;
                const cases = allItems.map(item => {
                    const str = `WHEN ${item.id} THEN ${orderNum}`;
                    orderNum += 1;
                    return str;
                }).join(' ');
                const ids = allItems.map(item => item.id);
                const sql = `UPDATE items SET display_order = CASE id ${cases} END WHERE id IN (${ids.join(',')})`;
                db.query(sql, (err) => {
                    if (err) {console.error(err); return res.status(500);}
                    res.json({ filtItems: filtItems[0], addedId: addedItem.insertId });
                })
            });
        })
    })
});

// Fetch all items with filtering
app.get('/itemsFilter2', (req, res) => {
    let limit = parseInt(req.query.limit, 10) || 70; // default to 70 if not provided
    const search = `${req.query.search || ''}`;
    const brandDivVal = req.query.brandDivVal === 'Select brand..' ? '' : req.query.brandDivVal;
    const categoryDivVal = !req.query.categoryDivVal ? false : req.query.categoryDivVal === 'Select category..' ? '' : req.query.categoryDivVal.replace(/plus/g, '+');
    let sql = `SELECT 
    i.id, 
    b.name AS brand_name, 
    m.name AS model_name, 
    c.name AS category_name, 
    q.name AS quality_name, 
    i.quantity, 
    i.buyPrice, 
    i.priceOne, 
    i.display_order, 
    i.changingId, 
    i.SKU, 
    i.boxId, 
    i.disable, 
    i.noExcel, 
    i.discription, 
    c.circle_ball AS ball 
    FROM items i 
    JOIN brand b ON i.brand = b.id 
    JOIN model m ON i.model = m.id 
    JOIN category c ON i.category = c.id 
    JOIN quality q ON i.quality = q.id 
    WHERE 1=1`;
    const values = [];
    if (search !== '') {
        const searchTerms  = search.toLocaleLowerCase().split(' ');
        for(const term of searchTerms ) {
            sql += ` AND i.fullName LIKE ?
            `
            values.push(`%${term}%`)
        }
    }

    if (brandDivVal) {
        sql += `AND b.name = ?`;
        values.push(brandDivVal)
    }
    if (categoryDivVal) {
        sql += `AND c.name = ?`;
        values.push(categoryDivVal)
    }

    sql += ` ORDER BY i.display_order ASC LIMIT ?;`;
    values.push(limit);

    db.query(sql, values, (err, filtItems) => {
        if (err) {
            console.error('Error fetching items:', err);
            res.status(500).send(err);
            return;
        }
        const sql = "SELECT i.id, b.name AS brand_name, m.name AS model_name, c.name AS category_name, q.name AS quality_name, i.quantity, i.buyPrice, i.priceOne, i.display_order, i.changingId, i.SKU, i.boxId, i.disable, i.noExcel, i.discription, c.circle_ball AS ball FROM items i JOIN brand b ON i.brand = b.id JOIN model m ON i.model = m.id JOIN category c ON i.category = c.id JOIN quality q ON i.quality = q.id ORDER BY i.display_order"
        res.json({ filtItems });
    });
});

const posInvQuery = `
   SELECT posinvoices.id, 
        DATE_FORMAT(posinvoices.newDate, "%Y-%m-%d, %H:%i:%s") AS newDate, 
        posinvoices.items, 
        customers.name AS customer_name, 
        deliveries.name AS delivery_name,
        workers.name AS worker_name,
        posinvoices.total, 
        posinvoices.discount,
        posinvoices.netTotal,
        posinvoices.note, 
        posinvoices.invStatus,
        posinvoices.totalQuantity, 
        posinvoices.customerId,
        posinvoices.delFee,
        posinvoices.deliveryId,
        posinvoices.workerId,
        posinvoices.orders,
        posinvoices.priceLevel,
        posinvoices.computerName,
        posinvoices.itemIds,
        JSON_ARRAYAGG(JSON_OBJECT(
            'inv_id', positems.pos_id,
            'itemId', positems.itemId,
            'quantity', positems.quantity,
            'sellPrice', positems.sellPrice,
            'targstockinvs', (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                    'quantity', targstockinvs.quantity,
                    'stockInv_id', targstockinvs.stockInv_id,
                    'buyPrice', stockitems.buyPrice
                    )
                )
                FROM targstockinvs
                LEFT JOIN stockitems 
                    ON stockitems.inv_id = targstockinvs.stockInv_id
                    AND stockitems.itemId = targstockinvs.itemId
                WHERE targstockinvs.pos_id = positems.pos_id
                AND targstockinvs.itemId = positems.itemId
            ),
            'sku', items.SKU,
            'boxId', items.boxId,
            'existQnt', items.quantity,
            'discrip', items.discription,
            'name', CONCAT(brand.name, ' ', model.name, ' ', category.name, ' ', quality.name),
            'fullName', items.fullName
        )) AS posItems
    FROM posinvoices 
    JOIN customers ON customers.id = posinvoices.customerId
    LEFT JOIN deliveries ON deliveries.id = posinvoices.deliveryId
    LEFT JOIN workers ON workers.id = posinvoices.workerId
    LEFT JOIN positems ON positems.pos_id = posinvoices.id
    LEFT JOIN items ON items.id = positems.itemId
    LEFT JOIN brand ON brand.id = items.brand
    LEFT JOIN model ON model.id = items.model
    LEFT JOIN category ON category.id = items.category
    LEFT JOIN quality ON quality.id = items.quality
    WHERE posinvoices.id = ?
`
// Fetch all items with filtering with extra function and queries and alos updating
app.get('/itemsFilter-extra', (req, res) => {
    const currInvId = req.query.currInvId;
    let limit = parseInt(req.query.limit, 10) || 70;
    const search = `${req.query.search || ''}`;
    const categoryDivVal = !req.query.categoryDivVal ? false : req.query.categoryDivVal === 'Select category..' ? '' : req.query.categoryDivVal.replace(/plus/g, '+');
    let sql = 
    `SELECT 
        i.id, 
        b.name AS brand_name, 
        m.name AS model_name, 
        c.name AS category_name, 
        q.name AS quality_name, 
        i.quantity, 
        i.buyPrice, 
        i.priceOne0, 
        i.priceTwo, 
        i.priceThree, 
        i.priceOne, 
        i.priceFive, 
        i.priceSix, 
        i.priceSevin, 
        i.display_order, 
        i.changingId, 
        i.SKU, 
        i.boxId, 
        i.disable, 
        i.noExcel, 
        i.discription, 
        c.circle_ball AS ball
        FROM items i 
        JOIN brand b ON i.brand = b.id 
        JOIN model m ON i.model = m.id 
        JOIN category c ON i.category = c.id 
        JOIN quality q ON i.quality = q.id 
        WHERE 1=1
    `;
    const values = [];
    if (search !== '') {
        const searchTerms  = search.toLocaleLowerCase().split(' ');
        for(const term of searchTerms ) {
            sql += ` AND i.fullName LIKE ?`
            values.push(`%${term}%`)
        }
    }

    if (categoryDivVal) {
        sql += ` AND c.name = ?`;
        values.push(categoryDivVal)
    }

    sql += ` ORDER BY i.display_order ASC LIMIT ?;`;
    values.push(limit);
    db.query(sql, values, (err, filteredItems) => {
        if (err) {console.error('Error fetching items:', err); return res.status(500).send(err);}
        let filItemIds = filteredItems.map(i => i.id);
        if (filItemIds.length === 0) filItemIds.push(-1)
        const sql = `
            SELECT st.itemId, st.quantity FROM stockitems st
            JOIN stockentinvs stInv ON stInv.id = st.inv_id 
            WHERE stInv.invStatus = 'Pending' AND st.itemId IN (${filItemIds});
        `;
        db.query(sql, (err, stockItems) => {
            if (err) {console.error(err); return res.status(500);}
            db.query('SELECT id, name FROM workers', (err, workers) => {
                if (err) {console.error(err); return res.status(500);}
                db.query('SELECT * FROM profits', (err, profits) => {
                    if (err) {console.error(err); res.status(500);}
                    db.query('SELECT customerId FROM posinvoices WHERE id = ? LIMIT 1', [currInvId], (err, custId) => {
                        if (err) {console.error(err); res.status(500)}
                        const customerId = custId[0]?.customerId || 1;
                        db.query('SELECT id, amount, invoiceNum, customer_id, note, oldAmount FROM loans WHERE customer_id = ?', [customerId || 1], (err, loans) => {
                            if (err) {console.error(err); res.status(500)}
                            if (currInvId) { // Which means if it's an invoice edit.
                                const sql = `
                                SELECT 
                                    po.id, 
                                    po.customerId, 
                                    po.deliveryId, 
                                    po.workerId,
                                    DATE_FORMAT(po.newDate, "%Y-%m-%d, %H:%i:%s") AS newDate,
                                    JSON_ARRAY() AS posItems,
                                    po.invStatus,
                                    po.total,
                                    po.discount,
                                    po.netTotal,
                                    po.totalQuantity,
                                    cu.name AS customer_name,
                                    de.name AS delivery_name,
                                    po.note,
                                    po.priceLevel
                                    FROM posinvoices po 
                                    JOIN customers cu ON cu.id = po.customerId
                                    JOIN deliveries de ON de.id = po.deliveryId
                                    WHERE po.id = ?`
                                db.query(sql, [currInvId], (err, posInvoice) => {
                                    if (err) {console.error(err); res.status(500);}
                                    const sql =`
                                        SELECT
                                            pi.itemId, 
                                            pi.quantity, 
                                            pi.sellPrice,
                                            CONCAT(b.name, ' ', m.name, ' ', c.name, ' ', q.name) AS name,
                                            i.boxId,
                                            i.sku,
                                            i.buyPrice,
                                            i.priceOne0,
                                            i.priceTwo,
                                            i.priceThree,
                                            i.priceOne,
                                            i.priceFive,
                                            i.priceSix,
                                            i.priceSevin
                                            FROM positems pi 
                                            JOIN items i ON i.id = pi.itemId
                                            JOIN brand b ON b.id = i.brand
                                            JOIN model m ON m.id = i.model
                                            JOIN category c ON c.id = i.category
                                            JOIN quality q ON q.id = i.quality
                                        WHERE pi.pos_id = ?
                                    `
                                    db.query(sql, [currInvId], (err, posItems) => {
                                        if (err) {console.error(err); res.status(500)}
                                        if (posInvoice[0]) posInvoice[0].posItems = posItems;
                                        const sql = `
                                        SELECT 
                                            trSt.itemId, 
                                            trSt.quantity, 
                                            trSt.stockInv_id,
                                            stIt.buyPrice
                                        FROM targstockinvs trSt
                                        JOIN stockitems stIt ON 
                                        stIt.inv_id = trSt.stockInv_id
                                        AND stIt.itemId = trSt.itemId
                                        WHERE pos_id = ?
                                        `;
                                        db.query(sql, [currInvId], (err, tarStInvs) => {
                                            if (err) {console.error(err); res.status(500);}
                                            posItems.forEach(i => {
                                                const tarSt = tarStInvs.filter(inv => i.itemId === inv.itemId);
                                                i.tarStInvs = tarSt;
                                            })
                                            res.json({
                                                items: filteredItems,
                                                stockItems,
                                                workers,
                                                posInvoice: posInvoice[0],
                                                profits,
                                                loans
                                            });
                                        })
                                    })
                                })
                            } else {
                                res.json({
                                    items: filteredItems, 
                                    stockItems, 
                                    workers, 
                                    profits,
                                    loans
                                });
                            }
                        })
                    })
                })
            })
        })
    });
});

// Fetch an item by ID
app.get('/items/:id', (req, res) => {
    const itemId = req.params.id;
    const sql = 'SELECT i.id, b.name AS brand_name, b.id AS brand_id, m.name AS model_name, m.id AS model_id, c.name AS category_name, c.id AS category_id, q.name AS quality_name, q.id AS quality_id, i.quantity, i.buyPrice, i.priceOne, i.disable, i.noExcel, i.discription, i.SKU, i.boxId FROM items i JOIN brand b ON i.brand = b.id JOIN model m ON i.model = m.id JOIN category c ON i.category = c.id JOIN quality q ON i.quality = q.id WHERE i.id  = ?';
    db.query(sql, [itemId], (err, result) => {
        if (err) {
            console.error('Error fetching target item', err)
            return res.status(500).json({ error: 'Database error'});
        }
        if (result.length === 0) {
            return res.status(404).json({error: 'Item not found'});
        }
        res.json(result[0]);
    });
});

// Fetch an item by ID
app.get('/items-andChecktheBox/:id', (req, res) => {
    const itemId = req.params.id;
    const sql = 'SELECT i.id, b.name AS brand_name, b.id AS brand_id, m.name AS model_name, m.id AS model_id, c.name AS category_name, c.id AS category_id, q.name AS quality_name, q.id AS quality_id, i.quantity, i.buyPrice, i.priceOne, i.disable, i.noExcel, i.discription, i.SKU, i.boxId FROM items i JOIN brand b ON i.brand = b.id JOIN model m ON i.model = m.id JOIN category c ON i.category = c.id JOIN quality q ON i.quality = q.id WHERE i.id  = ?';
    db.query(sql, [itemId], (err, targItem) => {
        const item = targItem[0];
        const updatedField = req.query.updatedField;
        const updatedValue = item[updatedField] === 'checked' ? 'No': 'checked'
        if (err) {console.error('Error fetching target item', err); return res.status(500).json({ error: 'Database error'});}
        db.query(`UPDATE items SET ${updatedField} = ? WHERE id = ?`, [updatedValue, itemId], (err) => {
        if (err) {console.error(err); return res.status(500);}
            res.json({ success: true });
        })
    });
});

// Fetch different items once through posting from frontend
app.post('/items/batch', async (req, res) => {
  const ids = req.body; // expecting [1, 2, 3, ...]
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Invalid ID array" });
  }
  const sql = `SELECT id, quantity FROM items WHERE id IN (${ids.join(',')})`;
    db.query(sql, (err, rows) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows); // ✅ rows = array of items
    });

});

// Fetch different items once through posting from frontend and updating
app.post('/items-and-updateStock/batch', async (req, res) => {
    const items = req.body.items;
    const ids = items.map(item => item.id)
    const invId = req.query.invId;
    db.query('SELECT * FROM stockentinvs WHERE id = ?', [invId], (err, currentInv) => {
        if (err) {console.error(err); return res.static(500);}
        if (currentInv[0].invStatus !== 'Pending') return res.json({ currentInv: currentInv[0] });
        db.query(`UPDATE stockentinvs SET invStatus = 'Submitted' WHERE id = ?`, [invId], (err) => {
            if (err) {console.error(err); return res.static(500);}
        })
        const sql = `SELECT id, quantity FROM items WHERE id IN (${ids.join(',')})`;
        db.query(sql, (err, rows) => {
            if (err) {console.error(err); return res.status(500)}
            const updatedItems = rows.map(dbItem => {
                const addedQty = Number(items.find(item => item.id === dbItem.id).quantity) || 0;
                return {
                    id: dbItem.id,
                    quantity: Number(dbItem.quantity) + addedQty
                };
            });
            const quantityCases = updatedItems.map(item => `WHEN ${item.id} THEN ${item.quantity}`).join(' ');
            const ids = updatedItems.map(item => item.id).join(',')
            const updateItemQntSql = `UPDATE items set quantity = CASE id
            ${quantityCases} END WHERE id IN (${ids})`;
            db.query(updateItemQntSql, (err) => {if (err) {console.error(err); return res.status(500)}})
    
            const getInvoiceSql = `DELETE FROM stockitems WHERE inv_id = ?`;
            db.query(getInvoiceSql, [invId], (err) => {
                if (err) {console.error(err);return res.status(500)}
                const newStockItems = items;
                const values = [];
                const placeHols = newStockItems.map(i => `(?, ?, ?, ?, ?)`).join(', ');
                for (const i of newStockItems) values.push(invId, i.id, i.quantity, i.quantity, i.buyPrice);
                const sql = `INSERT INTO stockitems (inv_id, itemId, quantity, lastQuantity, buyPrice) VALUES ${placeHols}`;
                db.query(sql, values, (err) => {if (err) {console.error(err); return res.status(500)}})
            })
            if (req.body.checkboxInp) {
                const ids = items.map(item => item.id);
                const priceCases = items.map(item => `WHEN ${item.id} THEN ${item.buyPrice}`).join(' ');
                const sql = `
                UPDATE items
                SET buyPrice = CASE id
                ${priceCases}
                END
                WHERE id IN (${ids.join(',')})`;
    
                db.query(sql, (err) => {
                    if (err) {console.error(err); return res.status(500)}
                    res.json({ success: true, currentInv: currentInv[0]});
                });
            } else res.json({ success: true, currentInv: currentInv[0]});
        });
    })
});

// Do everything for selling(paying) (an) item(s)
app.post('/items/pay', async (req, res) => {
  const paidItems = req.body.paidItems;
  const ids = paidItems.map(item => item.id);
    const checkItemSql = `SELECT id, quantity FROM items WHERE id IN (${ids.join(',')})`;
    db.query(checkItemSql, (err, rows) => {
        if (err) {console.error(err); return res.status(500).json({ error: 'Database error' })}
        for(const sellItem of paidItems) {
            const id = sellItem.id;
            const sellQnt = sellItem.sellQnt;
            const name = sellItem.name;
            const dbItemQnt = rows.find(item => item.id === id).quantity;
            if (dbItemQnt < sellQnt) {
                return res.json({ success: false, itemName: name});
            }
        };
        const updatedQntArrey = rows.map(item => {
            const id = item.id;
            const itemDbQnt = Number(item.quantity);
            const sellQnt = Number(paidItems.find(item => item.id === id).sellQnt);
            const updatedQnt = itemDbQnt - sellQnt;
            return {id: id,updatedQnt: updatedQnt}
        });
        const allItemIds = updatedQntArrey.map(item => item.id);
        const quantityCases = updatedQntArrey.map(item => `WHEN ${item.id} THEN ${item.updatedQnt}`).join(' ');
        const updateQntSql = `UPDATE items set quantity = CASE id ${quantityCases} END WHERE id IN (${allItemIds.join(',')})`;
        db.query(updateQntSql, (err) => {if (err) {console.error(err);return res.status(500)}});
        const sql = `SELECT 
        entInv.invStatus,
        stIt.id,
        stIt.inv_id,
        stIt.itemId,
        stIt.quantity,
        stIt.lastQuantity,
        stIt.buyPrice
        FROM stockitems AS stIt
        LEFT JOIN stockentinvs AS entInv ON stIt.inv_id  = entInv.id
        WHERE stIt.lastQuantity != 0 AND entInv.invStatus != 'Pending'`;
        db.query(sql, (err, stItems) => {
            if (err) {console.error(err); return res.status(500)}
            let remainingQuantity;
            const itemPosDet = [];
            firstLoop: for(const item of paidItems) {
                const id = item.id;
                const qnt = item.sellQnt;
                const sellPri = Number(item.sellPri);
                remainingQuantity = qnt;
                itemPosDet.push({ itemId: id, posQnt: qnt, sellPri,  itemStInvs: []});
                const tarStItems = stItems.filter(i => i.itemId === id);
                let isPushed;
                secondLoop: for(const i of tarStItems) {
                    if (!i) continue;
                    const targ = itemPosDet?.find(obj => obj.itemId === id);
                    if (i.lastQuantity >= remainingQuantity) {
                        i.lastQuantity -= remainingQuantity;
                        if (targ) targ.itemStInvs.push({
                            itemId: id, 
                            stInvs: i.inv_id, 
                            stQnt: remainingQuantity 
                        })
                        const sql = 'UPDATE stockitems SET lastQuantity = ? WHERE id = ?';
                        db.query(sql, [i.lastQuantity, i.id], (err) => {
                            if (err) {console.error(err); return res.status(500)}
                        })
                        remainingQuantity = 0;
                    } else {
                        remainingQuantity -= i.lastQuantity;
                        if (targ) targ.itemStInvs.push({
                            itemId: id, 
                            stInvs: i.inv_id, 
                            stQnt: i.lastQuantity 
                        })
                        const sql = 'UPDATE stockitems SET lastQuantity = ? WHERE id = ?';
                        db.query(sql, [0, i.id], (err) => {
                            if (err) {console.error(err); return res.status(500);}
                        });
                    }
                    //if (!isPushed) itemPosDet.push({ itemStInvs });;
                    if (remainingQuantity === 0) {break secondLoop; };
                }
            }
            const sql = 'SELECT * FROM customers WHERE id = ?';
            db.query(sql, [paidItems[0].custId], async (err, customer) => {
                if (err) {console.error(err);return res.status(500)}
                let newDate;
                if (req.body.isInvoiceedit) {
                    const sql = 'SELECT DATE_FORMAT(newDate, "%Y-%m-%d, %H:%i:%s") AS newDate FROM posinvoices WHERE id = ?';
                    try {
                        const dbNewDate = await queryAsync(sql, [req.body.invoiceNum]);
                        newDate = dbNewDate[0].newDate;
                    } catch (err) {console.error(err); return res.status(500)}
                } else {newDate = req.body.newDate;}
                const {customerId, deliveryId, workerId, orders, total, discount, netTotal, invStatus, totalQuantity, note, priceLevel, computerName, itemIds } 
                = req.body.posInvoiceData;
                const delFee = customer[0].delFee;
                const sql2 = `
                INSERT INTO posinvoices (
                    newDate, customerId, delFee, deliveryId, workerId, orders, total, discount, netTotal,
                    invStatus, totalQuantity, note, priceLevel, computerName, itemIds
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                db.query(sql2, [newDate, customerId, delFee, deliveryId, workerId, orders, total, discount, netTotal, invStatus, totalQuantity, note, priceLevel, computerName, itemIds], (err, addedInvoice) => {
                    if (err) {console.error('Error adding the pos invoice:', err); return res.status(500)}
                    const addedInvNum = addedInvoice.insertId;
                    const placeHols = itemPosDet.map(i => '(?, ?, ?, ?)').join(', ');
                    const values = itemPosDet.map(i => [addedInvNum, i.itemId, i.posQnt, i.sellPri]).flat();
                    const sql = `INSERT INTO positems (pos_id, itemId, quantity, sellPrice) VALUES ${placeHols};`

                    db.query(sql, values, (err) => {
                        if (err) {console.error(err); return res.status(500)}
                    });
                    const itemStockInvoices = itemPosDet.some(i => i.itemStInvs.length !== 0);
                    if (itemStockInvoices)  {
                        let placeHols2 = [];
                        itemPosDet.forEach(i => {
                            i.itemStInvs.forEach(it => placeHols2.push(`(?, ?, ?, ?)`));
                        });
                        let values2 = [];

                        itemPosDet.forEach(i => {i.itemStInvs.forEach(i => values2.push(addedInvNum, i.itemId, i.stQnt, i.stInvs))});
                        const sql2 = `INSERT INTO targstockinvs (pos_id, itemId, quantity, stockInv_id) VALUES ${placeHols2.join(', ')};`
                        db.query(sql2, values2, (err) => {
                            if (err) {console.error(err); return res.status(500)}
                    })}
                    if (!req.body.isInvoiceedit) {
                        if (req.body.loanCheckbox) {
                            const sql = 'INSERT INTO loans (amount, invoiceNum, note, customer_id) VALUES (?, ?, ?, ?)';
                            const { amount, note, customer_id} = req.body.loanDetail;
                            db.query(sql, [amount, addedInvNum, note, customer_id], (err, result) => {
                                if (err) {console.error('Error inserting the loan'); return res.status(500)}
                            })
                        }
                    } else if (req.body.isInvoiceedit) {
                        if (req.body.loanCheckbox) {
                            const sql = `SELECT * FROM loans WHERE invoiceNum = ?; 
                            SELECT * FROM loans WHERE customer_id = ? AND note = 'All Paid'`;
                            const invoiceId = req.body.invoiceNum;
                            const custId = Number(req.body.custId);
                            db.query(sql, [invoiceId, custId], (err, result) => {
                                if (err) {console.error( err);return res.status(500)}
                                const currLoan = result[0];
                                const PaidLoans = result[1];
                                const latestAllpaid = PaidLoans?.reduce((max, loan) => (loan.id > (max?.id || 0) ? loan : max), null);
                                if (currLoan.length !== 0 && (latestAllpaid ? latestAllpaid.id < currLoan[0].id : true)) {
                                    const loanId = currLoan[0].id;
                                    const sql = `UPDATE loans SET amount = ?, invoiceNum = ?, customer_id = ?, oldAmount = 0 WHERE id = ?`;
                                    db.query(sql, [req.body.amount, addedInvNum, custId, loanId], (err, result) => {
                                        if (err) {console.error(err);return res.status(500)}
                                    });
                                } else {
                                    const sql = 'INSERT INTO loans (amount, invoiceNum, note, customer_id) VALUES (?, ?, ?, ?)';
                                    const { amount, note, customer_id} = req.body.loanDetail;
                                    db.query(sql, [amount, addedInvNum, note, customer_id], (err, result) => {
                                        if (err) {console.error('Error inserting the loan'); return res.status(500);}
                                    })
                                }
                            })
                        }
                        const sql3 = 'UPDATE posinvoices set invStatus = ? WHERE id = ?';
                        db.query(sql3, ['Canceled2', req.body.invoiceNum], (err, result) => {
                            if (err) {
                                console.error('Error updating the posinvoice');
                                return res.status(500);
                            }
                        })
                    }
                    db.query('SELECT * FROM customers WHERE id = ?', [req.body.custId], (err, customer) => {
                        if (err) {console.error(err); res.status(500);}
                        db.query('SELECT * FROM deliveries WHERE id = ?', [req.body.delId], (err, delivery) => {
                            if (err) {console.error(err); res.status(500);}
                            db.query('SELECT * FROM loans WHERE customer_id = ?', [req.body.custId], (err, loanList) => {
                                if (err) {console.error(err); res.status(500);}
                                res.json({
                                    success: true,
                                    newInvNum: addedInvNum,
                                    customer: customer[0],
                                    delivery: delivery[0],
                                    loanList,
                                });
                            })
                        })
                    })
                })
            })
        })
    });
});

// Selling (an) items(s)
app.post('/sell-item', (req, res) => {
    const soldItems = req.body.soldItems;
    const currInvId = req.body.invId;
    const sql = 'SELECT * FROM posinvoices WHERE id = ?';
    db.query(sql, [currInvId], (err, posInv) => {
        if (err) {console.error(err); return res.status(500);};
        if (posInv[0].invStatus !== 'Paid') return res.json({ invStat: 'NotPaid' });

        const sql1 = 'UPDATE posinvoices SET invStatus = ? WHERE id = ?';
        db.query(sql1, ['Canceled', currInvId], (err) => {if (err) {console.error(err); return res.status(500);}})

        const sql2 = 'SELECT * FROM items';
        db.query(sql2, (err, items) => {
            if (err) {console.error(err); return res.status(500);}
            const updatedItemQnts = soldItems.map(item => {
                const soldItemId = item.id;
                const soldQnt = item.qnt;
                const dbTarItemQnt = items.find(item => item.id === soldItemId).quantity;
                const updatedQnt = soldQnt + dbTarItemQnt;
                return {
                    id: soldItemId,
                    updatedQnt: updatedQnt
                }
            })
            const soldIds = soldItems.map(item => item.id);
            const qntCases = updatedItemQnts.map(item => `WHEN ${item.id} THEN ${item.updatedQnt}`).join(' ');
            const sql3 = `UPDATE items SET quantity = CASE id
            ${qntCases} END WHERE id IN (${soldIds.join(',')})`
            db.query(sql3, (err) => {if (err) {console.error(err); return res.status(500);}});
        });

        db.query('SELECT * FROM targstockinvs WHERE pos_id = ?; SELECT * FROM stockitems' , [currInvId], (err, result) => {
            if (err) {console.error(err); return res.status(500)}
            const targStItems = result[0];
            const stockItems = result[1];
            for (const i of targStItems) {
                const itemId = i.itemId;
                const stInvId = i.stockInv_id;
                const soldQnt = i.quantity;
                if (!stInvId) continue;
                const stockInv = stockItems.find(it => it.inv_id === stInvId && it.itemId === itemId);
                let stLastQnt = stockInv.lastQuantity;
                stLastQnt += soldQnt;
                db.query('UPDATE stockitems SET lastQuantity = ? WHERE inv_id = ? and itemId = ?', [stLastQnt, stInvId, itemId], (err) => {
                    if (err) {console.error(err); return res.status(500)}
                })
            }
        })
        const custId = posInv[0].customerId;
        const sql = `SELECT * FROM loans WHERE invoiceNum = ?; SELECT * FROM loans WHERE customer_id = ? AND note = 'All Paid'`;
        db.query(sql, [currInvId, custId], (err, result) => {
            if (err) {console.error(err);return res.status(500);}
            const currLoan = result[0];
            const PaidLoans = result[1];
            const latestAllpaid = PaidLoans?.reduce((max, loan) => (loan.id > (max?.id || 0) ? loan : max), null);
            if (currLoan.length !== 0 && (latestAllpaid ? latestAllpaid.id < currLoan[0].id : true)) {
                db.query('UPDATE loans SET amount = 0 WHERE invoiceNum = ?', [currInvId], (err) => {
                    if (err) {console.error(err); return res.status(500);}
                    res.json({ success: true })
                })
            } else {res.json({ success: true })}
        })
    })
})

// if I click the invioce print without paying items
app.get('/onlyClickInvoicePrint', (req, res) => {
    const custId = req.query.custId;
    const delId = req.query.delId;
    const currInvId = req.query.currInvId;
    db.query('SELECT * FROM customers WHERE id = ?', [custId], (err, customer) => {
        if (err) {console.error(err); res.status(500);}
        db.query('SELECT * FROM deliveries WHERE id = ?', [delId], (err, delivery) => {
            if (err) {console.error(err); res.status(500);}
            db.query('SELECT * FROM loans WHERE customer_id = ?', [custId], (err, loanList) => {
                if (err) {console.error(err); res.status(500);}
                    const sql = `SELECT id, DATE_FORMAT(newDate, "%Y-%m-%d, %H:%i:%s") AS newDate, 
                    items, total, discount, netTotal, note, invStatus, totalQuantity, customerId, 
                    deliveryId, workerId, orders, priceLevel, computerName
                    FROM posinvoices 
                    WHERE id = ?`;
                db.query(sql, [currInvId], (err, tarPosInv) => {
                    if (err) {console.error(err); res.status(500);}
                    res.json({ customer: customer[0], delivery: delivery[0], loanList, currInv: tarPosInv[0]});
                })
            })
        })
    })
})

// Add a new item
app.post('/items', (req, res) => {
    const { id, SKU, boxId, disable, noExcel, brand, model, category, quality, quantity, buyPrice, priceOne, display_order, changingId } = req.body;
    const sql = 'INSERT INTO items (id, SKU, boxId, disable, noExcel, brand, model, category, quality, quantity, buyPrice, priceOne, display_order, changingId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [id, SKU, boxId, disable, noExcel, brand, model, category, quality, quantity, buyPrice, priceOne, display_order, changingId], (err, result) => {
        if (err) {
            console.error('Error adding item:', err);
            res.status(500).send(err);
            return;
        }
        res.json({ id: result.insertId, ...req.body });
    });
});

// add an order to the items
app.post("/update-order", (req, res) => {
    const { orderedItems } = req.body; // Array of ordered item IDs
    let query = "UPDATE items SET display_order = CASE id ";
    let values = [];
    
    orderedItems.forEach((id, index) => {
        query += `WHEN ? THEN ? `;
        values.push(id, index);
    });

    query += "END WHERE id IN (?)";
    values.push(orderedItems);

    db.query(query, values, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// add an order to the items
app.post("/update-orderMine", (req, res) => {
    const targRowId = req.query.targRowId;
    const toLower = req.body.toLower;
    const transfereditemId = req.query.transfereditemId;
    db.query('SELECT * FROM items WHERE id = ?', [targRowId], (err, item) => {
        if (err) {console.error(err); return res.status(500);}
        const targItem = item[0];
        const newOrder = toLower ? (Number(targItem.display_order) + 0.1) : (Number(targItem.display_order) - 0.1);
        db.query('UPDATE items SET display_order = ? WHERE id = ?', [newOrder, transfereditemId], (err) => {
            if (err) {console.error(err); return res.status(500);}
            db.query('SELECT id FROM items ORDER BY display_order', (err, allItemIds) => {
                if (err) {console.error(err); return res.status(500);}
                let orderNum = 0;
                const cases = allItemIds.map(item => {
                    const str = `WHEN ${item.id} THEN ${orderNum}`;
                    orderNum++;
                    return str;
                }).join(' ');
                const ids = allItemIds.map(item => item.id);
                const sql = `UPDATE items SET display_order = CASE id ${cases} END WHERE id IN (${ids.join(',')})`
                db.query(sql, (err) => {
                    if (err) {console.error(err); return res.status(500);}
                    res.json({ success: true })
                })
            })
        })
    })
});

// Update an item
app.put('/items/:id', (req, res) => {
    const itemId = req.params.id;
    const updatedField = req.body; // The updated field will be dynamically passed (e.g., brand, model, etc.)
    // Since you're updating a specific field, we'll use the name of the field dynamically
    const fieldName = Object.keys(updatedField)[0];  // Get the key of the updated field (e.g., brand, model)
    const fieldValue = updatedField[fieldName];      // Get the value of the updated field
  
    const sql = `UPDATE items SET ${fieldName} = ? WHERE id = ?`;
  
    db.query(sql, [fieldValue, itemId], (err, result) => {
      if (err) {
        console.error('Error updating item:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
      res.json({ id: itemId, [fieldName]: fieldValue }); // Return the updated item
    });
});

// Updadte multiple item prices once
app.put('/multipleItems/buyPrice', async (req, res) => {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Invalid items array" });
    }
    const ids = items.map(item => item.id);
    const priceCases = items.map(item => `WHEN ${item.id} THEN ${item.buyPrice}`).join(' ');
    const sql = `
    UPDATE items
    SET buyPrice = CASE id
    ${priceCases}
    END
    WHERE id IN (${ids.join(',')})`

    db.query(sql, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    res.json(rows); // ✅ rows = array of items
    });
})

// Updadte multiple item quantities once
app.put('/multipleItems/quantity', async (req, res) => {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid items array" });
    }
    const ids = items.map(item => item.id);
    const quantityCases = items.map(item => `WHEN ${item.id} THEN ${item.quantity}`).join(' ');
    const sql = `
    UPDATE items
    SET quantity = CASE id
    ${quantityCases}
    END
    WHERE id IN (${ids.join(',')})`

    db.query(sql, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    res.json(rows); // ✅ rows = array of items
    });
})

// Delete an item
app.delete('/items/:id', (req, res) => {
    const itemId = req.params.id;
    db.query('DELETE FROM items WHERE id = ?', [itemId], (err, result) => {
        if (err) {
            console.error('Error deleting item:', err);
            res.status(500).send(err);
            return;
        }
        res.sendStatus(200);
    });
});

function getFiltItemsQuery(limit, searchTerms, brandDivVal, categoryDivVal, callback) {
    let sql = "SELECT i.id, b.name AS brand_name, m.name AS model_name, c.name AS category_name, q.name AS quality_name, i.quantity, i.buyPrice, i.priceOne, i.display_order, i.changingId, i.SKU, i.boxId, i.disable, i.noExcel, i.discription, c.circle_ball AS ball FROM items i JOIN brand b ON i.brand = b.id JOIN model m ON i.model = m.id JOIN category c ON i.category = c.id JOIN quality q ON i.quality = q.id WHERE 1=1";
    const values = [];
    for(const term of searchTerms ) {
        sql += `
        AND (
            LOWER(b.name) LIKE ? OR
            LOWER(m.name) LIKE ? OR
            LOWER(q.name) LIKE ? OR
            LOWER(c.name) LIKE ? OR
            LOWER(i.SKU) LIKE ? OR
            LOWER(i.boxId) LIKE ? OR
            LOWER(i.discription) LIKE ?
        )
        `
        const wildcardTerm = `%${term}%`;
        values.push(wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm, wildcardTerm)
    }

    if (brandDivVal) {
        sql += `AND b.name = ?`;
        values.push(brandDivVal)
    }
    if (categoryDivVal) {
        sql += `AND c.name = ?`;
        values.push(categoryDivVal)
    }

    sql += ` ORDER BY i.display_order ASC LIMIT ?;`;
    values.push(limit);

    db.query(sql, values, callback)
}

// Delete an item
app.delete('/items-delAndGet/:id', (req, res) => {
    const itemId = req.params.id;
    let limit = parseInt(req.query.limit, 10) || 70; // default to 1000000 if not provided
    const search = `%${req.query.search || ''}%`;
    const searchTerms  = search.toLocaleLowerCase().split(' ');
    const brandDivVal = req.query.brandDivVal === 'Select brand..' ? '' : req.query.brandDivVal;
    const categoryDivVal = !req.query.categoryDivVal ? false : req.query.categoryDivVal === 'Select category..' ? '' : req.query.categoryDivVal.replace(/plus/g, '+');

    db.query('SELECT * FROM stockitems WHERE itemId = ? LIMIT 1', [itemId], (err, tarItems) => {
        if (err) {console.error(err); return res.status(500);}
        const exists = tarItems.length !== 0;
        if (exists) { return res.json({ item: 'exists' })}
        db.query('DELETE FROM items WHERE id = ?', [itemId], (err, result) => {
            if (err) {
                console.error('Error deleting item:', err); return res.status(500).send(err);}
            getFiltItemsQuery(limit, searchTerms, brandDivVal, categoryDivVal, (err, filtItems) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({ filtItems });
            });
        })
    });
});

// Stock Entry:---------

// Fetch all stock entry invoices
app.get('/stockentinvs', (req, res) => {
    const sql = 'SELECT id, DATE_FORMAT(nowDate, "%Y-%m-%d, %H:%i:%s") AS nowDate, invStatus, sku FROM stockentinvs';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching stock entry invoices:', err);
            return res.status(500).json({ error: 'Database error'});
        }
        res.json(result)
    })
});

// Fetch all stock entry invoices
app.get('/stockentinvs-items', (req, res) => {
    let sql = `SELECT
    st.inv_id,
    st.quantity,
    st.buyPrice
    FROM stockitems st
    JOIN items i ON i.id = st.itemId
    JOIN brand b ON b.id = i.brand
    JOIN model m ON m.id = i.model
    JOIN category c ON c.id = i.category
    JOIN quality q ON q.id = i.quality
    `;
    db.query(sql, (err, stockItems) => {
        if (err) {console.error(err); return res.status(500)}
        const values = [];
        const searVal = req.query.searVal;
        let sql = `SELECT 
        stInv.id, 
        DATE_FORMAT(stInv.nowDate, "%Y-%m-%d, %H:%i:%s") AS nowDate, 
        stInv.invStatus, 
        stInv.sku,
        stInv.remark
        FROM stockentinvs stInv`;
        if (searVal !== '') {
            const spliVal = searVal.split(' ')
            sql += ` 
            WHERE EXISTS (
                SELECT 1 FROM stockitems st
                JOIN items i ON i.id = st.itemId
                WHERE stInv.id = st.inv_id
            `
            spliVal.forEach(term => {
                sql += ' AND ('
                sql += `i.fullName LIKE ? OR stInv.remark LIKE ? OR stInv.sku LIKE ? OR nowDate LIKE ? OR stInv.id LIKE ?`;
                const wildcaTer = `%${term}%`;
                values.push(wildcaTer, wildcaTer, wildcaTer, wildcaTer, wildcaTer);
                sql += `)`
            })
            sql += `);`
        }
        db.query(sql, values, (err, stockInvs) => {
            if (err) {console.error(err); return res.status(500)} res.json({ stockInvs, stockItems })
            })
    })
});

app.delete('/items-updateAndDeleteStock', (req, res) => {
    const stockInvId = req.query.stockInvId;
    db.query(stockAndStockItemsQry(true), [stockInvId], (err, DbStockInv) => {
        if (err) {console.error(err); return res.status(500);}
        if (DbStockInv.length === 0) return res.json({ invoice: 'AlrDeleted' })
        const stockInv = DbStockInv[0];
        const stockInvItems = stockInv.items;
        const used = stockInvItems.some(item => item.quantity > item.lastQuantity);
        if (used) return res.json({ used: 'used'});
        if (stockInv.invStatus !== 'Pending') {
            db.query('SELECT * FROM items', (err, items) => {
                const updatedQntMapped = stockInvItems.map(item => {
                    const targTableItemQnt = Number(items.find(tabItem => tabItem.id === item.itemId).quantity);
                    const stockItemQnt = Number(item.quantity);
                    return { id: item.itemId, updQnt: targTableItemQnt - stockItemQnt}
                })
                if (err) {console.error(err); return res.status(500);}
                const quantityCases = updatedQntMapped.map(item => `WHEN ${item.id} THEN ${item.updQnt}`).join(' ');
                const ids = updatedQntMapped.map(item => item.id);
                const sql = `UPDATE items SET quantity = CASE id ${quantityCases} END WHERE id IN (${ids.join(',')})`
                db.query(sql, (err, result) => {
                    if (err) {console.error(err); return res.status(500);}})
            })
        }
        db.query('DELETE FROM stockentinvs WHERE id = ?', [stockInvId], (err, result) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({ result });
        })
    })
})

// Fetch a stock entry invoice by ID
app.get('/stockentinvs/:id', (req, res) => {
    const invoiceId = req.params.id;
    const sql = 'SELECT * FROM stockentinvs WHERE id = ?';
    db.query(sql, [invoiceId], (err, result) => {
        if (err) {
            console.error('Error fetching the stock entry invoice')
            return res.status(500).json({ error: 'Database error'});
        }
        res.json(result[0]);
    })
});

// Fetch a stock entry invoice by ID
app.get('/stockentinvs-get/:id', (req, res) => {
    const invoiceId = req.params.id;
    const sql = `
    SELECT 
    id,
    DATE_FORMAT(nowDate, "%Y-%m-%d, %H:%i:%s") AS nowDate,
    sku,
    remark,
    kilos,
    kiloPrice,
    todayDoller,
    todayRMB,
    invStatus
    FROM stockentinvs
    WHERE id = ?
    `;
    db.query(sql, [invoiceId], (err, invoice) => {
        if (err) {console.error(err); return res.status(500);}
        const sql = `
        SELECT 
        st.itemId,
        CONCAT(b.name, ' ', m.name, ' ', c.name, ' ', q.name) AS itemName,
        CONCAT(
        IFNULL(i.boxId, ''), ' ',
        IFNULL(i.SKU, ''), ' ',
        IFNULL(i.discription, '')
        ) AS itemDet,
        st.lastQuantity, 
        st.quantity, 
        st.buyPrice 
        FROM stockitems st
        JOIN items i ON i.id = st.itemId
        JOIN brand b ON b.id = i.brand
        JOIN model m ON m.id = i.model
        JOIN category c ON c.id = i.category
        JOIN quality q ON q.id = i.quality
        WHERE st.inv_id = ?
        `;
        db.query(sql, [invoiceId], (err, stokcItems) => {
        if (err) {console.error(err); return res.status(500)}
        invoice = invoice[0];
        invoice.items = stokcItems;
        res.json({ invoice });
        })
    })
});

// Add a new stock entry invoice
app.post('/stockentinvs-checkBox', (req, res) => {
    const { items, invStatus, sku, remark, kilos, kiloPrice, todayDoller, todayRMB } = req.body.newStockEntryInv;
    const newItemIds = JSON.parse(items).map(it => it.id);
    db.query(`SELECT id FROM items WHERE id IN (${newItemIds})`, (err, ids) => {
        if (err) {console.error(err); return res.status(500)}
        const notFoundIds = newItemIds.some(id => !ids.map(i => i.id).includes(id));
        const invalidId = newItemIds.find(id => !ids.map(i => i.id).includes(id));
        if (notFoundIds) return res.json({ result: 'notFoundId', invalidId });

        const sql = 'INSERT INTO stockentinvs (invStatus, sku, remark, kilos, kiloPrice, todayDoller, todayRMB) VALUES (?, ?, ?, ?, ?, ?, ?)';;
        db.query(sql, [invStatus, sku, remark, kilos, kiloPrice, todayDoller, todayRMB], (err, result) => {
            if (err) {console.error(err); return res.status(500)}
            const inv_id = result.insertId;
            const newStockItems = JSON.parse(items);
            const values = [];
            const placeHols = newStockItems.map(i => `(?, ?, ?, ?, ?)`).join(', ');
            for (const i of newStockItems) values.push(inv_id, i.id, i.quantity, i.quantity, i.buyPrice);
            const sql = `INSERT INTO stockitems (inv_id, itemId, quantity, lastQuantity, buyPrice) VALUES ${placeHols}`;
            db.query(sql, values, (err) => {if (err) {console.error(err); return res.status(500)}})
            if (req.body.priceBox) {
                const items = req.body.items;
                const ids = items.map(item => item.id);
                const priceCases = items.map(item => `WHEN ${item.id} THEN ${item.buyPrice}`).join(' ');
                const sql = `
                UPDATE items
                SET buyPrice = CASE id
                ${priceCases}
                END
                WHERE id IN (${ids.join(',')})`
    
                db.query(sql, (err, rows) => {
                    if (err) {console.error(err); return res.status(500)}
                    res.json(result);
                });
            } else {res.json(result);}
        })
    })
});

// Update the stock entry with multiple fields
app.put('/stockentinvs/:id', (req, res) => {
    const invoiceId = req.params.id;
    const updatedFields = req.body;

    // Generate dynamic SQL query
    const fieldNames = Object.keys(updatedFields);
    const fieldValues = Object.values(updatedFields);

    // Construct the SET clause dynamically
    const setClause = fieldNames.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE stockentinvs SET ${setClause} WHERE id = ?`;

    // Execute the query
    db.query(sql, [...fieldValues, invoiceId], (err, result) => {
        if (err) {
            console.error('Error updating the stock entry invoice:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.json(result);
    });
});

// Update the stock entry with multiple fields
app.put('/stockentinvs-submit/:id', (req, res) => {
    const items = req.body.formItems;
    const ids = items.map(item => item.id);
    if (req.body.priceCheckBox) {
        const priceCases = items.map(item => `WHEN ${item.id} THEN ${item.buyPrice}`).join(' ');
        const sql = `
        UPDATE items
        SET buyPrice = CASE id
        ${priceCases}
        END
        WHERE id IN (${ids.join(',')})`
        db.query(sql, (err) => {if (err) {console.error(err); return res.status(500)}});
    }
    const invoiceId = req.params.id;
    const newStockItems = items;
    const itemCases = newStockItems.map(i => `WHEN ${i.id} THEN ${i.buyPrice}`).join(' ');
    let sql = `UPDATE stockitems SET buyPrice = CASE itemId 
    ${itemCases} END WHERE inv_id = ? AND itemId IN (${ids.join(', ')});`;
    const { sku, remark, kilos, kiloPrice, todayDoller, todayRMB } = req.body.updatedFeilds;
    sql += `UPDATE stockentinvs SET invStatus = 'Submitted', sku = ?, remark = ?, kilos = ?, kiloPrice = ?, todayDoller = ?, todayRMB = ? WHERE id = ?`;
    db.query(sql, [invoiceId, sku, remark, kilos, kiloPrice, todayDoller, todayRMB, invoiceId], (err, result) => {if (err) { console.error(err); return res.status(500);} res.json(result);});
});

// Update the stock entry with multiple fields
app.put('/stockentinvs-checkBoxEdit/:id', (req, res) => {
    const invoiceId = req.params.id;
    db.query('SELECT * FROM stockentinvs WHERE id = ?', [invoiceId], (err, currentInv) => {
        if (err) {console.error(err); return res.status(500);}
        if (currentInv[0].invStatus !== 'Pending') return res.json({ currentInv: currentInv[0] });
        const updatedFields = req.body.updatedFeilds;
        const fieldNames = Object.keys(updatedFields);
        const fieldValues = Object.values(updatedFields);
        const setClause = fieldNames.map(field => `${field} = ?`).join(', ');
        const sql = `UPDATE stockentinvs SET ${setClause} WHERE id = ?`;
        db.query(sql, [...fieldValues, invoiceId], (err, result) => {
            if (err) {console.error(err);return res.status(500);}
            if (req.body.priceCheckBox) {
                const items = req.body.formItems;
                const ids = items.map(item => item.id);
                const priceCases = items.map(item => `WHEN ${item.id} THEN ${item.buyPrice}`).join(' ');
                const sql = `
                UPDATE items
                SET buyPrice = CASE id
                ${priceCases}
                END
                WHERE id IN (${ids.join(',')})`
    
                db.query(sql, (err) => {
                    if (err) {console.error(err); return res.status(500);}
                    res.json({ currentInv: currentInv[0] });
                });
            } else {res.json({ currentInv: currentInv[0] });}
        });
        
    })
});

// Update the stock entry with multiple fields
app.put('/stockentinvs-checkBoxEditNew/:id', (req, res) => {
    const invoiceId = req.params.id;
    db.query('SELECT * FROM stockentinvs WHERE id = ?', [invoiceId], (err, currentInv) => {
        if (err) {console.error(err); return res.status(500);}
        if (currentInv[0].invStatus !== 'Pending') return res.json({ currentInv: currentInv[0] });
        const newItemIds = JSON.parse(req.body.updatedFeilds.items).map(it => it.id);;
    db.query(`SELECT id FROM items WHERE id IN (${newItemIds})`, (err, ids) => {
            if (err) {console.error(err); return res.status(500)}
            const notFoundIds = newItemIds.some(id => !ids.map(i => i.id).includes(id));
            const invalidId = newItemIds.find(id => !ids.map(i => i.id).includes(id));
            if (notFoundIds) return res.json({ result: 'notFoundId', invalidId });

            const sql = `DELETE FROM stockitems WHERE inv_id = ?`;
            db.query(sql, [invoiceId], (err) => {
                if (err) {console.error(err);return res.status(500);}
                db.query(sql, (err) => {
                const newStockItems = JSON.parse(req.body.updatedFeilds.items);
                const values = [];
                const placeHols = newStockItems.map(i => `(?, ?, ?, ?, ?)`).join(', ');
                for (const i of newStockItems) values.push(invoiceId, i.id, i.quantity, i.quantity, i.buyPrice);
                const sql = `INSERT INTO stockitems (inv_id, itemId, quantity, lastQuantity, buyPrice) VALUES ${placeHols};`;
                db.query(sql, values, (err) => {if (err) {console.error(err); return res.status(500)}})
                const { sku, remark, kilos, kiloPrice, todayDoller, todayRMB } = req.body.updatedFeilds;
                const sql2 = 'UPDATE stockentinvs SET sku = ?, remark = ?, kilos = ?, kiloPrice = ?, todayDoller = ?, todayRMB = ? WHERE id = ?';
                db.query(sql2, [sku, remark, kilos, kiloPrice, todayDoller, todayRMB, invoiceId], (err) => {if (err) {console.error(err); return res.status(500)}})
                })
                if (req.body.priceCheckBox) {
                    const items = req.body.formItems;
                    const ids = items.map(item => item.id);
                    const priceCases = items.map(item => `WHEN ${item.id} THEN ${item.buyPrice}`).join(' ');
                    const sql = `
                    UPDATE items
                    SET buyPrice = CASE id
                    ${priceCases}
                    END
                    WHERE id IN (${ids.join(',')})`
        
                    db.query(sql, (err) => {
                        if (err) {console.error(err); return res.status(500);}
                        res.json({ currentInv: currentInv[0] });
                    });
                } else {res.json({ currentInv: currentInv[0] });}
            });
        })
    })
});

// Delete a stock entry invoice
app.delete('/stockentinvs/:id', (req, res) => {
    const invoiceId = req.params.id;
    db.query(`DELETE FROM stockentinvs WHERE id = ${invoiceId}`, (err, result) => {
        if (err) {
            console.error('Error deleting a stock entry invoice');
            return res.status(500).send(err)
        }
        res.status(200).json({ message: 'Invoice deleted successfully' }); // Send JSON response
    })
});

// POS:-----------

// Add a pos invoice
app.post('/posinvoices', (req, res) => {
    const {newDate, items, customerId, delFee, deliveryId, workerId, orders, total, discount, netTotal, invStatus, totalQuantity, note, priceLevel, computerName, itemIds } = req.body;
    const sql = `
    INSERT INTO posinvoices (
        newDate, items, customerId, delFee, deliveryId, workerId, orders, total, discount, netTotal,
        invStatus, totalQuantity, note, priceLevel, computerName, itemIds
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [newDate, items, customerId, delFee, deliveryId, workerId, orders, total, discount, netTotal, invStatus, totalQuantity, note, priceLevel, computerName, itemIds], (err, result) => {
        if (err) {
            console.error('Error adding the pos invoice:', err);
            return res.status(500).send(err);
        }
        res.json(result);
    })
});

// Invoices:--------

// Fetch all pos invoices:
app.get('/posinvoices', (req, res) => {
    const sql = 'SELECT posinvoices.id, DATE_FORMAT(posinvoices.newDate, "%Y-%m-%d, %H:%i:%s") AS newDate, posinvoices.items, customers.name AS customer_name, deliveries.name AS delivery_name, posinvoices.delFee, posinvoices.total, posinvoices.discount, posinvoices.netTotal, posinvoices.note, posinvoices.invStatus, posinvoices.totalQuantity, posinvoices.customerId, posinvoices.deliveryId, posinvoices.workerId, posinvoices.orders, posinvoices.priceLevel, posinvoices.computerName FROM posinvoices JOIN customers ON customers.id = posinvoices.customerId JOIN deliveries ON deliveries.id = posinvoices.deliveryId JOIN workers ON workers.id = posinvoices.workerId';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching pos invoices');
            return res.status(500).send(err);
        }
        res.json(result);
    })
});

// Fetch all posinvoices with filters
app.get('/posinvoicesFilter', (req, res) => {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const priceSelectVal = req.query.priceSelectVal === 'All' ? '%%' : `%${req.query.priceSelectVal}%`;
    const deliverySelectVal =
    req.query.deliverySelectVal === 'Both' ? '%%'
    : req.query.deliverySelectVal === 'Delivery' ? 'No Delivery'
    : `%${req.query.deliverySelectVal}%`;
    const checkIcon = req.query.checkIcon.includes('fa-circle-check') ? '%Paid%' : '%Canceled%';
    const search = req.query.search.split(',');
    const searchVal = `%${req.query.searchVal || ''}%`;
    const customerName = req.query.customer === '' ? '%%' : `%${req.query.customer}%`;
    const deliveryName = req.query.delivery === '' ? '%%' : `%${req.query.delivery}%`;
    const workerName = req.query.worker === '' ? '%%' : `%${req.query.worker}%`;
    const limit = Number(req.query.limit) || 50;
    let sql = `
        SELECT posinvoices.id, 
            DATE_FORMAT(posinvoices.newDate, "%Y-%m-%d, %H:%i:%s") AS newDate, 
            posinvoices.items, 
            customers.name AS customer_name, 
            deliveries.name AS delivery_name,
            workers.name AS worker_name,
            posinvoices.total, 
            posinvoices.discount,
            posinvoices.netTotal,
            posinvoices.note, 
            posinvoices.invStatus,
            posinvoices.totalQuantity, 
            posinvoices.customerId,
            posinvoices.delFee,
            posinvoices.deliveryId,
            posinvoices.workerId,
            posinvoices.orders,
            posinvoices.priceLevel,
            posinvoices.computerName,
            posinvoices.itemIds
        FROM posinvoices 
        JOIN customers ON customers.id = posinvoices.customerId
        LEFT JOIN deliveries ON deliveries.id = posinvoices.deliveryId
        LEFT JOIN workers ON workers.id = posinvoices.workerId
        WHERE DATE(posinvoices.newDate) BETWEEN ? AND ? 
          AND posinvoices.priceLevel LIKE ?
          AND posinvoices.invStatus LIKE ?
    `;
    const params = [startDate, endDate, priceSelectVal, checkIcon];
    // 🔄 Add itemIds filter with forEach
    if (search[0] !== '') {
        sql += ' AND (';
        search.forEach((id, index) => {
            if (index > 0) sql += ' OR ';
            sql += 'JSON_CONTAINS(itemIds, ?)';
            params.push(`"${id}"`);
        });
        sql += ' OR posinvoices.note LIKE ?';
        params.push(searchVal);

        sql += ' OR posinvoices.id LIKE ?';
        params.push(searchVal);

        sql += ' OR customers.name LIKE ?';
        params.push(searchVal);

        sql += ' OR deliveries.name LIKE ?';
        params.push(searchVal);

        sql += ' OR posinvoices.computerName LIKE ?';
        params.push(searchVal);

        sql += ' OR workers.name LIKE ?';
        params.push(searchVal);

        sql += ')';
    }
    // ✅ Add customer name filter
    sql += ` AND customers.name LIKE ?`;
    params.push(customerName);

    sql += ` AND deliveries.name LIKE ?`;
    params.push(deliveryName);

    sql += ` AND workers.name LIKE ?`;
    params.push(workerName);

    if (deliverySelectVal !== 'No Delivery') {
        sql += ` AND deliveries.name LIKE ?`;
        params.push(deliverySelectVal);
    } else {
        sql += ` AND deliveries.name != ?`;
        params.push(deliverySelectVal);
    }

    sql += ` ORDER BY posinvoices.newDate DESC, posinvoices.id DESC LIMIT ?`;

    params.push(limit);
    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error fetching pos invoices');
            return res.status(500).send(err);
        }
        res.json(result);
    });
});

// Fetch all posinvoices with filters
app.get('/posinvoicesFilter-extra', (req, res) => {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const priceSelectVal = req.query.priceSelectVal === 'All' ? '%%' : `%${req.query.priceSelectVal}%`;
    const deliverySelectVal =
    req.query.deliverySelectVal === 'Both' ? '%%'
    : req.query.deliverySelectVal === 'Delivery' ? 'No Delivery'
    : `%${req.query.deliverySelectVal}%`;
    const checkIcon = req.query.checkIcon.includes('fa-circle-check') ? '%Paid%' : '%Canceled%';
    const searchVal = `%${req.query.searchVal || ''}%`;
    const customerName = req.query.customer === '' ? '%%' : `%${req.query.customer}%`;
    const deliveryName = req.query.delivery === '' ? '%%' : `%${req.query.delivery}%`;
    const workerName = req.query.worker === '' ? '%%' : `%${req.query.worker}%`;
    const limit = Number(req.query.limit) || 50;
    let sql = `
        SELECT posinvoices.id, 
        DATE_FORMAT(posinvoices.newDate, "%Y-%m-%d, %H:%i:%s") AS newDate, 
        posinvoices.items, 
        customers.name AS customer_name, 
        deliveries.name AS delivery_name,
        workers.name AS worker_name,
        posinvoices.total, 
        posinvoices.discount,
        posinvoices.netTotal,
        posinvoices.note, 
        posinvoices.invStatus,
        posinvoices.totalQuantity, 
        posinvoices.customerId,
        posinvoices.delFee,
        posinvoices.deliveryId,
        posinvoices.workerId,
        posinvoices.orders,
        posinvoices.priceLevel,
        posinvoices.computerName,
        'itemName', CONCAT(MAX(brand.name), ' ', MAX(model.name), ' ', MAX(category.name), ' ', MAX(quality.name)) AS name,
        posinvoices.itemIds,
        JSON_ARRAYAGG(JSON_OBJECT(
            'inv_id', positems.pos_id,
            'itemId', positems.itemId,
            'quantity', positems.quantity,
            'sellPrice', positems.sellPrice,
            'targstockinvs', (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                    'quantity', targstockinvs.quantity,
                    'stockInv_id', targstockinvs.stockInv_id,
                    'buyPrice', stockitems.buyPrice
                )
            )
            FROM targstockinvs
            LEFT JOIN stockitems 
                ON stockitems.inv_id = targstockinvs.stockInv_id
                AND stockitems.itemId = targstockinvs.itemId
            WHERE targstockinvs.pos_id = positems.pos_id
            AND targstockinvs.itemId = positems.itemId
        ),
            'sku', items.SKU,
            'boxId', items.boxId,
            'existQnt', items.quantity,
            'discrip', items.discription,
            'name', CONCAT(brand.name, ' ', model.name, ' ', category.name, ' ', quality.name)
        )) AS posItems
        FROM posinvoices 
        JOIN customers ON customers.id = posinvoices.customerId
        LEFT JOIN deliveries ON deliveries.id = posinvoices.deliveryId
        LEFT JOIN workers ON workers.id = posinvoices.workerId
        LEFT JOIN positems ON positems.pos_id = posinvoices.id
        LEFT JOIN items ON items.id = positems.itemId
        LEFT JOIN brand ON brand.id = items.brand
        LEFT JOIN model ON model.id = items.model
        LEFT JOIN category ON category.id = items.category
        LEFT JOIN quality ON quality.id = items.quality
        WHERE DATE(posinvoices.newDate) BETWEEN ? AND ? 
          AND posinvoices.priceLevel LIKE ?
          AND posinvoices.invStatus LIKE ?
    `;
    const params = [startDate, endDate, priceSelectVal, checkIcon ];
    // 🔄 Add itemIds filter with forEach
    if (searchVal !== '%%') {
        sql += ' AND (';
        const splittedVal = searchVal.split(' ');
        splittedVal.forEach((part, index) => {
            if (index > 0) sql += ' AND '
            sql += `CONCAT(brand.name, ' ', model.name, ' ', category.name, ' ', quality.name) LIKE ?`;
            params.push(part)
        })

        sql += ' OR posinvoices.note LIKE ?';
        params.push(searchVal);

        sql += ' OR posinvoices.id LIKE ?';
        params.push(searchVal);

        sql += ' OR customers.name LIKE ?';
        params.push(searchVal);

        sql += ' OR deliveries.name LIKE ?';
        params.push(searchVal);

        sql += ' OR posinvoices.computerName LIKE ?';
        params.push(searchVal);

        sql += ' OR workers.name LIKE ?';
        params.push(searchVal);

        sql += ')';
    }
    // ✅ Add customer name filter
    sql += ` AND customers.name LIKE ?`;
    params.push(customerName);

    sql += ` AND deliveries.name LIKE ?`;
    params.push(deliveryName);

    sql += ` AND workers.name LIKE ?`;
    params.push(workerName);

    if (deliverySelectVal !== 'No Delivery') {
        sql += ` AND deliveries.name LIKE ?`;
        params.push(deliverySelectVal);
    } else {
        sql += ` AND deliveries.name != ?`;
        params.push(deliverySelectVal);
    }

    sql += ` GROUP BY posinvoices.id ORDER BY posinvoices.newDate DESC, posinvoices.id DESC LIMIT ?`;
    params.push(limit);
    db.query(sql, params, (err, filtInvs) => {
        if (err) {console.error(err); return res.status(500).send(err);}
        if (req.query.isItemsAllFetched === 'true') return res.json({filtInvs});
        db.query('SELECT customer_id, invoiceNum FROM loans', (err, loans) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({ filtInvs, loans });
        })
    });
});

// Fetch all posinvoices with filters
app.get('/posinvoicesFilter-extra-mine', (req, res) => {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const priceSelectVal = req.query.priceSelectVal === 'All' ? '%%' : `%${req.query.priceSelectVal}%`;
    const deliverySelectVal =
    req.query.deliverySelectVal === 'Both' ? '%%'
    : req.query.deliverySelectVal === 'Delivery' ? 'No Delivery'
    : `%${req.query.deliverySelectVal}%`;
    const checkIcon = req.query.checkIcon.includes('fa-circle-check') ? '%Paid%' : '%Canceled%';
    const realSeVal = `${req.query.searchVal || ''}`;
    const searchVal = `%${req.query.searchVal || ''}%`;
    const customerName = req.query.customer === '' ? '%%' : `%${req.query.customer}%`;
    const deliveryName = req.query.delivery === '' ? '%%' : `%${req.query.delivery}%`;
    const workerName = req.query.worker === '' ? '%%' : `%${req.query.worker}%`;
    const limit = Number(req.query.limit) || 50;
    let sql = `
        SELECT posinvoices.id, 
        DATE_FORMAT(posinvoices.newDate, "%Y-%m-%d, %H:%i:%s") AS newDate, 
        customers.name AS customer_name, 
        deliveries.name AS delivery_name,
        workers.name AS worker_name,
        posinvoices.total, 
        posinvoices.discount,
        posinvoices.netTotal,
        posinvoices.note, 
        posinvoices.invStatus,
        posinvoices.totalQuantity, 
        posinvoices.customerId,
        posinvoices.delFee,
        posinvoices.deliveryId,
        posinvoices.workerId,
        posinvoices.orders,
        posinvoices.priceLevel,
        posinvoices.computerName,
        JSON_ARRAY() AS posItems
        FROM posinvoices 
        JOIN customers ON customers.id = posinvoices.customerId
        LEFT JOIN deliveries ON deliveries.id = posinvoices.deliveryId
        LEFT JOIN workers ON workers.id = posinvoices.workerId
        LEFT JOIN positems ON positems.pos_id = posinvoices.id
        LEFT JOIN items ON items.id = positems.itemId
        WHERE DATE(posinvoices.newDate) BETWEEN ? AND ? 
        AND posinvoices.priceLevel LIKE ?
        AND posinvoices.invStatus LIKE ?
    `;
    const params = [ startDate, endDate, priceSelectVal, checkIcon ];
    if (searchVal !== '%%') {
        sql += ' AND (';
        
        const splitVal = realSeVal.split(' ');
        splitVal.forEach((val, index) => {
            if (index > 0) sql += ' AND ';
            sql += ' items.fullName LIKE ?';
            params.push(`%${val}%`);
        })

        sql += ' OR posinvoices.note LIKE ?';
        params.push(searchVal);

        sql += ' OR posinvoices.id LIKE ?';
        params.push(searchVal);

        sql += ' OR customers.name LIKE ?';
        params.push(searchVal);

        sql += ' OR deliveries.name LIKE ?';
        params.push(searchVal);

        sql += ' OR posinvoices.computerName LIKE ?';
        params.push(searchVal);

        sql += ' OR workers.name LIKE ?';
        params.push(searchVal);

        sql += ')';
    }
    
    sql += ` AND customers.name LIKE ?`;
    params.push(customerName);

    sql += ` AND deliveries.name LIKE ?`;
    params.push(deliveryName);

    sql += ` AND workers.name LIKE ?`;
    params.push(workerName);

    if (deliverySelectVal !== 'No Delivery') {
        sql += ` AND deliveries.name LIKE ?`;
        params.push(deliverySelectVal);
    } else {
        sql += ` AND deliveries.name != ?`;
        params.push(deliverySelectVal);
    }

    sql += ` GROUP BY posinvoices.id ORDER BY posinvoices.newDate DESC, posinvoices.id DESC LIMIT ?`;
    params.push(limit);
    db.query(sql, params, (err, filtInvs) => {
        if (err) {console.error(err); return res.status(500).send(err);}
        const invIds = filtInvs?.map(inv => inv.id);
        const sql = `SELECT pos_id, itemId FROM positems WHERE pos_id IN (${invIds}); 
        SELECT pos_id, itemId, quantity, stockInv_id FROM targstockinvs WHERE pos_id IN (${invIds});`;
        db.query(sql, (err, result) => {
            if (!result) return res.json({ filtInvs: [] });
            const posItems = result[0];
            const dbTargStockInvs = result[1];
            filtInvs = filtInvs.map(inv => {
                inv.posItems = posItems.filter(i => {i["targStockInvs"] = []; return i.pos_id === inv.id});
                return inv;
            })
            const targStItemIds = dbTargStockInvs.map(i => i.itemId);
            const targStstockInv_ids = dbTargStockInvs.map(i => i.stockInv_id);
            const sql = `SELECT buyPrice, inv_id, itemId FROM stockitems WHERE itemId IN (${targStItemIds}) AND inv_id in (${targStstockInv_ids})`;
            db.query(sql, (err, stockItems) => {
                filtInvs = filtInvs.map(inv => {
                    inv.posItems.forEach(i => {
                        const tarStIts = dbTargStockInvs.filter(tarInv => tarInv.pos_id === i.pos_id && tarInv.itemId === i.itemId);
                        tarStIts.forEach(item => { 
                            const stItemBuyPrice = stockItems.find(stIt => item.stockInv_id === stIt.inv_id && item.itemId === stIt.itemId);
                            i.targStockInvs.push({
                                quantity: item.quantity,
                                stockInv_id: item.stockInv_id,
                                buyPrice: stItemBuyPrice.buyPrice
                            })
                        })
                    })
                    return inv;
                })
                const custIds = filtInvs.map(inv => inv.customerId);
                if (req.query.isItemsAllFetched === 'true') return res.json({ filtInvs });
                db.query(`SELECT customer_id, invoiceNum FROM loans WHERE customer_id IN (${custIds})`, (err, loans) => {
                    if (err) {console.error(err); return res.status(500);}
                    res.json({ filtInvs, loans });
                })
            });
        })
    });
});

// Getting selected invoices
app.get('/selected-posinvoices', (req, res) => {
    const ids = JSON.parse(req.query.ids);
    const custId = req.query.custId;
    if (ids.length === 0) {
        return db.query('SELECT * FROM loans WHERE customer_id = ?', [custId], (err, custLons) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({ custLons });
        })
    }
    const sql = allPosInvs + ` WHERE posinvoices.id IN (${ids.join(',')}) GROUP BY posinvoices.id`;
    db.query(sql, (err, selectedInvs) => {
        if (err) {console.error(err); return res.status(500);}
        db.query('SELECT * FROM loans WHERE customer_id = ?', [custId], (err, custLons) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({ selectedInvs, custLons });
        })
    })
})

// Fetch a pos invoice by ID
app.get('/posinvoices/:id', (req, res) => {
    const invoiceId = Number(req.params.id);
    const sql = `
        SELECT posinvoices.id, 
               DATE_FORMAT(posinvoices.newDate, "%Y-%m-%d, %H:%i:%s") AS newDate, 
               posinvoices.items, 
               posinvoices.itemIds, 
               customers.name AS customer_name, 
               deliveries.name AS delivery_name, 
               posinvoices.total, 
               posinvoices.discount, 
               posinvoices.netTotal, 
               posinvoices.note, 
               posinvoices.invStatus, 
               posinvoices.totalQuantity, 
               posinvoices.customerId, 
               posinvoices.deliveryId,
               posinvoices.workerId,
               posinvoices.orders,
               posinvoices.priceLevel,
               posinvoices.computerName
        FROM posinvoices 
        JOIN customers ON customers.id = posinvoices.customerId 
        JOIN deliveries ON deliveries.id = posinvoices.deliveryId
        JOIN workers ON workers.id = posinvoices.workerId
        WHERE posinvoices.id = ? LIMIT 1`;

    db.query(sql, [invoiceId], (err, result) => {
        if (err) {
            console.error('Error fetching the invoice:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (result.length === 0) {
            // No invoice found
            return res.status(404).json({ error: 'Invoice not found' });
        }
        res.json(result[0]);
    });
});

// Update a pos invoice
app.put('/posinvoices/:id', (req, res) => {
    const invoiceId = req.params.id;
    const updatedField = req.body;
    const fieldName = Object.keys(updatedField)[0];
    const fieldValue = updatedField[fieldName];
    const sql = `UPDATE posinvoices SET ${fieldName} = ? WHERE id = ?`
    db.query(sql, [fieldValue, invoiceId], (err, result) => {
        if (err) {
            console.error('Error updating the pos invoice');
            return res.status(500).send('Internal Server Error');
        }
        res.json(result);
    })
});

// Delete an invoice
app.delete('/posinvoices/:id', (req, res) => {
    const sql = 'DELETE FROM posinvoices WHERE id = ?';
    const invoiceId = req.params.id;
    db.query(sql, [invoiceId], (err, result) => {
        if (err) {
            console.error('Error delete the invoice');
            return res.status(500).send(err)
        };
        res.json(result[0]);
    })
});

// Groups:------------

// Fetch all brands
app.get('/brand', (req, res) => {
    const sql = 'SELECT * FROM brand';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching all brands:', err); // Logs actual error for debugging
            return res.status(500).json({ message: 'Failed to fetch brands' }); // Sends a user-friendly error message
        }
        res.json(result);
    })
})

// Add a brand
app.post('/brand', (req, res) => {
    const sql = `INSERT INTO brand (name) VALUES (?)`;
    const { name } = req.body;
    db.query(sql, [name], (err, result) => {
        if (err) {
            console.error('Error inserting the brand');
            return res.status(500);
        }
        res.json(result);
    })
})

// Add a brand
app.post('/brand-get', (req, res) => {
    const sql = `INSERT INTO brand (name) VALUES (?)`;
    const { name } = req.body;
    db.query(sql, [name], (err, result) => {
        if (err) {
            console.error('Error inserting the brand');
            return res.status(500);
        }
        db.query('SELECT * FROM brand', (err, brands) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({brands});
        })
    })
})

// Delete a brand
app.delete('/brand/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM brand WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting brand:', err);
            return res.status(500).json({ message: 'Failed to delete brand' });
        }
        res.json(result);
    })
})

// Delete a brand
app.delete('/brand-get/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM items WHERE brand = ?', [id], (err, brand) => {
        if (err) {console.error(err); return res.status(500);}
        if (brand.length !== 0) return res.json({ brand: 'exists' })
            const sql = 'DELETE FROM brand WHERE id = ?';
            db.query(sql, [id], (err, result) => {
                if (err) {
                    console.error('Error deleting brand:', err);
                    return res.status(500).json({ message: 'Failed to delete brand' });
                }
                db.query('SELECT * FROM brand', (err, brands) => {
                    if (err) {console.error(err); return res.status(500);}
                    res.json({brands});
                })
            })
    }) 
})

// Update a brand
app.put('/brand/:id', (req, res) => {
    const id = req.params.id;
    const updatedField = req.body;
    const fieldName = Object.keys(updatedField)[0];
    const fieldValue = updatedField[fieldName];
    const sql = `UPDATE brand set ${fieldName} = ? WHERE id = ?`
    db.query(sql, [fieldValue, id], (err, result) => {
        res.json(result);
    });
})

// Update a brand
app.put('/brand-check/:id', (req, res) => {
    const id = req.params.id;
    const newName = req.query.newName;
    db.query('SELECT * FROM brand WHERE id != ?', [id], (err, brands) => {
        if (err) {console.error(err); return res.status(500);}
        const exists = brands.find(brand => brand.name.toLocaleLowerCase() === newName);
        if (exists) return res.json({ brand: 'exists' })
            const updatedField = req.body;
            const fieldName = Object.keys(updatedField)[0];
            const fieldValue = updatedField[fieldName];
            const sql = `UPDATE brand set ${fieldName} = ? WHERE id = ?`
            db.query(sql, [fieldValue, id], (err, result) => {
                res.json(result);
            });
    })
})

// Fetch all models
app.get('/model', (req, res) => {
    const search = `%${req.query.search || ''}%`
    const limit = Number(req.query.limit || 1000000);
    const sql = 'SELECT * FROM model WHERE name LIKE ? ORDER BY id DESC LIMIT ?';
    db.query(sql, [search, limit], (err, result) => {
        if (err) {console.error(err); return res.status(500)}
        res.json(result);
    })
})

// Add a model
app.post('/model', (req, res) => {
    const sql = `INSERT INTO model (name) VALUES (?)`;
    const { model } = req.body;
    db.query(sql, [model], (err, result) => {

        if (err) {
            console.error('Error inserting the model');
            return res.status(500);
        }
        res.json(result);
    })
})

// Add a model
app.post('/model-get', (req, res) => {
    const sql = `INSERT INTO model (name) VALUES (?)`;
    const search = `%${req.query.search || ''}%`;
    const { model } = req.body;
    db.query(sql, [model], (err, result) => {
        if (err) {console.error('Error inserting the model'); return res.status(500);}
        db.query('SELECT * FROM model WHERE name LIKE ? ORDER BY id DESC LIMIT ?', [search, 100], (err, models) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({ models });
        })
    })
})

// Delete a model
app.delete('/model/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM model WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting model:', err);
            return res.status(500).json({ message: 'Failed to delete model' });
        }
        res.json(result);
    })
})

// Delete a model
app.delete('/model-get/:id', (req, res) => {
    const id = req.params.id;
    const search = `%${req.query.search || ''}%`
    db.query('SELECT * FROM items WHERE model = ?', [id], (err, model) => {
        if (err) {console.error(err); return res.status(500);}
        if (model.length > 0) return res.json({ model: 'exists'})
        const sql = 'DELETE FROM model WHERE id = ?';
        db.query(sql, [id], (err, result) => {
            if (err) {
                console.error('Error deleting model:', err);
                return res.status(500).json({ message: 'Failed to delete model' });
            }
            db.query('SELECT * FROM model WHERE name LIKE ? ORDER BY id DESC LIMIT ?', [search, 100], (err, models) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({ models });
            })
        })
    })
})

// Update a model
app.put('/model/:id', (req, res) => {
    const id = req.params.id;
    const updatedField = req.body;
    const fieldName = Object.keys(updatedField)[0];
    const fieldValue = updatedField[fieldName];
    const sql = `UPDATE model set ${fieldName} = ? WHERE id = ?`
    db.query(sql, [fieldValue, id], (err, result) => {
        res.json(result);
    });
})

// Update a model
app.put('/model-check/:id', (req, res) => {
    const id = req.params.id;
    const newName = req.query.newName;
    db.query('SELECT * FROM model WHERE id != ?', [id], (err, models) => {
        if (err) {console.error(err); return res.status(500);}
        const exists = models.find(model => model.name.toLocaleLowerCase() === newName);
        if (exists) return res.json({ model: 'exists' })
        const updatedField = req.body;
        const fieldName = Object.keys(updatedField)[0];
        const fieldValue = updatedField[fieldName];
        const sql = `UPDATE model set ${fieldName} = ? WHERE id = ?`
        db.query(sql, [fieldValue, id], (err, result) => {
            res.json(result);
        });
    })
})

// Fetch all category
app.get('/category', (req, res) => {
    const sql = 'SELECT * FROM category';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching all categories:', err); // Logs actual error for debugging
            return res.status(500).json({ message: 'Failed to fetch categories' }); // Sends a user-friendly error message
        }
        res.json(result);
    })
})

// Add a category
app.post('/category', (req, res) => {
    const sql = `INSERT INTO category (name) VALUES (?)`;
    const { category } = req.body;
    db.query(sql, [category], (err, result) => {
        if (err) {
            console.error('Error inserting the category');
            return res.status(500);
        }
        res.json(result);
    })
})

// Add a category
app.post('/category-get', (req, res) => {
    const sql = `INSERT INTO category (name) VALUES (?)`;
    const { category } = req.body;
    db.query(sql, [category], (err, result) => {
        if (err) {
            console.error('Error inserting the category');
            return res.status(500);
        }
        db.query('SELECT * FROM category', (err, categories) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({ categories });
        })
    })
})

// Delete a category
app.delete('/category/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM category WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting category:', err);
            return res.status(500).json({ message: 'Failed to delete category' });
        }
        res.json(result);
    })
})

// Delete a category
app.delete('/category-get/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM items WHERE category = ?', [id], (err, category) => {
        if (err) {console.error(err); return res.status(500);}
        if (category.length > 0) return res.json({ category: 'exists'})
            const sql = 'DELETE FROM category WHERE id = ?';
            db.query(sql, [id], (err, result) => {
                if (err) {
                    console.error('Error deleting category:', err);
                    return res.status(500).json({ message: 'Failed to delete category' });
                }
                db.query('SELECT * FROM category', (err, categories) => {
                    if (err) {console.error(err); return res.status(500);}
                    res.json({ categories });
                })
            })
    })
})

// Update a category
app.put('/category/:id', (req, res) => {
    const id = req.params.id;
    const updatedField = req.body;
    const fieldName = Object.keys(updatedField)[0];
    const fieldValue = updatedField[fieldName];
    const sql = `UPDATE category set ${fieldName} = ? WHERE id = ?`
    db.query(sql, [fieldValue, id], (err, result) => {
        if (err) {
            console.error('Error updating the color');
            return res.status(500).send('Internal Server Error');
        }
        res.json(result);
    });
})

// Update a category
app.put('/category-check/:id', (req, res) => {
    const id = req.params.id;
    const newName = req.query.newName;
    db.query('SELECT * FROM category WHERE id != ?', [id], (err, categories) => {
        if (err) {console.error(err); return res.status(500);}
        const exists = categories.find(category => category.name.toLocaleLowerCase() === newName);
        if (exists) return res.json({ category: 'exists'})
            const updatedField = req.body;
            const fieldName = Object.keys(updatedField)[0];
            const fieldValue = updatedField[fieldName];
            const sql = `UPDATE category set ${fieldName} = ? WHERE id = ?`
            db.query(sql, [fieldValue, id], (err, result) => {
                if (err) {
                    console.error('Error updating the color');
                    return res.status(500).send('Internal Server Error');
                }
                res.json(result);
            });
    })
})

// Update a category
app.put('/category-check-color/:id', (req, res) => {
    const id = req.params.id;
    const updatedField = req.body;
    const fieldName = Object.keys(updatedField)[0];
    const fieldValue = updatedField[fieldName];
    const sql = `UPDATE category set ${fieldName} = ? WHERE id = ?`
    db.query(sql, [fieldValue, id], (err, result) => {
        if (err) {
            console.error('Error updating the color');
            return res.status(500).send('Internal Server Error');
        }
        db.query('SELECT * FROM category', (err, categories) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({ categories });
        })
    });
})

// Fetch all quality
app.get('/quality', (req, res) => {
    const sql = 'SELECT * FROM quality';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching all quality:', err); // Logs actual error for debugging
            return res.status(500).json({ message: 'Failed to fetch quality' }); // Sends a user-friendly error message
        }
        res.json(result);
    })
})

// Add a quality
app.post('/quality', (req, res) => {
    const sql = `INSERT INTO quality (name) VALUES (?)`;
    const { quality } = req.body;
    db.query(sql, [quality], (err, result) => {
        if (err) {
            console.error('Error inserting the quality');
            return res.status(500);
        }
        res.json(result);
    })
})

// Add a quality
app.post('/quality-get', (req, res) => {
    const sql = `INSERT INTO quality (name) VALUES (?)`;
    const { quality } = req.body;
    db.query(sql, [quality], (err, result) => {
        if (err) {
            console.error('Error inserting the quality');
            return res.status(500);
        }
        db.query('SELECT * FROM quality', (err, qualities) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({ qualities });
        })
    })
})

// Delete a quality
app.delete('/quality/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM quality WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting quality:', err);
            return res.status(500).json({ message: 'Failed to delete quality' });
        }
        res.json(result);
    })
})

// Delete a quality
app.delete('/quality-get/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM items WHERE quality = ?', [id], (err, quality) => {
    if (err) {console.error(err); return res.status(500);}
    if (quality.length > 0) return res.json({ quality: 'exists' })
        const sql = 'DELETE FROM quality WHERE id = ?';
        db.query(sql, [id], (err, result) => {
            if (err) {
                console.error('Error deleting quality:', err);
                return res.status(500).json({ message: 'Failed to delete quality' });
            }
            db.query('SELECT * FROM quality', (err, qualities) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({ qualities });
            })
        })
    })
})

// Update a quality
app.put('/quality/:id', (req, res) => {
    const id = req.params.id;
    const updatedField = req.body;
    const fieldName = Object.keys(updatedField)[0];
    const fieldValue = updatedField[fieldName];
    const sql = `UPDATE quality set ${fieldName} = ? WHERE id = ?`
    db.query(sql, [fieldValue, id], (err, result) => {
        res.json(result);
    });
})

// Update a quality
app.put('/quality-check/:id', (req, res) => {
    const id = req.params.id;
    const newName = req.query.newName;
    db.query('SELECT * FROM quality WHERE id != ?', [id], (err, qualities) => {
        if (err) {console.error(err); return res.status(500);}
        const exists = qualities.find(quality => quality.name.toLocaleLowerCase() === newName);
        if (exists) return res.json({ quality: 'exists'})
        const updatedField = req.body;
        const fieldName = Object.keys(updatedField)[0];
        const fieldValue = updatedField[fieldName];
        const sql = `UPDATE quality set ${fieldName} = ? WHERE id = ?`
        db.query(sql, [fieldValue, id], (err, result) => {
            res.json(result);
        });
    })
})

// Customers:--------------

// Fetching all customers
app.get('/customers', (req, res) => {
    const sql = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, delFee, address, remark, priceLevel FROM customers';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching all customers:', err); // Logs actual error for debugging
            return res.status(500).json({ message: 'Failed to fetch customers' }); // Sends a user-friendly error message
        }
        res.json(result)
    })
})

// Fetching all customers with loans as well
app.get('/customers-Loans', (req, res) => {
    const sql = `SELECT 
    id, 
    name, 
    phoneNo, 
    priceLevel 
    FROM customers`;
    db.query(sql, (err, customers) => {
        if (err) {console.error(err); return res.status(500)}
        const sql = `SELECT 
        loans.amount, 
        loans.customer_id 
        FROM loans 
        LEFT JOIN posinvoices ON loans.invoiceNum = posinvoices.id
        ;`;
    db.query(sql, (err, loans) => {
        if (err) {console.error( err); return res.status(500)}
        res.json({ customers, loans })
    })
    })
})

// Fetching all customers with loans as well
app.get('/customers-Loans-pos', (req, res) => {
    const sql = 'SELECT id, name FROM customers';
    db.query(sql, (err, customers) => {
        if (err) {console.error(err); return res.status(500)}
        const sql = `SELECT customer_id, amount FROM loans`;
        db.query(sql, (err, loans) => {
            if (err) {console.error( err); return res.status(500)}
            res.json({ customers, loans })
        })
    })
})

// Fetch a customer by Id
app.get('/customers/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM customers WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching the customer')
            return res.status(500).json({ error: 'Database error'});
        }
        res.json(result[0]);
    })
})

app.get('/customersGetProfits/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM customers WHERE id = ?';
    db.query(sql, [id], (err, customer) => {
        if (err) {
            console.error('Error fetching the customer')
            return res.status(500).json({ error: 'Database error'});
        }
        db.query('SELECT * FROM profits', (err, profits) => {
            if (err) {console.error(err); return res.status*(500);}
            res.json({ customer: customer[0], profits });

        })
    })
})

// Add a customer
app.post('/customers', (req, res) => {
    const { name, phoneNo, address, remark, priceLevel } = req.body;
    const sql = 'INSERT INTO customers (name, phoneNo, address, remark, priceLevel) VALUES ( ?, ?, ?, ?, ?)';
    db.query(sql, [name, phoneNo, address, remark, priceLevel], (err, result) => {
        if (err) {
            console.error('Error inserting the customer');
            return res.status(500);
        }
        res.json(result);
    })
})

app.post('/customers-and-get', (req, res) => {
    const { name, phoneNo, address, remark, priceLevel } = req.body;
    const sql = 'INSERT INTO customers (name, phoneNo, address, remark, priceLevel) VALUES ( ?, ?, ?, ?, ?)';
    db.query(sql, [name, phoneNo, address, remark, priceLevel], (err, result) => {
        if (err) {
            console.error('Error inserting the customer');
            return res.status(500);
        }
        const sql = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, delFee, address, remark, priceLevel FROM customers';
        db.query(sql, (err, customers) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({customers});
        })
    })
})

app.post('/deliveries-and-get', (req, res) => {
    const { name, phoneNo, address } = req.body;
    const sql = 'INSERT INTO deliveries (name, phoneNo, address) VALUES (?, ?, ?)';

    db.query(sql, [name, phoneNo, address], (err, result) => {
         if (err) {
            console.error('Error inserting the delivery');
            return res.status(500);
        }
        const sql = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, address FROM deliveries';
        db.query(sql, (err, deliveries) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({deliveries});
        })
    })
})

app.post('/workers-and-get', (req, res) => {
    const { name, phoneNo, address } = req.body;
    const sql = 'INSERT INTO workers (name, phoneNo, address) VALUES (?, ?, ?)';
    db.query(sql, [name, phoneNo, address], (err, result) => {
         if (err) {
            console.error('Error inserting the worker');
            return res.status(500);
        }
        const sql = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, address FROM workers';
        db.query(sql, (err, workers) => {
            if (err) {console.error(err); return res.status(500);}
            res.json({workers});
        })
    })
})

// Update a customer
app.put('/customers/:id', (req, res) => {
    const id = req.params.id;
    const updatedField = req.body;
    const fieldName = Object.keys(updatedField)[0];
    const fieldValue = updatedField[fieldName];
    const sql = `UPDATE customers set ${fieldName} = ? WHERE id = ?`
    db.query(sql, [fieldValue, id], (err, result) => {
        res.json(result);
    });
})

// Update a customer
app.put('/customers-check/:id', (req, res) => {
    const id = req.params.id;
    const name = req.query.name;
    const newVal = req.query.newVal;
    if (name === 'name') {
        const sql99 = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, delFee, address, remark, priceLevel FROM customers WHERE id != ?';
        db.query(sql99, [id], (err, customers) => {
            if (err) {
                console.error('Error fetching all customers:', err); // Logs actual error for debugging
                return res.status(500).json({ message: 'Failed to fetch customers' }); // Sends a user-friendly error message
            }
            const exists = customers.find(customer => customer.name.toLocaleLowerCase() === newVal);
            if (exists) {
                return res.json({ custName: 'exists' })
            }
            const updatedField = req.body;
            const fieldName = Object.keys(updatedField)[0];
            const fieldValue = updatedField[fieldName];
            const sql = `UPDATE customers set ${fieldName} = ? WHERE id = ?`
            db.query(sql, [fieldValue, id], (err, result) => {
                res.json(result);
            });
        })
    } else {
        const updatedField = req.body;
        const fieldName = Object.keys(updatedField)[0];
        const fieldValue = updatedField[fieldName];
        const sql = `UPDATE customers set ${fieldName} = ? WHERE id = ?`
        db.query(sql, [fieldValue, id], (err, result) => {
            res.json(result);
        });
    }
})

// Update a delivery
app.put('/deliveries-check/:id', (req, res) => {
    const id = req.params.id;
    const name = req.query.name;
    const newVal = req.query.newVal;
    if (name === 'name') {
        const sql99 = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, address FROM deliveries WHERE id != ?';
        db.query(sql99, [id], (err, deliveries) => {
            if (err) {
                console.error('Error fetching all customers:', err); // Logs actual error for debugging
                return res.status(500).json({ message: 'Failed to fetch customers' }); // Sends a user-friendly error message
            }
            const exists = deliveries.find(delivery => delivery.name.toLocaleLowerCase() === newVal);
            if (exists) {
                return res.json({ delName: 'exists' })
            }
            const updatedField = req.body;
            const fieldName = Object.keys(updatedField)[0];
            const fieldValue = updatedField[fieldName];
            const sql = `UPDATE deliveries set ${fieldName} = ? WHERE id = ?`
            db.query(sql, [fieldValue, id], (err, result) => {
                res.json(result);
            });
        })
    } else {
        const updatedField = req.body;
        const fieldName = Object.keys(updatedField)[0];
        const fieldValue = updatedField[fieldName];
        const sql = `UPDATE deliveries set ${fieldName} = ? WHERE id = ?`
        db.query(sql, [fieldValue, id], (err, result) => {
            res.json(result);
        });
    }
})

// Update a delivery
app.put('/workers-check/:id', (req, res) => {
    const id = req.params.id;
    const name = req.query.name;
    const newVal = req.query.newVal;
    if (name === 'name') {
        const sql99 = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, address FROM workers WHERE id != ?';
        db.query(sql99, [id], (err, workers) => {
            if (err) {
                console.error('Error fetching all workers:', err); // Logs actual error for debugging
                return res.status(500).json({ message: 'Failed to fetch workers' }); // Sends a user-friendly error message
            }
            const exists = workers.find(worker => worker.name.toLocaleLowerCase() === newVal);
            if (exists) {
                return res.json({ workName: 'exists' })
            }
            const updatedField = req.body;
            const fieldName = Object.keys(updatedField)[0];
            const fieldValue = updatedField[fieldName];
            const sql = `UPDATE workers set ${fieldName} = ? WHERE id = ?`
            db.query(sql, [fieldValue, id], (err, result) => {
                res.json(result);
            });
        })
    } else {
        const updatedField = req.body;
        const fieldName = Object.keys(updatedField)[0];
        const fieldValue = updatedField[fieldName];
        const sql = `UPDATE workers set ${fieldName} = ? WHERE id = ?`
        db.query(sql, [fieldValue, id], (err, result) => {
            res.json(result);
        });
    }
})

// Delete a customer
app.delete('/customers/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM customers WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting the customer:', err);
            return res.status(500).json({ message: 'Failed to delete customer' });
        }
        res.json(result);
    })
})

// Delete a customer
app.delete('/customers-checkInv/:id', (req, res) => {
    const custId = req.params.id;
    db.query('SELECT * FROM posinvoices WHERE customerId = ?', [custId], (err, invoice) => {
        if (err) {console.error(err); return res.status(500);}
        if (invoice.length !== 0) return res.json({ invoice: true });
        const sql = 'DELETE FROM customers WHERE id = ?';
        db.query(sql, [custId], (err, result) => {
            if (err) {
                console.error('Error deleting the customer:', err);
                return res.status(500).json({ message: 'Failed to delete customer' });
            }
            db.query('SELECT * FROM customers', (err, customers) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({customers});
            })
        })
    })
})

// Delete a delivery
app.delete('/deliveries-checkInv/:id', (req, res) => {
    const delId = req.params.id;
    db.query('SELECT * FROM posinvoices WHERE deliveryId = ?', [delId], (err, invoice) => {
        if (err) {console.error(err); return res.status(500);}
        if (invoice.length !== 0) return res.json({ invoice: true });
        const sql = 'DELETE FROM deliveries WHERE id = ?';
        db.query(sql, [delId], (err, result) => {
            if (err) {
                console.error('Error deleting the delivery:', err);
                return res.status(500).json({ message: 'Failed to delete delivery' });
            }
            const sql = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, address FROM deliveries';
            db.query(sql, (err, deliveries) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({deliveries});
            })
        })
    })
})

// Delete a worker
app.delete('/workers-checkInv/:id', (req, res) => {
    const workId = req.params.id;
    db.query('SELECT * FROM posinvoices WHERE workerId = ?', [workId], (err, invoice) => {
        if (err) {console.error(err); return res.status(500);}
        if (invoice.length !== 0) return res.json({ invoice: true });
        const sql = 'DELETE FROM workers WHERE id = ?';
        db.query(sql, [workId], (err, result) => {
            if (err) {
                console.error('Error deleting the delivery:', err);
                return res.status(500).json({ message: 'Failed to delete delivery' });
            }
            const sql = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, address FROM workers';
            db.query(sql, (err, workers) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({workers});
            })
        })
    })
})

//Loan:------------

// Fetch all loans
app.get('/loans', (req, res) => {
    const sql = `SELECT 
    loans.id, 
    loans.amount, 
    loans.oldAmount, 
    loans.invoiceNum, 
    DATE_FORMAT(posinvoices.newDate, "%W, %Y-%m-%d %h:%i:%s %p") AS posNowDate, 
    DATE_FORMAT(loans.nowDate, "%W, %Y-%m-%d %h:%i:%s %p") AS loanNowDate, 
    loans.paidTime, 
    loans.note, 
    loans.customer_id 
    FROM loans LEFT JOIN posinvoices ON loans.invoiceNum = posinvoices.id;`;
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching all loans:', err); // Logs actual error for debugging
            return res.status(500).json({ message: 'Failed to fetch laons' }); // Sends a user-friendly error message
        }
        res.json(result)
    })
})

// Fetch all loans by a specific customer id
app.get('/loans/:id', (req, res) => {
    const sql = `SELECT 
    loans.id, 
    loans.amount, 
    loans.oldAmount, 
    loans.invoiceNum, 
    DATE_FORMAT(posinvoices.newDate, "%W, %Y-%m-%d %h:%i:%s %p") AS posNowDate, 
    DATE_FORMAT(loans.nowDate, "%W, %Y-%m-%d %h:%i:%s %p") AS loanNowDate, 
    loans.paidTime, 
    loans.note, 
    loans.customer_id 
    FROM loans LEFT JOIN posinvoices ON loans.invoiceNum = posinvoices.id WHERE loans.customer_id = ?;`;
    const id = req.params.id;
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching all loans:', err); // Logs actual error for debugging
            return res.status(500).json({ message: 'Failed to fetch laons' }); // Sends a user-friendly error message
        }
        res.json(result);
    })
})

// Fetch all loans by a specific customer id
app.get('/loans-SelPosInvs/:id', (req, res) => {
    const searVal = req.query.searVal;
    const spliVal = searVal.split(' ');
    let sql = `SELECT 
    l.id, 
    l.amount, 
    l.oldAmount, 
    l.invoiceNum, 
    DATE_FORMAT(pisInv.newDate, "%W, %Y-%m-%d %h:%i:%s %p") AS posNowDate, 
    DATE_FORMAT(l.nowDate, "%W, %Y-%m-%d %h:%i:%s %p") AS loanNowDate, 
    l.note, 
    workers.name,
    pisInv.invStatus
    FROM loans l
    LEFT JOIN posinvoices pisInv ON l.invoiceNum = pisInv.id 
    LEFT JOIN workers ON l.worker_id = workers.id
    WHERE l.customer_id = ?`;
    const custId = req.params.id;
    const values =  [custId]
    if (searVal !== '') {
        sql += ` 
        AND EXISTS (
            SELECT 1 FROM positems po
            JOIN items i ON i.id = po.itemId
            WHERE po.pos_id = l.invoiceNum
        `
        spliVal.forEach(term => {
            sql += ` AND i.fullName LIKE ?`;
            values.push(`%${term}%`)
        })
        sql += ` )`
    }
    db.query(sql, values, (err, loans) => {
        if (err) {console.error(err); return res.status(500)}
        const sql = `SELECT id, name FROM workers`;
        db.query(sql, (err, workers) => {
            if (err) {console.error(err); return res.status(500)}
            res.json({ loans, workers });
        })
    })
})

// Fetch all loans by a specific loan id
app.get('/loans-loanId/:id', (req, res) => {
    const sql = `SELECT 
    loans.id, 
    loans.amount, 
    loans.oldAmount, 
    loans.invoiceNum, 
    DATE_FORMAT(posinvoices.newDate, "%W, %Y-%m-%d %h:%i:%s %p") AS posNowDate, 
    DATE_FORMAT(loans.nowDate, "%W, %Y-%m-%d %h:%i:%s %p") AS loanNowDate,
    DATE_FORMAT(loans.paidTime, "%W, %Y-%m-%d %h:%i:%s %p") AS paidTime,
    loans.note, 
    loans.customer_id,
    workers.name
    FROM loans
    LEFT JOIN posinvoices ON loans.invoiceNum = posinvoices.id 
    LEFT JOIN workers ON loans.resetter = workers.id 
    WHERE loans.id = ?;`;
    const id = req.params.id;
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching all loans:', err); // Logs actual error for debugging
            return res.status(500).json({ message: 'Failed to fetch laons' }); // Sends a user-friendly error message
        }
        res.json(result);
    })
})

// Fetch one loan by its id
app.get('/oneloan/:invoiceNum', (req, res) => {
    const sql = 'SELECT id, amount, invoiceNum, DATE_FORMAT(nowDate, "%Y-%m-%d, %H:%i:%s") AS nowDate, note, customer_id FROM loans WHERE invoiceNum = ?';
    const id = req.params.invoiceNum;
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching all loans:', err); // Logs actual error for debugging
            return res.status(500).json({ message: 'Failed to fetch laons' }); // Sends a user-friendly error message
        }
        res.json(result[0]);
    })
})

// Add a loan to a specific customer by id
app.post('/loans', (req, res) => {
    const sql = 'INSERT INTO loans (amount, invoiceNum, note, customer_id) VALUES (?, ?, ?, ?)';
    const { amount, invoiceNum, note, customer_id} = req.body;
    db.query(sql, [amount, invoiceNum, note, customer_id], (err, result) => {
        if (err) {
            console.error('Error inserting the loan');
            return res.status(500);
        }
        res.json(result)
    }) 
})

// Add a loan to a specific customer by id
app.post('/loans-and-get', (req, res) => {
    const amount = req.query.amount;
    const sql = 'INSERT INTO loans (amount, invoiceNum, note, customer_id, worker_id) VALUES (?, ?, ?, ?, ?)';
    const { invoiceNum, note, customer_id, worker_id } = req.body;
    db.query(sql, [amount, invoiceNum, note, customer_id, worker_id], (err, result) => {
        if (err) {console.error(err);return res.status(500);}
        const custid = req.query.curCustId;
        db.query(loanEditFilterQry, [custid], (err, allCustLoans) => {
            if (err) {console.error(err); return res.status(500)}
            const invIds = allCustLoans.map(loan => {
                const invNum = loan.invoiceNum;
                return invNum;
            }).filter(Boolean);
            let sql = `SELECT * FROM posinvoices WHERE id IN (${invIds.join(',')})`;
            const isIdsExists = invIds.length !== 0;
            if (!isIdsExists) sql = 'SELECT * FROM posinvoices WHERE id = -1;'
            db.query(sql, (err, posInvs) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({ allCustLoans, posInvs});
            })
        })
    }) 
})

// Add a loan to a specific customer by id
app.post('/loans-and-get-all', (req, res) => {
    const custId = req.body.customer_id;
    db.query('SELECT * FROM loans WHERE customer_id = ?', [custId], (err, custLons) => {
        let amount = 0;
        custLons.forEach(loan => amount += Number(loan.amount));
        amount = -amount;
        const sql = 'INSERT INTO loans (amount, invoiceNum, note, customer_id, worker_id) VALUES (?, ?, ?, ?, ?)';
        const { invoiceNum, note, customer_id, worker_id} = req.body;
        db.query(sql, [amount, invoiceNum, note, customer_id, worker_id], (err, result) => {
            if (err) {
                console.error('Error inserting the loan');
                return res.status(500);
            }
            const custid = req.query.curCustId;
            db.query(loanEditFilterQry, [custid], (err, allCustLoans) => {
                if (err) {
                    console.error('Error fetching all loans:', err); // Logs actual error for debugging
                    return res.status(500).json({ message: 'Failed to fetch laons' }); // Sends a user-friendly error message
                }
                const invIds = allCustLoans.map(loan => {
                    const invNum = loan.invoiceNum;
                    return invNum;
                }).filter(Boolean);
                let sql = `SELECT * FROM posinvoices WHERE id IN (${invIds.join(',')})`;
                const isIdsExists = invIds.length !== 0;
                if (!isIdsExists) sql = 'SELECT * FROM posinvoices WHERE id = -1;'
                db.query(sql, (err, posInvs) => {
                    if (err) {console.error(err); return res.status(500);}
                    res.json({ allCustLoans, posInvs});
                })
            })
        }) 
    })
})

app.put('/loans/:id', (req, res) => {
    const loanId = req.params.id;
    const updatedFields = req.body;
    if (Object.keys(updatedFields).length === 0) {
        return res.status(400).send('No fields provided for update');
    }
    const setClause = Object.keys(updatedFields)
    .map(key => `${key} = ?`) // Create "key = ?" for each field
    .join(', '); // Join them with commas
    const values = Object.values(updatedFields);
    values.push(loanId);
    const sql = `UPDATE loans SET ${setClause} WHERE id = ?`;
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating the loan:', err);
            return res.status(500).send('Internal Server Error');
        }
        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).send('Loan not found');
        }
        // Return a success response
        res.json({ message: 'Loan updated successfully', result });
    });
});

// Delete a loan by the loan id
app.delete('/loans/:id', (req, res) => {
    const loanId = req.params.id;
    const sql = 'DELETE FROM loans WHERE id = ?';
    db.query(sql, [loanId], (err, result) => {
        if (err) {
            console.error('Error deleting the loan:', err);
            return res.status(500).json({ message: 'Failed to delete loan' });
        }
        res.json(result);
    })
})

// Delete a loan by the loan id
app.delete('/loans-and-get/:id', (req, res) => {
    const loanId = req.params.id;
    const sql = 'DELETE FROM loans WHERE id = ?';
    db.query(sql, [loanId], (err, result) => {
        if (err) {
            console.error('Error deleting the loan:', err);
            return res.status(500).json({ message: 'Failed to delete loan' });
        }
        const custid = req.query.curCustId;
        db.query(loanEditFilterQry, [custid], (err, allCustLoans) => {
            if (err) {
                console.error('Error fetching all loans:', err); // Logs actual error for debugging
                return res.status(500).json({ message: 'Failed to fetch laons' }); // Sends a user-friendly error message
            }
            const invIds = allCustLoans.map(loan => {
                const invNum = loan.invoiceNum;
                return invNum;
            }).filter(Boolean);
            let sql = `SELECT * FROM posinvoices WHERE id IN (${invIds.join(',')})`;
            const isIdsExists = invIds.length !== 0;
            if (!isIdsExists) sql = 'SELECT * FROM posinvoices WHERE id = -1;'
            db.query(sql, (err, posInvs) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({ allCustLoans, posInvs});
            })
        })
    })
})

// Delete a loan by the loan id
app.delete('/loans-selectedOnes', (req, res) => {
    const ids = JSON.parse(req.query.ids);
    const sql = `DELETE FROM loans WHERE id in (${ids.join(',')})`;
    db.query(sql, [ids], (err, result) => {
        if (err) {
            console.error('Error deleting the loan:', err);
            return res.status(500).json({ message: 'Failed to delete loan' });
        }
        const custid = req.query.curCustId;
        db.query(loanEditFilterQry, [custid], (err, allCustLoans) => {
            if (err) {console.error(err); return res.status(500);}
            const invIds = allCustLoans.map(loan => {
                const invNum = loan.invoiceNum;
                return invNum;
            }).filter(Boolean);
            let sql = `SELECT * FROM posinvoices WHERE id IN (${invIds.join(',')})`;
            const isIdsExists = invIds.length !== 0;
            if (!isIdsExists) sql = 'SELECT * FROM posinvoices WHERE id = -1;'
            db.query(sql, (err, posInvs) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({ allCustLoans, posInvs});
            })
        })
    })
})

// Delete all loans from a specific customer
app.delete('/totalLoans/:id', (req, res) => {
    const customerId = req.params.id;
    const sql = 'DELETE FROM loans WHERE customer_id = ?';
    db.query(sql, [customerId], (err, result1) => {
        if (err) {
            console.error('Error deleting the customer loans:', err);
            return res.status(500).json({ message: 'Failed to delete loans' });
        }
        const custid = customerId;
        db.query(loanEditFilterQry, [custid], (err, allCustLoans) => {
            if (err) {
                console.error('Error fetching all loans:', err); // Logs actual error for debugging
                return res.status(500).json({ message: 'Failed to fetch laons' }); // Sends a user-friendly error message
            }
            const invIds = allCustLoans.map(loan => {
                const invNum = loan.invoiceNum;
                return invNum;
            }).filter(Boolean);
            let sql = `SELECT * FROM posinvoices WHERE id IN (${invIds.join(',')});`;
            const isIdsExists = invIds.length !== 0;
            if (!isIdsExists) sql = 'SELECT * FROM posinvoices WHERE id = -1;'
            db.query(sql, (err, posInvs) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({ allCustLoans, posInvs});
            })
        })
    })
})

// API route to export items to Excel
app.post("/export-excel", async (req, res) => {
    let rows = req.body.rows;
    const buyPrice = req.query.hiddingBuyPrice === 'true';
    const excSelectVal = req.query.excSelectVal;
    const [customer, order, group, jard] = [excSelectVal === 'Customer', excSelectVal === 'Order', excSelectVal === 'Group', excSelectVal === 'Jard'];
    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Stock Items");
    // Add headers with styling
    let headers = [
        "Id", "SKU", "Box ID", "Brand", "Model",
        "Category", "Quality", "Quantity.", "Buy Price", 
    ];
    !buyPrice ? headers = headers.filter(h => h !== 'Buy Price') : '';
    customer ? headers = headers.filter(h => h !== 'Id' && h !== 'SKU' && h !== 'Box ID' && h !== 'Quantity') : '';
    order ? headers = headers.filter(h => h !== 'SKU' && h !== 'Box ID' && h !== 'Price One' && h !== 'Price Two' && h !== 'Price Three' && h !== 'Price Five' && h !== 'Price Six' && h !== 'Price Sevin') : '';
    group ? headers = headers.filter(h => h === 'Brand' || h === 'Model' || h === 'Category' || h === 'Quality' || h === 'Price Four') : '';
    jard ? headers = headers.filter(h => h === 'Id' || h === 'Box ID' || h === 'Brand' || h === 'Model' || h === 'Category' || h === 'Quality' || h === 'Quantity') : '';
    const priceVal = req.query.priceVal;
    if (priceVal !== 'All' && priceVal !== '') {headers.push(priceVal);}
    else if (priceVal === 'All') headers.push('Price One', 'Price Two', 'Price Three', 'Price Four', 'Price Five', 'Price Six', 'Price Sevin');
    if (order) headers.push('Quantity', 'RMB Price');
    order ? headers.push('Discription') : '';
    const headerRow = worksheet.addRow(headers);;
    headerRow.eachCell((cell) => {
        cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1da355" }, // Green background
        };
        cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 13}; // White text
        cell.alignment = { horizontal: "center" }; // Center text horizontally
    });
    // Add rows dynamically from the data received from frontend
    const maxDiscLetterLength = [];
    rows.forEach(item => {
        const rowData = [];
        !customer &&  !order && !group && !jard ? rowData.push(item.id, item.sku, item.boxId) : '';
        order || jard ? rowData.push(item.id) : '';
        jard ? rowData.push(item.boxId) : '';
        rowData.push(
            item.brand,
            item.model,
            item.category,
            item.quality,
        )
        !customer && !group ? rowData.push(item.quantity) : '';
        buyPrice ? rowData.push(Number(item.buyPrice * 1000).toLocaleString()) : '';
        priceVal === 'Price One' ? rowData.push(Number(item.priceOne * 1000).toLocaleString()) : '';
        priceVal === 'Price Two' ? rowData.push(Number(item.priceTwo * 1000).toLocaleString()) : '';
        priceVal === 'Price Three' ? rowData.push(Number(item.priceThree * 1000).toLocaleString()) : '';
        priceVal === 'Price Four' ? rowData.push(Number(item.priceFour * 1000).toLocaleString()) : '';
        priceVal === 'Price Five' ? rowData.push(Number(item.priceFive * 1000).toLocaleString()) : '';
        priceVal === 'Price Six' ? rowData.push(Number(item.priceSix * 1000).toLocaleString()) : '';
        priceVal === 'Price Sevin' ? rowData.push(Number(item.priceSevin * 1000).toLocaleString()) : '';
        priceVal === 'All' ? rowData.push(
            Number(item.priceOne * 1000).toLocaleString(),
            Number(item.priceTwo * 1000).toLocaleString(),
            Number(item.priceThree * 1000).toLocaleString(),
            Number(item.priceFour * 1000).toLocaleString(),
            Number(item.priceFive * 1000).toLocaleString(),
            Number(item.priceSix * 1000).toLocaleString(),
            Number(item.priceSevin * 1000).toLocaleString(),
        ) : '';
        order ? rowData.push('', '') : '';
        order ? maxDiscLetterLength.push(item.discription.length) : '';
        order ? rowData.push(item.discription === 'null' ? '' : item.discription) : '';
        const row = worksheet.addRow(rowData);
        const ordQntcColuIndex = headers.indexOf('Quantity') + 1;
        const RMBColuIndex = headers.indexOf('RMB Price') + 1;
        const discColuIndex = headers.indexOf('Discription') + 1;
        row.eachCell((cell) => {
            cell.font = { bold: true, size: 13 };
            cell.alignment = { horizontal: "center" };
            order ? row.getCell(ordQntcColuIndex).font = { color: { argb: '00B0F0' }, bold: true, size: 13 } : '';
            order ? row.getCell(RMBColuIndex).font = { color: { argb: '00B050' }, bold: true, size: 13  } : '';
            order ? row.getCell(discColuIndex).alignment = { horizontal: "start" } : '';
        });
    });
    worksheet.getColumn(1).width = 10; // Increase width of the Model column
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 17;
    worksheet.getColumn(4).width = 25;
    worksheet.getColumn(5).width = 17;
    worksheet.getColumn(6).width = 18;
    worksheet.getColumn(7).width = 12;
    worksheet.getColumn(8).width = 15;
    worksheet.getColumn(9).width = 15;
    worksheet.getColumn(10).width = 15;
    worksheet.getColumn(11).width = 15;
    worksheet.getColumn(12).width = 15;
    worksheet.getColumn(13).width = 15;
    worksheet.getColumn(14).width = 15;
    worksheet.getColumn(15).width = 15;
    worksheet.getColumn(16).width = 15;
    const discColuIndex = headers.indexOf('Discription') + 1;
    let maxNum = Math.max(...maxDiscLetterLength);
    if (maxNum === 4) maxNum = 11;
    order ? worksheet.getColumn(discColuIndex).width = maxNum * 1.2 : '';
    if (order) {worksheet.getColumn(3).width = 35; worksheet.getColumn(5).width = 22;};
    // Send Excel file as a response
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=items.xlsx");
    if (order) {
        db.query('SELECT * FROM exctransl', async (err, transls) => {
            if (err) {console.error(err); return res.status(500)}
            transls.forEach(transl => {
                if (transl.ifState === '') return;
                worksheet.eachRow((row) => {
                    const matches = transl.ifState.split('-');
                    const matchText = matches.every(term => row.values.includes(term));
                    if (matchText) {
                        const index = row.values.findIndex(v => v && v.toString().trim() === transl.changeStat);
                        if (index !== -1) row.getCell(index).value = transl.afterChangeStat;
                    }
                });
            })
            await workbook.xlsx.write(res);
            res.end();
        })
    } else {
        await workbook.xlsx.write(res);
        res.end();
    }
});

// deliveries:--------------

// Fetching all deliveries
app.get('/deliveries', (req, res) => {
    const sql = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, address FROM deliveries';
    db.query(sql, (err, deliveries) => {
        if (err) {
            console.error('Error fetching all deliveries:', err); // Logs actual error for debugging
            return res.status(500).json({ message: 'Failed to fetch deliveries' }); // Sends a user-friendly error message
        }
        res.json({ deliveries })
    })
})

// Fetch a delivery by Id
app.get('/deliveries/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM deliveries WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching the delivery')
            return res.status(500).json({ error: 'Database error'});
        }
        res.json(result[0]);
    })
})

// Add a delivery
app.post('/deliveries', (req, res) => {
    const { name, phoneNo, address } = req.body;
    const sql = 'INSERT INTO deliveries (name, phoneNo, address) VALUES (?, ?, ?)';
    db.query(sql, [name, phoneNo, address], (err, result) => {
        if (err) {
            console.error('Error inserting the customer');
            return res.status(500);
        }
        res.json(result);
    })
})

// Update a delivery
app.put('/deliveries/:id', (req, res) => {
    const id = req.params.id;
    const updatedField = req.body;
    const fieldName = Object.keys(updatedField)[0];
    const fieldValue = updatedField[fieldName];
    const sql = `UPDATE deliveries set ${fieldName} = ? WHERE id = ?`
    db.query(sql, [fieldValue, id], (err, result) => {
        res.json(result);
    });
})

// Delete a delivery
app.delete('/deliveries/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM deliveries WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting the customer:', err);
            return res.status(500).json({ message: 'Failed to delete customer' });
        }
        res.json(result);
    })
})

// Workers:--------------

// Fetching all workers
app.get('/workers', (req, res) => {
    const sql = 'SELECT id, DATE_FORMAT(dateTime, "%Y-%m-%d, %H:%i:%s") AS dateTime, name, phoneNo, address FROM workers';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching all workers:', err); // Logs actual error for debugging
            return res.status(500).json({ message: 'Failed to fetch workers' }); // Sends a user-friendly error message
        }
        res.json(result)
    })
})

// Fetch a worker by Id
app.get('/workers/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT * FROM workers WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching the worker')
            return res.status(500).json({ error: 'Database error'});
        }
        res.json(result[0]);
    })
})

// Add a worker
app.post('/workers', (req, res) => {
    const { name, phoneNo, address } = req.body;
    const sql = 'INSERT INTO workers (name, phoneNo, address) VALUES (?, ?, ?)';
    db.query(sql, [name, phoneNo, address], (err, result) => {
        if (err) {
            console.error('Error inserting the worker');
            return res.status(500);
        }
        res.json(result);
    })
})

// Update a worker
app.put('/workers/:id', (req, res) => {
    const id = req.params.id;
    const updatedField = req.body;
    const fieldName = Object.keys(updatedField)[0];
    const fieldValue = updatedField[fieldName];
    const sql = `UPDATE workers set ${fieldName} = ? WHERE id = ?`
    db.query(sql, [fieldValue, id], (err, result) => {
        res.json(result);
    });
})

// Delete a worker
app.delete('/workers/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM workers WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting the worker:', err);
            return res.status(500).json({ message: 'Failed to delete worker' });
        }
        res.json(result);
    })
})

// add a profit
app.post('/addProfit', (req, res) => {
    const sql = `INSERT INTO profits (price, start, end, proAmount, disOrder) VALUES (?, ?, ?, ?, ?)`;
    const priVal = req.query.priVal;
    let disOrder = req?.query?.disOrder;
    disOrder = disOrder === 'undefined' ? 1000000 : disOrder;
    db.query(sql, [priVal, 0, 0, 0, disOrder], (err) => {
        if (err) {console.error(err); return res.status(500);}
        db.query('SELECT * FROM profits WHERE price = ? ORDER BY disOrder;', [priVal], (err, profits) => {
            if (err) {console.error(err); return res.status(500);}
            let ind = 0;
            const cases = profits.map(profit => {
                const str = `WHEN ${profit.id} THEN ${ind}`;
                ind++;
                return str;
            }).join(' ');
            const ids = profits.map(profit => profit.id);
            const sql = `UPDATE profits SET disOrder = CASE id ${cases} END WHERE id IN (${ids.join(',')})`;
            db.query(sql, (err) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({ profits })
            })
        })
    })
})

// fetch all profits
app.get('/getProfits', (req, res) => {
    const newVal = req.query.price;
    let sql = 'SELECT * FROM profits';
    if (newVal && newVal !== 'All') sql += ' WHERE price = ? ORDER BY disOrder;';
    else {sql += ' ORDER BY disOrder;'}
    db.query(sql, [newVal], (err, profits) => {
        if (err) {console.error(err); return res.status(500);}
        res.json({ profits })
    })
})

// delete a profit
app.delete('/deleteProfits/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM profits WHERE id = ?', [id], (err) => {
        if (err) {console.error(err); return res.status(500);}
        res.json({ success: true });
    })
})

// Update a profit
app.put('/updateProfit', (req, res) => {
    const updAm = JSON.parse(req.query.updatedAmounts);
    const dbUpdateFields = `start = ${updAm.start}, end = ${updAm.end}, proAmount = ${updAm.proAmount}`;
    const id = req.query.id;
    db.query(`UPDATE profits SET ${dbUpdateFields} WHERE id = ?`, [id], (err) => {
        if (err) {console.error(err); return res.status(500);}
        res.json({ success: true });
    })
})

function queryAsync(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

app.get('/payLoan/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM loans WHERE id = ?', [id], (err, loan) => {
        const amount = loan[0].amount;
        const oldAmount = loan[0].oldAmount;
        const resetter = req.query.resetter;
        const checkBox = req.query.checkBox === 'true';
        if (checkBox && Number(amount) === 0) return res.json({ success: 'already paid', loan: loan[0] })
        else if (!checkBox && Number(oldAmount) === 0) return res.json({ success: 'already canceled', loan: loan[0] });
        let sql = `UPDATE loans SET resetter = ?, amount = ?, oldAmount = ?${checkBox ? `, paidTime = '${dateTime()}'` : ''} WHERE id = ?;`;
        db.query(sql, [resetter, oldAmount, amount, id], (err) => {
            if (err) {console.error(err); return res.status(500);}
            db.query('SELECT * FROM loans WHERE id = ?', [id], (err, loan) => {
                if (err) {console.error(err); return res.status(500);}
                res.json({ loan: loan[0], success: true })
            })
        })
    })
})

function dateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

app.get('/check-item-qnt', (req, res) => {
    db.query(filtItemsQuery, (err, allItems) => {
        if (err) {console.error(err); return res.status(500);}
        const sql = `SELECT 
        stockentinvs.id,
        DATE_FORMAT(stockentinvs.nowDate, "%Y-%m-%d, %H:%i:%s") AS nowDate,
        stockentinvs.sku,
        stockentinvs.invStatus,
        stockentinvs.remark,
        JSON_ARRAYAGG(JSON_OBJECT(
            'id', stockitems.id,
            'inv_id', stockitems.inv_id,
            'itemId', stockitems.itemId,
            'quantity', stockitems.quantity,
            'lastQuantity', stockitems.lastQuantity,
            'buyPrice', stockitems.buyPrice
        )) AS items
        FROM stockentinvs
        LEFT JOIN stockitems ON stockitems.inv_id = stockentinvs.id
        WHERE stockentinvs.invStatus != 'Pending'
        GROUP BY stockentinvs.id
        `
        db.query(sql, (err, stockInvs) => {
            if (err) {console.error(err); return res.status(500);}
            const missiQntItmes = [];
            for(const i of allItems) {
                const id = i.id;
                const filtStInvs = stockInvs.filter(inv => 
                    inv.items.some(item => item.itemId === id && item.lastQuantity !== 0));
                let totalStQnt = 0;
                for(const inv of filtStInvs) {
                    const tarI = inv.items.find(item => item.itemId === id);
                    totalStQnt += tarI.lastQuantity;
                }
                const tabI = allItems.find(i => i.id === id);
                if (totalStQnt !== tabI.quantity) {
                    const itemName = `${i.brand_name} ${i.model_name} ${i.category_name} ${i.quality_name}`;
                    missiQntItmes.push({ id, itemName, totalStQnt })
                }
            }
            const cases = missiQntItmes.map(i => `WHEN ${i.id} THEN ${i.totalStQnt}`).join(' ');
            let ids = missiQntItmes.map(i => i.id);
            if (ids.length === 0) return res.json({ missiQntItmes });
            const sql = `UPDATE items SET quantity = CASE id ${cases}END WHERE id IN (${ids})`;
            if (req.query.update === 'true') {
                db.query(sql, (err) => {
                    if (err) {console.error(err); return res.status(500)}
                    res.json({ missiQntItmes: 'All Updated' });
                })
            } else {res.json({ missiQntItmes })}
        })
    })
})

app.get('/stockentinvs-stItems', (req, res) => {
    db.query(stockAndStockItemsQry(false), (err, stInvs) => {
        if (err) {console.error(err); return res.status(500);}
        res.json({ stInvs })
    })
})

app.get('/stockentinvs-stItems/:id', (req, res) => {
    const invId = req.params.id;
    db.query(posInvQuery, [invId], (err, inv) => {
        if (err) {console.error(err); return res.status(500);}
        res.json({ inv: inv[0] })
    })
})

app.post('/add-transl', (req, res) => {
    const sql = `INSERT INTO exctransl (ifState, changeStat, afterChangeStat) VALUES ('', '', '')`;
    db.query(sql, (err) => {
        if (err) {console.error(err); return res.status(500)}
        db.query('SELECT * FROM exctransl', (err, transls) => {
            if (err) {console.error(err); return res.status(500)}
            res.json({ transls })
        })
    })
})

app.get('/get-transls', (req, res) => {
    db.query('SELECT * FROM exctransl', (err, transls) => {
        if (err) {console.error(err); return res.status(500)}
        res.json({ transls })
    })
})

app.put('/update-transl', (req, res) => {
    const { ifState, changeStat, afterChangeStat } = req.body;
    const id = req.query.id;
    const sql = 'UPDATE exctransl SET ifState = ?, changeStat = ?, afterChangeStat = ? WHERE id = ?';
    db.query(sql, [ifState, changeStat, afterChangeStat, id], (err) => {
        if (err) {console.error(err); return res.status(500)}
        res.json()
    })
})

app.delete('/del-transls', (req, res) => {
    const id = req.query.id;
    db.query('DELETE FROM exctransl WHERE id = ?', [id], (err) => {
        if (err) {console.error(err); return res.status(500)}
        res.json()
    })
})

app.get('/select1', (req, res) => {
    res.json({ success: true })
})

app.get('/get-item-name', (req, res) => {
    const sql = `SELECT 
    i.id, 
    b.name AS brand_name, 
    m.name AS model_name, 
    c.name AS category_name, 
    q.name AS quality_name, 
    i.quantity, 
    i.buyPrice, 
    i.priceOne, 
    i.display_order, 
    i.changingId, 
    i.SKU, 
    i.boxId, 
    i.disable, 
    i.noExcel, 
    i.discription, 
    c.circle_ball AS ball 
    FROM items i 
    JOIN brand b ON i.brand = b.id 
    JOIN model m ON i.model = m.id 
    JOIN category c ON i.category = c.id 
    JOIN quality q ON i.quality = q.id 
    ORDER BY i.display_order`;
    db.query(sql, (err, items) => {
        res.json(items)
    })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});