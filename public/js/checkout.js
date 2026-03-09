
/* =====================================================
   GLOBAL DATA & APPLICATION STATE
   ===================================================== */


// Injected server-side datasets
dataset = window.dataset;
localStorage.setItem("onPage","checkout")
taxset  = window.tax_data;
invoice_data = window.invoice_data;
const tax_slab_shift = 2500

// Debug
console.log(dataset, taxset, invoice_data);

// DOM references
const add_box = document.querySelector(".add");
const bag_box = document.querySelector(".bag-display");

// Core order object (single source of truth)
let full_order_information = {
    order_id : "",
    invoice_number : "",
    gst : {
        total : 0,
        cgst : 0,
        sgst : 0,
        igst : 0
    },
    data_verified : false,
    gross_sub_total : 0,
    taxable_total : 0,
    whatsappConf : "false",
    final_total : 0,
    final_total_words : "",
    nextInvoiceNumber : 0,
    discount_info : {
        discount_type : "",
        item_level : 0,
        order_level : 0,
        delivery_discount : 0
    },
    products_info : [],
    tax_groups : [],
    order_type : "",
    customer_num : "",
    customer_name : "",
    delivery_attributes : {
        address : "",
        charges : 0,
        packaged : false,
        delivered : false,
        type :  "intraState",
        reciever:"",
        receiver_number : "",
        receiver_name : ""
    },
    payment_info : {
        status : "",
        method : ""
    }
};

// Generate order ID once
full_order_information.order_id = crypto.randomUUID();




/* =====================================================
   BARCODE INPUT HANDLER
   ===================================================== */

add_box.addEventListener("input", () => {

    for (let product of dataset) {

        if (product.barcode == add_box.value) {

            add_box.value = ""; // clear input after scan

            /* ---------- Create Bag Item ---------- */
            const existingBagItem = bag_box.querySelector(
            `.bag-item[data-barcode="${product.barcode}"]`
            );

            if (existingBagItem) {

            const qtySelect = existingBagItem.querySelector("#quantity");
            let currentQty = Number(qtySelect.value);

            if (currentQty < product.stock) {
                qtySelect.value = currentQty + 1;
            }

            add_box.value = "";
            recalculateAndRender();
            return;   // stop creating a new item
            }

            const item = document.createElement("div");
            item.className = "bag-item";

            // Attach metadata to DOM node
            item.dataset.barcode = product.barcode;
            item.dataset.price = product.mrp;
            item.dataset.category_generated = false;


            item.innerHTML = `
                <div class="pic-and-item-info">
                    <img class="item-pic" src="${product.images[0]}">

                    <div class="item-info">
                        <div class="item-info-txt" style="font-family:var(--font-body); font-size : var(--space-xl);">
                            ₹ ${product.mrp}
                        </div>

                        <div class="item-info-txt">${product.name}</div>
                        <div class="item-info-txt">Category : ${product.category}</div>

                        <div class="quantity-discount">
                            <div class="input-box">
                                <label class="item-info-txt">Quantity</label>
                                <select id="quantity" class="item-info-select">
                                    <option value="1">1</option>
                                </select>
                            </div>
                            <div class="input-box">
                                <input id="itemDiscount" type = "text" class="item-info-input" style = "width:100%" placeholder = "Enter Item Discount">
                            </div>
                            <div class="input-box" style = "width:20%">
                                <select id="itemDiscountType" class="item-info-select"style = "font-size:var(--space-s)">
                                    <option value="none">Discount Type</option>
                                    <option value="flat">₹ Flat</option>
                                    <option value="percent">% Percent</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <button class="item-remove">
                    <i data-lucide="x"></i>
                </button>
            `;

            bag_box.appendChild(item);

            /* ---------- Add Product to Order State ---------- */
            

            full_order_information.products_info.push({
                barcode  : product.barcode,
                name     : product.name,
                material : product.material,
                category : product.category,
                hsnCode  : product.hsnCode,
                price    : product.mrp,
                attributes : product.attributes,
                quantity : 0,
                gst_rate : 0,
                gst_amount : 0,
                igst : 0,
                cgst : 0,
                sgst  :0,
                line_total : 0,
                order_level_discount : 0,
                discount_amount : 0,
                item_discount_type : 0,
                discounted_line_total : 0,
                discounted_taxed_line_total : 0
            });

            /* ---------- Quantity Setup ---------- */

            const quantity_select = item.querySelector("#quantity");

            if (item.dataset.category_generated !== "true") {
                for (let x = 2; x <= product.stock; x++) {
                    quantity_select.innerHTML += `<option value="${x}">${x}</option>`;
                }
                item.dataset.category_generated = "true";
            }

            // Quantity change triggers full recalculation
            quantity_select.addEventListener("change", () => {
                recalculateAndRender();
            });
            //Item Level Discount Type - 
            const itemDiscountType = item.querySelector("#itemDiscountType")
            itemDiscountType.addEventListener("change",()=>{
                recalculateAndRender()
            })
            //Item Level Discount Steup - 
            const itemDiscount = item.querySelector("#itemDiscount")
            itemDiscount.addEventListener("change",()=>{
                recalculateAndRender()
            })

            /* ---------- Initial Subtotal Update ---------- */

            full_order_information.gross_sub_total += product.price;
            full_order_information.taxable_total = full_order_information.gross_sub_total
            for(let x of full_order_information.products_info){
                if(x.barcode === product.barcode){
                    x.discounted_line_total = full_order_information.gross_sub_total
                }
            }
            gstCalc()
            recalculateAndRender();

            lucide.createIcons();

            /* ---------- Remove Item Handler ---------- */

            item.querySelector(".item-remove").addEventListener("click", (e) => {
                e.target.closest(".bag-item").remove();
                full_order_information.products_info = full_order_information.products_info.filter(el=>el.barcode != product.barcode)
                recalculateAndRender();
            });
            break
        }
    }
});




