const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const {order_model,dash_model} = require("../../config/database")
router.post("/updateStatus", async (req,res)=>{

    const session = await mongoose.startSession()
    session.startTransaction()

    try{

        console.log(req.body)
        const update = req.body

        if(!update.orderID){
            throw new Error("Missing orderID")
        }

        if(!update.orderStatus || !update.paymentStatus){
            throw new Error("Missing status fields")
        }

        console.log("Payment Status Incoming - ",update.paymentStatus)
        const date = new Date(Date.now());
        const formatted = date.toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                        timeZone: 'Asia/Kolkata'
                                        });

        const orderResult = await order_model.updateOne(
            {orderId:update.orderID},
            {$set:{
                orderStatus:update.orderStatus,
                "paymentInfo.paymentStatus":update.paymentStatus,
                paymentUpdateDate:formatted
            }},
            { session }
        )

        if(orderResult.matchedCount === 0){
            throw new Error("Order not found")
        }

        // ----- Payment Revenue Logic -----
        if(update.pstsChange == true && update.paymentStatus == "paid" && update.prevPayment != "paid"){

            if(update.prevPayment == "semiPaid"){

                await dash_model.updateMany({},{
                    $inc:{
                        "brandRevenue.revenueTotal":update.orderTotal,
                        "brandRevenue.revenueToday":update.orderTotal,
                        "brandRevenue.revenueMonth":update.orderTotal,
                        "brandRevenue.revenueOutstanding":-(update.orderTotal - update.paymentRemain),
                        "brandRevenue.ordersSemiPay":-1
                    },
                    $set:{
                        "adminSeshActions.message":"",
                        "adminSeshActions.messageHead":"Order Payment Completion"
                    }
                },{ session })

            }else if(update.prevPayment == "payLater"){

                await dash_model.updateMany({},{
                    $inc:{
                        "brandRevenue.revenueTotal":update.orderTotal,
                        "brandRevenue.revenueToday":update.orderTotal,
                        "brandRevenue.revenueMonth":update.orderTotal,
                        "brandRevenue.revenueOutstanding":-update.orderTotal,
                        "brandRevenue.revenueDelivered":update.orderTotal,
                        "brandRevenue.ordersPayLater":-1
                    },
                    $set:{
                        "adminSeshActions.message":"",
                        "adminSeshActions.messageHead":"Order Payment Completion"
                    }
                },{ session })

            }
        }

        // ----- Order Status Logic -----
        if(update.orderStatus == "packaged" && update.ostsChange == true){

            await dash_model.updateMany({},{
                $inc:{
                    "brandOrders.ordersPackaged":1,
                    "brandOrders.ordersAccepted":-1
                },
                $set:{
                    "adminSeshActions.message":"",
                    "adminSeshActions.messageHead":"Order : Packaged"
                }
            },{ session })

        }else if(update.orderStatus == "dispatched" && update.ostsChange == true){

            await dash_model.updateMany({},{
                $inc:{
                    "brandOrders.ordersDispatched":1,
                    "brandOrders.ordersPackaged":-1
                },
                $set:{
                    "adminSeshActions.message":"",
                    "adminSeshActions.messageHead":"Order : Dispatched"
                }
            },{ session })

        }else if(update.orderStatus == "completed" && update.ostsChange == true){

            await dash_model.updateMany({},{
                $inc:{
                    "brandOrders.ordersDeliveredToday":1,
                    "brandOrders.ordersDispatched":-1
                },
                $set:{
                    "adminSeshActions.message":"",
                    "adminSeshActions.messageHead":"Order Delivered"
                }
            },{ session })

        }

        await session.commitTransaction()
        session.endSession()

        console.log("Order Update Transaction Success")

        return res.json({success: true, message: "Order completed successfully"})

    }catch(err){

        await session.abortTransaction()
        session.endSession()

        console.error("Order Update Transaction Failed:",err)

        return res.status(500).json({
            success:false,
            message:"Order update failed"
        })
    }
})

router.get("/orderPage/:orderID", async (req,res)=>{
    try{

        const id = req.params.orderID

        if(!id){
            return res.status(400).send("Invalid Order ID")
        }

        const orderData = await order_model.findOne({orderId:id}).lean()

        if(!orderData){
            return res.status(404).send("Order not found")
        }

        return res.render("admin/order_show",{
            display:`Order : ${orderData.invoiceNumber}`,
            orderData,
            userDP:req.session.adminDP
        })

    }catch(err){
        console.error("Order Page Render Error:",err)
        return res.status(500).send("Internal Server Error")
    }
})

router.get("/", async (req,res)=>{
    try{

        function getDateRange(type) {
            const now = new Date();
            let start, end;

            const startOfDay = d =>
                new Date(d.getFullYear(), d.getMonth(), d.getDate());

            if (type === "tdy") {
                start = startOfDay(now);
                end = new Date(start);
                end.setDate(end.getDate() + 1);
            }

            if (type === "yst") {
                end = startOfDay(now);
                start = new Date(end);
                start.setDate(start.getDate() - 1);
            }

            if (type === "wk") {
                const day = now.getDay() || 7;
                start = startOfDay(now);
                start.setDate(start.getDate() - (day - 1));
                end = new Date(start);
                end.setDate(end.getDate() + 7);
            }

            if (type === "mth") {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            }

            if (!start || !end) return null;

            return { $gte: start, $lt: end };
        }

        const search = req.query.search || ""
        let page = parseInt(req.query.page) || 1
        const limit = 50

        if(page < 1) page = 1

        const skip = (page - 1) * limit

        function buildQuery(data) {
            if(!data || data === "all"){
                return {}
            }

            const split = data.split("-")
            const dbQuery = {}

            const Qmap = {
                tl: "summary.grandTotal",
                nm: "customerName",
                osts: "orderStatus",
                psts: "paymentInfo.paymentStatus",
                pm: "paymentInfo.paymentMode",
                ot: "orderType",
                dt: "date"
            }

            for (let i = 0; i < split.length; i += 2) {
                const key = split[i]
                const value = split[i + 1]

                const dbField = Qmap[key]
                if (!dbField) continue

                if(key === "dt"){
                    const range = getDateRange(value)
                    if(range){
                        dbQuery[dbField] = range
                    }
                    continue
                }

                dbQuery[dbField] = value
            }

            return dbQuery
        }

        const dbQuery = buildQuery(search)

        const data = await order_model
            .find(dbQuery)
            .skip(skip)
            .limit(limit)
            .lean()

        return res.render("admin/orders",{
            display:"Order History",
            data,
             userDP:req.session.adminDP
        })

    }catch(err){
        console.error("Orders List Error:",err)
        return res.status(500).send("Internal Server Error")
    }
})

module.exports = router