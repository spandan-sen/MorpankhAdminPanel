/****************************************************
 * DEPENDENCIES & INITIAL SETUP
 ****************************************************/
const express = require("express")
const router = express.Router()
const path = require("path")
require("dotenv").config()
const axios = require("axios")
const puppeteer = require("puppeteer")
const fs = require("fs")

const {
    draft_model,
    order_model,
    invoice_model,
    alert_model,
    dash_model,
    product_model
} = require("../../config/database")

let orderStatusVar = ""

/****************************************************
 * WHATSAPP and Drive CONFIG (INLINE – AS REQUESTED)
 ****************************************************/
let invoice_file_id = ""


/****************************************************
 * UTILITY FUNCTIONS
 ****************************************************/
function roundTo2(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100
}
async function uploadInvoiceToDrive(filePath, fileName) {
  try {
    // Read PDF file
    const fileBuffer = fs.readFileSync(filePath);

    // Convert to base64
    const fileBase64 = fileBuffer.toString("base64");

    // Send to Google Apps Script
    const response = await axios.post(process.env.GOOGLE_SCRIPT_URL, {
      fileName: fileName,
      fileBase64: fileBase64
    });

    if (!response.data.success) {
      throw new Error(response.data.error || "Drive upload failed");
    }

    // Return fileId for WhatsApp button
    invoice_file_id = response.data.fileId
    return response.data.fileId;

  } catch (error) {
    console.error("Drive Upload Error:", error.message);
    throw error;
  }
}
async function sendWhatsAppInvoice(customerPhone, customerName, totalAmount) {
    return axios.post(
        `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
        messaging_product: "whatsapp",
        to: customerPhone,
        type: "template",
        template: {
            name: "order_invoice",
            language: { code: "en" },
            components: [
            // BODY VARIABLES
            {
                type: "body",
                parameters: [
                { type: "text", text: customerName },  // {{1}}
                { type: "text", text: totalAmount }    // {{2}}
                ]
            },

            // BUTTON VARIABLE
            {
                type: "button",
                sub_type: "url",
                index: "0", // first button = 0
                parameters: [
                { type: "text", text: invoice_file_id }
                ]
            }
            ]
        }
        },
        {
        headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
        }
        }
    );
    }


/****************************************************
 * ROUTE: GENERATE INVOICE
 ****************************************************/
router.get(`/generate-invoice/:order_ID`, async (req, res) => {
    if(!req.session.admin){
         return res.redirect("/admin/login")
        
    }

    const mongoose = require("mongoose")
    const session = await mongoose.startSession()

    let orderData = null
    let orderStatusVar = ""

    try {

        session.startTransaction()

        const order_id = req.params.order_ID
        console.log("Invoice Generation Initiated for Order ID", order_id)

        const draftData = await draft_model.findOne({}, null, { session })
        orderData = draftData?.orderObject

        if (!orderData) {
            throw new Error("Missing draft order data for invoice generation")
        }

        /******** Line Item Mapping ********/
        const items = orderData.products_info.map(p => ({
            productId: p.barcode,
            name: p.name,
            hsnCode: String(p.hsnCode),
            barcode: Number(p.barcode),
            quantity: p.quantity,
            unitPrice: p.price,
            totalDiscount: roundTo2(p.discount_amount + p.order_level_discount),
            taxableValue: roundTo2(p.discounted_line_total),
            gstRate: p.gst_rate,
            gstAmount: roundTo2(p.gst_amount),
            lineTotal: roundTo2(p.discounted_taxed_line_total)
        }))

        /******** Order Status Logic ********/
        if (orderData.delivery_attributes.address) {
            orderStatusVar = "accepted"
        } else {
            orderStatusVar = "completed"
        }

        /******** Stock Update ********/
        for (let x of orderData.products_info) {
            await product_model.updateOne(
                { barcode: x.barcode },
                { $inc: { stock: -x.quantity } },
                { session }
            )
        }

        /******** Order Creation ********/
        await order_model.create([{
            orderId: orderData.order_id,
            invoiceNumber: orderData.invoice_number,
            customerMobile: orderData.customer_num,
            customerName: orderData.customer_name,
            orderType: orderData.order_type,
            paymentInfo: {
                paymentStatus: orderData.payment_info.status,
                paymentMode: orderData.payment_info.method,
                semiPaidAmount: orderData.payment_info.semi_paid_amount
            },
            items_info: items,
            summary: {
                subTotal: roundTo2(orderData.gross_sub_total),
                itemDiscountTotal: roundTo2(orderData.discount_info.item_level),
                orderDiscountTotal: roundTo2(orderData.discount_info.order_level),
                gstTotal: roundTo2(orderData.gst.total),
                taxableTotal: roundTo2(orderData.taxable_total),
                grandTotal: roundTo2(orderData.final_total)
            },
            delivery_info: {
                address: orderData.delivery_attributes.address,
                distance: orderData.delivery_attributes.type,
                receiverType: orderData.delivery_attributes.receiver,
                receiverName: orderData.delivery_attributes.receiver_name,
                receiverNumber: orderData.delivery_attributes.receiver_number
            },
            orderStatus: orderStatusVar
        }], { session })

        /******** Invoice Counter ********/
        await invoice_model.updateOne(
            {},
            { $set: { lastInvoiceNumber: orderData.nextInvoiceNumber - 1 } },
            { session }
        )

        /******** GST Updates ********/
        if (orderData.delivery_attributes.type == "intraState") {

            await dash_model.updateMany({}, {
                $inc: {
                    "brandRevenue.gstToday": orderData.gst.total,
                    "brandRevenue.gstMonth": orderData.gst.total,
                    "brandRevenue.cgstToday": orderData.gst.total / 2,
                    "brandRevenue.sgstToday": orderData.gst.total / 2
                }
            }, { session })

        } else if (orderData.delivery_attributes.type == "interState") {

            await dash_model.updateMany({}, {
                $inc: {
                    "brandRevenue.gstToday": orderData.gst.total,
                    "brandRevenue.gstMonth": orderData.gst.total,
                    "brandRevenue.igstToday": orderData.gst.total
                }
            }, { session })
        }

        /******** Order + Revenue Metrics ********/
        const commonIncs = {
            "brandOrders.totalOrders": 1,
            "brandOrders.ordersToday": 1,
            "brandOrders.ordersMonth": 1
        }

        if (orderData.order_type == "delivery") {
            commonIncs["brandOrders.ordersAccepted"] = 1
        } else {
            commonIncs["brandOrders.ordersInStoreToday"] = 1
        }

        if (orderData.payment_info.status == "paid") {

            commonIncs["brandRevenue.revenueTotal"] = orderData.final_total
            commonIncs["brandRevenue.revenueToday"] = orderData.final_total
            commonIncs["brandRevenue.revenueMonth"] = orderData.final_total

            if (orderData.order_type == "delivery") {
                commonIncs["brandRevenue.revenueDelivered"] = orderData.final_total
            } else {
                commonIncs["brandRevenue.revenueInStore"] = orderData.final_total
            }

        } else if (orderData.payment_info.status == "payLater") {

            commonIncs["brandRevenue.ordersPayLater"] = 1
            commonIncs["brandRevenue.revenueOutstanding"] = orderData.final_total

        } else if (orderData.payment_info.status == "semiPaid") {

            commonIncs["brandRevenue.ordersSemiPay"] = 1
            commonIncs["brandRevenue.revenueOutstanding"] =
                (orderData.final_total - orderData.payment_info.semi_paid_amount)
        }

        await dash_model.updateMany({}, { $inc: commonIncs }, { session })

        await session.commitTransaction()
        session.endSession()

        console.log("Transaction Committed Successfully")

    } catch (err) {

        if (session.inTransaction()) {
            await session.abortTransaction()
        }

        session.endSession()

        console.error("Transaction Failed:", err)
        return res.status(500).send("Order Processing Failed")
    }

    /************************************************
     * POST-COMMIT SECTION (NO TRANSACTION HERE)
     ************************************************/

    try {
        let launchOptions = {
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ]
            };

            if (process.env.NODE_ENV === "production") {
            const fs = require("fs");
            const chromeBasePath = path.join(process.cwd(), ".local-chromium", "chrome");

            const chromeFolder = fs
                .readdirSync(chromeBasePath)
                .find(folder => folder.startsWith("linux-"));

            launchOptions.executablePath = path.join(
                chromeBasePath,
                chromeFolder,
                "chrome-linux64",
                "chrome"
            );
            }

            const browser = await puppeteer.launch(launchOptions);



        const page = await browser.newPage()
        const baseURL = `${req.protocol}://${req.get("host")}`

        await page.goto(`${baseURL}/admin/bill?internal=true`, { waitUntil: "networkidle0" })
        await page.waitForSelector(".invoice", { timeout: 10000 })

        const filePath = path.join(
            __dirname,
            `../invoices/invoice-${req.params.order_ID}.pdf`
        )

        await page.pdf({
            path: filePath,
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true
        })

        await browser.close()

        await uploadInvoiceToDrive(
            filePath,
            `invoice-${req.params.order_ID}.pdf`
        )
        if(req.session.whatsappInvoiceConf == "true"){
            await sendWhatsAppInvoice(
                `91${orderData.customer_num}`,
                orderData.customer_name,
                Math.round(orderData.final_total)
        )
        }

        // NOW DELETE DRAFT (OPTION B)
        await draft_model.deleteMany({})

        res.setHeader("Content-Type", "application/pdf")
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=invoice-${req.params.order_ID}.pdf`
        )

        return res.sendFile(filePath)

    } catch (postErr) {

        console.error("Post-Commit Error (PDF/WhatsApp):", postErr)

        // DB already safe — do NOT abort anything
        return res.status(500).send("Invoice Generated But Delivery Failed")
    }
})



/****************************************************
 * ROUTE: BILL PAGE RENDER
 ****************************************************/
router.get("/", async (req, res) => {
    console.log("Draft count:", await draft_model.countDocuments());
    draft_model.find({})
        .then(data => {
            console.log(data[0])
            const orderData = data[0]?.orderObject
            if (!orderData) {
                return res.status(404).send("No draft order available")
            }
            res.render("admin/bill", {
                "display": "Order Confirmation Page",
                orderData,
                 userDP:req.session.adminDP


            })
        })
})

module.exports = router