/* =====================================================
   DISCOUNT / DELIVERY / PAYMENT EVENT HANDLERS
   ===================================================== */

const discountTotal = document.querySelector("#discountTotal");
const discountType  = document.querySelector("#discountType");
const order_type    = document.querySelector("#orderType");
const payment       = document.querySelector("#payment");
const customerMobile = document.querySelector("#customerMobile");
const paymentStatus = document.querySelector("#paymentStatus")
const customerName = document.querySelector("#customerName")
const orderDetailsSection = document.querySelector(".order-details")
const paymentStatusElement = document.querySelector("#paymentStatus")
const paymentStatusBox = paymentStatusElement ? paymentStatusElement.closest(".input-box") : null

function toggleSemiPaidInput(showInput) {
    const existingInput = document.querySelector("#semiPaidAmt");
    const existingBox = existingInput ? existingInput.closest(".input-box") : null;
    if (showInput) {
        if (!existingBox && paymentStatusBox && orderDetailsSection) {
            paymentStatusBox.insertAdjacentHTML("afterend", `
                <div class="input-box">
                    <label class="item-info-txt">Paid Amt</label>
                    <input id="semiPaidAmt" class="item-info-input" style="background-color: white" placeholder="Enter Semi-Paid Amount">
                </div>
            `);
            const semiPaidInput = document.querySelector("#semiPaidAmt");
            semiPaidInput.addEventListener("change", () => {
                const value = Number(semiPaidInput.value);
                full_order_information.payment_info.semi_paid_amount = Number.isFinite(value) ? value : 0;
            });
        }
    } else if (existingBox) {
        existingBox.remove();
        delete full_order_information.payment_info.semi_paid_amount;
    }
}

paymentStatus.addEventListener("change",()=>{
    full_order_information.payment_info.status = paymentStatus.value
    toggleSemiPaidInput(paymentStatus.value === "semiPaid");
})

discountType.addEventListener("change", recalculateAndRender);
discountTotal.addEventListener("change", recalculateAndRender);
order_type.addEventListener("change", recalculateAndRender);

payment.addEventListener("change", () => {
    full_order_information.payment_info.method = payment.value;
});
document.querySelector("#whatsappConf").addEventListener("change",()=>{
    if(full_order_information.whatsappConf == "false"){
        full_order_information.whatsappConf = "true"
    }else{
        full_order_information.whatsappConf = "false"
    }
})

customerMobile.addEventListener("change", () => {
    full_order_information.customer_num = customerMobile.value;
});
customerName.addEventListener("change",()=>{
    full_order_information.customer_name = customerName.value
})




/* =====================================================
   ADDRESS INPUT HANDLING
   ===================================================== */

document.querySelector(".order-details")
.addEventListener("change", (e) => {
    if (e.target.id === "orderAddress") {
        full_order_information.delivery_attributes.address = e.target.value;
    }
});




/* =====================================================
   INVOICE NUMBER GENERATION
   ===================================================== */

function getFinancialYear(date = new Date()) {
    const y = date.getFullYear();

    if (date.getMonth() >= 3) {
        return {
            start: String(y).slice(-2),
            end: String(y + 1).slice(-2)
        };
    } else {
        return {
            start: String(y - 1).slice(-2),
            end: String(y).slice(-2)
        };
    }
}

const fy = getFinancialYear();

const nextInvoiceNumber =
    invoice_data.length === 0
        ? 1
        : invoice_data[0].lastInvoiceNumber + 1;

full_order_information.invoice_number =
    `MPD/${String(nextInvoiceNumber).padStart(4, "0")}/${fy.start}/${fy.end}`;

full_order_information.nextInvoiceNumber = nextInvoiceNumber + 1;

//Delivery Event Listner - 
const orderType = document.querySelector("#orderType")
orderType.addEventListener("change",()=>{
    full_order_information.order_type = orderType.value
    renderChanges()
    
})

/* =====================================================
   RENDER FUNCTION (DOM ONLY)
   ===================================================== */

function renderChanges() {

    document.querySelector("#sub-total").textContent =
        `₹ ${roundTo2(full_order_information.gross_sub_total)}`;

    document.querySelector("#discount-show-order").textContent =
        `- ₹ ${roundTo2(full_order_information.discount_info.order_level)}`;
    document.querySelector("#taxable-total").textContent = 
        `₹ ${roundTo2(full_order_information.taxable_total)}`
    document.querySelector("#discount-show-item").textContent = 
        ` - ₹ ${ roundTo2(full_order_information.discount_info.item_level)}`
    document.querySelector("#gst-total").textContent = 
        ` + ₹ ${ roundTo2(full_order_information.gst.total)} `
    document.querySelector("#final_total").textContent = 
        `₹ ${ Math.round(full_order_information.final_total)}`  

    /* ---------- Address Box Handling ---------- */

    const addr = document.querySelector("#orderAddress");
    const receiverSelectExisting = document.querySelector("#orderReceiver");
    const receiverNumberExisting = document.querySelector("#receiverNumber");
    const receiverNameExisting = document.querySelector("#receiverName");
    const orderDetailsSection = document.querySelector(".order-details");
    if (full_order_information.order_type === "delivery" && !addr) {
        orderDetailsSection.insertAdjacentHTML("beforeend", `
            <div class="input-box">
                <label class="item-info-txt" >Order Address</label>
                <input id="orderAddress" class="item-info-input" style="background-color: white"; placeholder="Enter Order Address">
            </div>
        `);
        orderDetailsSection.insertAdjacentHTML("beforeend", `
            <div class="input-box">
                <label class="item-info-txt" >Reciever</label>
                <select id="orderReceiver" class="item-info-select" style="background-color: white">
                <option value = "">Select Receiver Type</option>
                <option value = "sameAsCustomer">Same as Customer</option>
                <option value = "differentReceiver">Different Receiver</option>

                </select>
            </div>
        `);
        const receiverSelect = document.querySelector("#orderReceiver");
        if(receiverSelect){
            receiverSelect.addEventListener("change",(evt)=>{
                const receiverChoice = evt.target.value;
                full_order_information.delivery_attributes.reciever = receiverChoice;
                let receiverNumberInput = document.querySelector("#receiverNumber");
                let receiverNameInput = document.querySelector("#receiverName");

                if(receiverChoice === "differentReceiver"){
                    if(!receiverNameInput){
                        orderDetailsSection.insertAdjacentHTML("beforeend", `
                            <div class="input-box">
                                <label class="item-info-txt" >Receiver Name</label>
                                <input id="receiverName" class="item-info-input" style="background-color: white" placeholder="Enter Receiver Name">
                            </div>
                        `);
                        receiverNameInput = document.querySelector("#receiverName");
                        receiverNameInput.addEventListener("change", ()=>{
                            full_order_information.delivery_attributes.receiver_name = receiverNameInput.value;
                        });
                    }
                    if(!receiverNumberInput){
                        orderDetailsSection.insertAdjacentHTML("beforeend", `
                            <div class="input-box">
                                <label class="item-info-txt" >Receiver Number</label>
                                <input id="receiverNumber" class="item-info-input" style="background-color: white" placeholder="Enter Receiver Number">
                            </div>
                        `);
                        receiverNumberInput = document.querySelector("#receiverNumber");
                        receiverNumberInput.addEventListener("change", ()=>{
                            full_order_information.delivery_attributes.receiver_number = receiverNumberInput.value;
                        });
                    }
                } else {
                    if(receiverNameInput){
                        receiverNameInput.parentElement.remove();
                    }
                    if(receiverNumberInput){
                        receiverNumberInput.parentElement.remove();
                    }
                    full_order_information.delivery_attributes.receiver_name = full_order_information.customer_name;
                    full_order_information.delivery_attributes.receiver_number = full_order_information.customer_num;
                }
            })
        }
        const orderAddress = document.querySelector("#orderAddress")
        orderAddress.addEventListener("change",()=>{
            let address = (orderAddress.value).toLowerCase()
            if(!address.includes("delhi")){
                for(let x of full_order_information.products_info){
                    x.cgst = 0
                    x.sgst = 0
                    x.igst = x.gst_rate
                    full_order_information.delivery_attributes.type = "interState"
                }
            }
            else if(address.includes("delhi")){
                for(let x of full_order_information.products_info){
                    x.cgst = x.gst_rate/2
                    x.sgst = x.gst_rate/2
                    x.igst = 0
                    full_order_information.delivery_attributes.type = "intraState"
                }
            }
        })
    }
    if (full_order_information.order_type === "inStore") {
        if(addr){
            addr.parentElement.remove();
        }
        if(receiverSelectExisting){
            receiverSelectExisting.parentElement.remove();
        }
        if(receiverNumberExisting){
            receiverNumberExisting.parentElement.remove();
        }
        if(receiverNameExisting){
            receiverNameExisting.parentElement.remove();
        }
    }

    /* ---------- Order Breakdown ---------- */

    const order_disection = document.querySelector(".order-disection");
    order_disection.innerHTML = "";

    for (let item of full_order_information.products_info) {
        order_disection.innerHTML += `
            <div class="disection-item">
                <span>${item.name}</span>
                <span style = "font-size:"var(--space-s)"">${item.gst_rate}%</span>
                <span>₹${item.line_total}</span>
            </div>
        `;
    }
}
//Rceiver Event Listner  - 





/* =====================================================
   RECALCULATION FUNCTION (LOGIC + STATE)
   ===================================================== */

function recalculateAndRender() {

    let new_subtotal = 0;
    const bag_items = document.querySelectorAll(".bag-item");
    
    // Reset item level discount
    full_order_information.discount_info.item_level = 0;
    
    // Reset discount_amount for all products
    for (let p of full_order_information.products_info) {
        p.discount_amount = 0;
    }

    bag_items.forEach(bagItem => {

        const qty = Number(bagItem.querySelector("#quantity").value);
        const itemDiscount = Number(bagItem.querySelector("#itemDiscount").value)
        const itemDiscountType = bagItem.querySelector("#itemDiscountType")
        const price = Number(bagItem.dataset.price);
        const barcode = bagItem.dataset.barcode;

        for (let p of full_order_information.products_info) {
            if (p.barcode === barcode) {
                p.quantity = qty;
                p.line_total = qty * price;
                if(itemDiscountType.value == "flat"){
                    p.discount_amount = itemDiscount
                    full_order_information.discount_info.item_level += p.discount_amount
                    let bill_discount_percent = ((p.discount_amount + p.order_level_discount)/p.line_total)*100
                    p.bill_discount_percent = bill_discount_percent
                }else if(itemDiscountType.value == "percent"){
                    p.discount_amount =(p.line_total*(itemDiscount/100))
                    full_order_information.discount_info.item_level += p.discount_amount
                    let bill_discount_percent = ((p.discount_amount + p.order_level_discount)/p.line_total)*100
                    p.bill_discount_percent = bill_discount_percent
                }
                // Keep discounted base up to date (before order discount)
                p.discounted_line_total = p.line_total - p.discount_amount;
                p.order_level_discount = 0;
            }
        }

        new_subtotal += qty * price;
    });

    full_order_information.gross_sub_total = new_subtotal;

    /* ---------- Discount Logic Order Level ---------- */

    if (discountType.value === "none") {
        full_order_information.discount_info.discount_type = "none";
        full_order_information.discount_info.order_level = 0;
        // No order discount, so discounted_line_total already equals line_total - itemDiscount
        full_order_information.taxable_total = full_order_information.gross_sub_total - full_order_information.discount_info.item_level;

        discountTotal.disabled = true;
        discountTotal.value = 0;
    } else {
        discountTotal.disabled = false;

        if (discountType.value === "flat") {
            full_order_information.discount_info.discount_type = "flat";
            full_order_information.discount_info.order_level = Number(discountTotal.value);
            // Taxable total before order discount
            let taxable_before_order_discount = full_order_information.gross_sub_total - full_order_information.discount_info.item_level;
            full_order_information.taxable_total = taxable_before_order_discount - full_order_information.discount_info.order_level;
            
            for(let x of full_order_information.products_info){
                // Calculate line total after item discount first
                let line_after_item_discount = x.line_total - x.discount_amount;
                // Calculate share based on value BEFORE order discount
                let item_share = line_after_item_discount / taxable_before_order_discount;
                x.order_level_discount = (item_share * full_order_information.discount_info.order_level)
                x.discounted_line_total =line_after_item_discount - x.order_level_discount
                let bill_discount_percent = ((x.discount_amount + x.order_level_discount)/x.line_total)*100
                x.bill_discount_percent = bill_discount_percent
            }

        }

        if (discountType.value === "percent") {
            full_order_information.discount_info.discount_type = "percent";
            // Calculate on taxable_total (after item discounts), not gross_sub_total
            let taxable_after_item_discount = full_order_information.gross_sub_total - full_order_information.discount_info.item_level;
            full_order_information.discount_info.order_level = taxable_after_item_discount * discountTotal.value / 100;
            full_order_information.taxable_total = taxable_after_item_discount - full_order_information.discount_info.order_level;
            
            for(let x of full_order_information.products_info){
                // Calculate line total after item discount first
                let line_after_item_discount = x.line_total - x.discount_amount;
                // Calculate share based on value BEFORE order discount
                let item_share = line_after_item_discount / taxable_after_item_discount;
                x.order_level_discount = (item_share * full_order_information.discount_info.order_level)
                x.discounted_line_total = line_after_item_discount - x.order_level_discount
                let bill_discount_percent = ((x.discount_amount + x.order_level_discount)/x.line_total)*100
                x.bill_discount_percent = bill_discount_percent
            }

        }
    }
    //Taxable Value Updation - 
    full_order_information.taxable_total = (full_order_information.gross_sub_total - full_order_information.discount_info.item_level) -  full_order_information.discount_info.order_level

    /* ---------- Delivery Logic ---------- */

    gstCalc()
    renderChanges();
}
function gstCalc(){
    full_order_information.gst.total = 0;
    full_order_information.final_total = 0;
    full_order_information.taxable_total = 0;
    full_order_information.final_total_words = ""

    for(let x of full_order_information.products_info){
        console.log(x)

        const taxInfo = taxset.find(y => y.hsnCode == x.hsnCode);
        if(!taxInfo){
            console.warn("Missing tax info for HSN", x.hsnCode);
            continue;
        }

        let rate = taxInfo.gstRate1;

        // ----- FORCE 5% FOR SAREES -----
        if(x.category === "sarees"){
            rate = 5;
        }
        //-----FORCE 3% FOR JEWELLARY-----
        else if(x.category == "jewellery"){
            rate = 3;
        }

        // ----- FORCE 5% FOR UNSTITCHED BLOUSE -----
        else if(
            x.category === "blouse" &&
            x.attributes &&
            x.attributes?.blouseType === "unstitched"
        ){
            rate = 5;
        }

        // ----- NORMAL SLAB LOGIC -----
        else{

            const unit_price = x.discounted_line_total / x.quantity;

            if(unit_price <= 2600){
                rate = 5;
            }
            else if(unit_price >= 3000){
                rate = 18;
            }

        }

        // ---------- GST EXTRACTION ----------
        const base_price = x.discounted_line_total / (1 + rate/100);
        x.taxable_value = base_price;
        const gst_amount = x.discounted_line_total - base_price;

        x.gst_rate = rate;
        x.gst_amount = gst_amount;

        // ---------- FINAL LINE TOTAL ----------
        x.discounted_taxed_line_total = x.discounted_line_total;

        // ---------- TAX SPLIT ----------
        x.cgst = gst_amount / 2;
        x.sgst = gst_amount / 2;
        x.igst = gst_amount;

        // ---------- ORDER TOTALS ----------
        full_order_information.gst.total += gst_amount;
        full_order_information.final_total += x.discounted_line_total;
        full_order_information.taxable_total += base_price;
    }

    numToWord()

    const taxGroupsBase = buildTaxGroups(full_order_information.products_info);
    full_order_information.tax_groups = applyGSTToGroups(taxGroupsBase);
}
const order_summary = document.querySelector("#order-summary")
order_summary.addEventListener("click",()=>{
    console.log(full_order_information)
})


//Complete Purchase Code - 
const purchase = document.querySelector(".purchase")
const d = new Date();
const date = String(d.getDate()).padStart(2, "0");
const month = String(d.getMonth() + 1).padStart(2, "0"); // months start at 0
const year = d.getFullYear();

const formattedDate = `${date}-${month}-${year}`;
full_order_information.orderDate = formattedDate
purchase.addEventListener("click",()=>{
    let message = ""
    let verified = true
     async function validateAndBill(){
        if((full_order_information.payment_info.method).length == 0){
            message = "Please Choose Payment Method"
            verified = false
        }else if(full_order_information.payment_info.status == "semiPaid"){
            if(!full_order_information.payment_info.semi_paid_amount){
                message = "Please Enter Amount Paid"
                verified = false
              
            }
        }
        if((full_order_information.payment_info.status).length == 0){
            message = "Please Choose Payment Status"
            verified = false
        }
        if((full_order_information.customer_num).length == 0){
            message = "Please Enter Customer Number"
            verified = false
        }
        if((full_order_information.customer_name).length == 0){
            message = "Please Enter Customer Name"
            verified = false
        }else if(!/^[a-z ]+$/i.test(full_order_information.customer_name)){
            message = "Invalid Format for Name"
            verified = false

        }
        if((full_order_information.products_info).length == 0){
                    message = "Please Add Products to Bill"
                    verified = false
        }
        if((full_order_information.order_type).length == 0){
            message = "Please Choose Order Type"
            verified = false
        }else{
            if(full_order_information.order_type == "delivery"){
                if((full_order_information.delivery_attributes.address).length == 0){
                    message = "Please Enter Delivery address"
                    verified = false
                }
                if((full_order_information.delivery_attributes.reciever).length == 0){
                    message = "Please Enter Reciever Type"
                    verified = false
                }else{
                    if(full_order_information.delivery_attributes.reciever == "differentReceiver"){
                        if((full_order_information.delivery_attributes.receiver_name).length == 0){
                            message = "Please Enter Reciever Name"
                            verified = false
                        }
                        if((full_order_information.delivery_attributes.receiver_number).length == 0){
                            message = "Please Enter Receiver Number"
                            verified = false
                        }
                    }
                }
                
            }

        }
        if(verified == true){
            full_order_information.data_verified = true
            async function checkout(){
                try {
                    const response = await fetch(`/admin/checkout/orderConfirmation/${full_order_information.order_id}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(full_order_information)
                    });

                    const result = await response.json();
                    if(!response.ok){
                        throw new Error(result.message || "Order failed");
                    }
                    window.location.href = "/admin/bill"


                } catch(err) {
                    console.log("Error:", err)
                    window.showAlert("danger","Invoice Preview Generation Failed")
                }
            }
            checkout()

        }


    }
    validateAndBill()
    showAlert("info",message)
    console.log(verified)
    
})
function numToWord() {
    // ---------- FINAL TOTAL (RupeES + PAISE) ----------
    const total = Math.round(Number(full_order_information.final_total));

    const rupees = Math.floor(total);
    const paise = Math.round((total - rupees) * 100);

    let rupeeWords = numberToWords.toWords(rupees);
    rupeeWords = rupeeWords
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    let finalWords = `INR ${rupeeWords} Rupees`;

    if (paise > 0) {
        let paiseWords = numberToWords.toWords(paise);
        paiseWords = paiseWords
            .split(" ")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

        finalWords += ` And ${paiseWords} Paise`;
    }

    finalWords += " Only";

    full_order_information.final_total_words = finalWords;

    // ---------- GST TOTAL (RupeES + PAISE) ----------
    const gstTotal = Number(full_order_information.gst.total);

    const gstRupees = Math.floor(gstTotal);
    const gstPaise = Math.round((gstTotal - gstRupees) * 100);

    let gstWords = numberToWords.toWords(gstRupees);
    gstWords = gstWords
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    let gstFinalWords = `INR ${gstWords} Rupees`;

    if (gstPaise > 0) {
        let gstPaiseWords = numberToWords.toWords(gstPaise);
        gstPaiseWords = gstPaiseWords
            .split(" ")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

        gstFinalWords += ` And ${gstPaiseWords} Paise`;
    }

    gstFinalWords += " Only";

    full_order_information.gst.total_words = gstFinalWords;
}

function roundTo2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
function buildTaxGroups(products_info) {
  const groups = {};

  for (const item of products_info) {
    // Skip items with zero taxable value (safety)
    if (!item.discounted_line_total || !item.gst_rate) continue;

    const key = `${item.hsnCode}_${item.gst_rate}`;

    if (!groups[key]) {
      groups[key] = {
        hsnCode: item.hsnCode,
        gst_rate: item.gst_rate,
        taxable_value: 0
      };
    }

    groups[key].taxable_value += item.taxable_value;
  }

  return Object.values(groups);
}
function applyGSTToGroups(taxGroups) {
  return taxGroups.map(group => {
    const total_gst = group.taxable_value * group.gst_rate / 100;
    const cgst = total_gst / 2;
    const sgst = total_gst / 2;
    const igst = total_gst

    return {
      hsnCode: group.hsnCode,
      gst_rate: group.gst_rate,
      taxable_value: group.taxable_value,
      cgst,
      sgst,
      igst,
      total_tax: cgst + sgst
    };
  });
}

